/**
 * Bounded-concurrency fan-out for agent calls.
 *
 * L4's run time is generation time, and generation is per-item: one call over
 * N items costs roughly N × (per-item generation). Splitting the items across
 * concurrent calls turns that sum into a max — the wall clock of the slowest
 * batch — because the batches generate at the same time.
 *
 * The pool is bounded rather than unbounded: every task here spawns a `claude`
 * child process, so a 64-item run at batch 5 would otherwise start 13 of them
 * at once. Bounded means a large run costs a few waves instead of one, which
 * is still the whole point of the exercise.
 *
 * `runSettledWithConcurrency` never rejects. Callers need every outcome to
 * decide what to retry, and a rejecting pool would strand its still-running
 * siblings — their processes would keep burning quota with nobody awaiting
 * them.
 */

export function splitIntoBatches(items, size) {
  const list = Array.isArray(items) ? items : [];
  const width = Number(size);
  // No usable size, or one batch would hold everything: keep the single call.
  // This matters — a one-batch run must stay byte-identical to the unbatched
  // prompt, so small runs are not quietly changed by this feature existing.
  if (!Number.isFinite(width) || width <= 0 || width >= list.length) return [list];

  const batches = [];
  for (let start = 0; start < list.length; start += width) {
    batches.push(list.slice(start, start + width));
  }
  return batches;
}

/**
 * @param tasks  array of `(index) => Promise<value>`
 * @param limit  max tasks in flight
 * @returns      per-task `{ status: 'fulfilled', value }` / `{ status: 'rejected', reason }`,
 *               in task order
 */
export async function runSettledWithConcurrency(tasks, limit) {
  const list = Array.isArray(tasks) ? tasks : [];
  const results = new Array(list.length);
  const width = Math.max(1, Math.min(Math.floor(Number(limit)) || 1, list.length || 1));

  let cursor = 0;
  const worker = async () => {
    // `cursor++` is safe as a work queue: nothing else runs between the read
    // and the increment, since JS only switches tasks at an await.
    for (let index = cursor++; index < list.length; index = cursor++) {
      try {
        results[index] = { status: 'fulfilled', value: await list[index](index) };
      } catch (error) {
        results[index] = { status: 'rejected', reason: error };
      }
    }
  };

  await Promise.all(Array.from({ length: width }, worker));
  return results;
}

/**
 * Runs every task, gives each failure exactly one more attempt, and returns
 * the values in task order.
 *
 * One retry, not many: the failures worth retrying here are transient (a
 * dropped call, a short response) and a retry storm across a bounded pool
 * would just spend quota slowly. If a task is still failing after its second
 * attempt, its OWN error is thrown — never a sibling's — because the caller
 * reads that error to tell a cancellation apart from a real failure.
 *
 * `beforeRetry` may throw to refuse the retry entirely; that is how an aborted
 * run stays aborted instead of spawning a second wave nobody wants.
 */
export async function runAllWithSingleRetry(tasks, { limit, beforeRetry } = {}) {
  const settled = await runSettledWithConcurrency(tasks, limit);

  const failed = settled.map((outcome, index) => (outcome.status === 'rejected' ? index : -1)).filter((index) => index >= 0);
  if (failed.length) {
    beforeRetry?.(failed.map((index) => settled[index].reason));
    const retried = await runSettledWithConcurrency(failed.map((index) => () => tasks[index](index)), limit);
    retried.forEach((outcome, position) => {
      if (outcome.status === 'fulfilled') {
        settled[failed[position]] = { status: 'fulfilled', value: outcome.value, retried: true };
      }
    });
  }

  const stillFailing = settled.find((outcome) => outcome.status === 'rejected');
  if (stillFailing) throw stillFailing.reason;

  return settled.map((outcome) => ({ value: outcome.value, retried: Boolean(outcome.retried) }));
}
