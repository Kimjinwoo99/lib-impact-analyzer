/**
 * Claude Code CLI in print mode — the one agent transport this project uses.
 *
 * `claude -p --output-format stream-json --verbose` runs a single
 * non-interactive turn and writes one JSON object per line to stdout: a
 * `system`/init line, an `assistant` line per turn (its `message.content` may
 * hold `tool_use` blocks), a `user` line per tool result, and a final
 * `result` line with the same fields the old single-envelope `json` format
 * gave: `{ type: "result", is_error, result: "<text>", total_cost_usd, usage,
 * session_id }`. The prompt goes through stdin — it can be tens of KB, which
 * is the wrong size for argv.
 *
 * Switched from `--output-format json` (2026-08-11): the single-envelope
 * format threw away every intermediate turn, so when L6's judgment for a
 * chain unit stopped citing a file it had cited in an earlier run, there was
 * no way to tell "didn't look" from "looked, didn't cite" — the golden
 * Round 3 investigation (`collection-tuning-log.md` Round S/T) hit exactly
 * this wall. Streaming costs nothing extra (same API calls, same tokens) and
 * the toolTrace it yields is what makes that question answerable next time.
 *
 * Operational contract shared by every runner built on this:
 * - log callback receives system/stderr lines for the job log
 * - timeout and user abort are DIFFERENT outcomes: an abort stays cancelled
 *   (never converted to fallback), a timeout is an error the caller may fall
 *   back from
 * - tool access is whitelist-only, decided per runner: judgment (L6) gets the
 *   read tools, classification (L4) gets none at all
 */

import { spawn } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export async function runClaudePrint(prompt, options = {}) {
  const timeoutMs = Number(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onLog = typeof options.onLog === 'function' ? options.onLog : () => {};
  const command = options.command ?? 'claude';
  const args = [
    '-p',
    '--output-format', 'stream-json',
    // print mode rejects stream-json without this — it is not an actual
    // verbosity toggle here, just the flag that unlocks the format.
    '--verbose',
    // Do not connect the user's configured MCP servers: the runner needs
    // none of them, and waiting on their startup is pure latency.
    '--strict-mcp-config',
    '--allowedTools', options.allowedTools ?? '',
    // Everything with side effects stays unusable regardless of what the
    // local ~/.claude settings would normally allow.
    '--disallowedTools', options.disallowedTools ?? 'Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch',
    ...(options.model ? ['--model', options.model] : []),
    /*
     * Two levers on how much system context the CLI loads before it ever sees
     * our prompt. Both are opt-in, so L4/L6 keep their measured behavior
     * unchanged; the chat feature uses them because it pays this overhead on
     * every question rather than once per run.
     *
     * Measured (chat, sonnet, same 2.3KB prompt): the default context is
     * ~30,200 cached input tokens, of which our prompt is under 3%. Turning
     * off skills/slash-commands and replacing the built-in system prompt took
     * it to ~6,000 — a cold call went from $0.229 to $0.046.
     */
    ...(options.disableSlashCommands ? ['--disable-slash-commands'] : []),
    ...(options.systemPrompt ? ['--system-prompt', options.systemPrompt] : []),
  ];

  /*
   * 출력 토큰 한도. CLI 기본값은 모델 상한이 아니라 그보다 낮은 값이고
   * (sonnet 5: 기본 64,000 · 상한 128,000, CLI 모델 레지스트리
   * `max_output_tokens:{default,upper}`), thinking 토큰이 이 예산을 응답
   * 텍스트와 **함께** 소비한다.
   *
   * 왜 올려야 하는가: 2026-08-13 골든이 여기서 죽었다. 판정 JSON 자체는
   * 1.7만 토큰뿐인데 thinking이 49,224를 먹어 남은 14,776 토큰에서 배열
   * 중간에 잘렸다. 기준선도 이미 89%(57,111/64,000) 지점에서 돌고 있었다.
   * 절단은 부분 환불이 아니라 전손이다 — 토큰은 다 내고 쓸 수 있는 결과가
   * 0이며, CLI가 이어쓰기를 시도하면서 불어난 프롬프트를 캐시에 다시 써서
   * 오히려 더 비싸진다(실측 +$0.38).
   *
   * CLI가 값을 검증한다: 모델 상한 초과 시 상한으로 자동 절삭(경고 로그),
   * 숫자가 아니면 기본값. 그래서 과하게 잡아도 안전하다.
   *
   * opt-in으로 둔 이유는 이 파일의 다른 옵션들과 같다 — 넘기지 않는 호출부
   * (L4·판정 Q&A)는 측정된 동작을 그대로 유지한다.
   */
  const env = { ...process.env };
  if (options.maxOutputTokens) {
    env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = String(options.maxOutputTokens);
  }

  onLog({ stream: 'system', message: `${command} ${args.join(' ')}` });
  onLog({ stream: 'system', message: `prompt bytes: ${Buffer.byteLength(prompt, 'utf8')} · cwd: ${options.cwd ?? process.cwd()}` });
  if (options.maxOutputTokens) {
    onLog({ stream: 'system', message: `max output tokens: ${options.maxOutputTokens} (CLI 기본값 대신 명시)` });
  }

  const execution = await spawnClaude(command, args, prompt, { timeoutMs, signal: options.signal, onLog, cwd: options.cwd, env });
  const { envelope, toolTrace, rateLimit } = parseStreamJson(execution.stdout);
  if (envelope.is_error) {
    throw new Error(`Claude CLI returned an error result: ${String(envelope.result ?? '').slice(0, 300)}`);
  }
  // Where the time went, measured — generation volume is the usual answer.
  if (envelope.usage) {
    onLog({
      stream: 'system',
      message: `tokens: in ${envelope.usage.input_tokens ?? '?'} · out ${envelope.usage.output_tokens ?? '?'} · $${envelope.total_cost_usd ?? '?'}`,
    });
  }
  if (toolTrace.length) {
    onLog({ stream: 'system', message: `tool calls: ${toolTrace.map((call) => call.name).join(', ')}` });
  }

  /*
   * 출력 예산 진단을 로그에 남긴다. 이게 없으면 출력 절단이 세 계층 위에서
   * `Unexpected non-whitespace character after JSON at position 595` 같은
   * 무관한 파싱 오류로만 표면화되고, 원인을 알려면 `~/.claude/projects`의 CLI
   * 세션 jsonl까지 파고들어야 한다(2026-08-13에 실제로 그랬다).
   *
   * thinking을 함께 적는 이유: 총출력의 70~74%가 thinking이라서(실측)
   * "출력이 왜 이렇게 컸나"의 답이 대부분 거기에 있고, thinking은 응답 텍스트와
   * **같은 예산**을 쓴다.
   */
  const budget = readOutputBudget(envelope, options.maxOutputTokens ?? null);
  const thinkingNote = budget.thinkingTokens == null
    ? ''
    : ` · thinking ${budget.thinkingTokens}${budget.outputTokens ? ` (${Math.round((budget.thinkingTokens / budget.outputTokens) * 100)}%)` : ''}`;
  const capNote = budget.capRatio == null
    ? ''
    : ` · 한도 ${budget.maxOutputTokens}의 ${Math.round(budget.capRatio * 100)}%`;
  onLog({
    stream: 'system',
    message: `output budget: ${budget.outputTokens} tokens${thinkingNote}`
      + ` · stop=${budget.stopReason ?? '?'} · turns=${budget.numTurns ?? '?'}${capNote}`,
  });
  if (budget.hitCap) {
    onLog({
      stream: 'system',
      message: '⚠ 출력이 한도에 도달했습니다 — 결과가 중간에서 잘렸을 수 있습니다.'
        + ' maxOutputTokens를 올리거나 --effort를 낮춰 thinking을 줄이십시오.',
    });
  } else if (budget.nearCap) {
    onLog({
      stream: 'system',
      message: `⚠ 출력이 한도의 ${Math.round(budget.capRatio * 100)}%까지 찼습니다 — 다음 실행에서 잘릴 수 있습니다.`,
    });
  }

  /*
   * 주간 사용량 소진율. 세션 jsonl에는 남지 않으므로 여기서 로그에 박아둔다 —
   * 실비용 실행 전에 "지금 한도가 얼마나 남았나"를 사후에도 확인할 수 있어야 한다.
   */
  if (rateLimit) {
    const pct = rateLimit.utilization == null ? '?' : `${Math.round(rateLimit.utilization * 100)}%`;
    const resets = rateLimit.resetsAt ? new Date(rateLimit.resetsAt * 1000).toISOString() : '?';
    onLog({
      stream: 'system',
      message: `usage limit: ${rateLimit.rateLimitType ?? '?'} ${pct} 소진`
        + ` · 상태 ${rateLimit.status ?? '?'} · 리셋 ${resets}`,
    });
  }

  return {
    text: String(envelope.result ?? ''),
    durationMs: execution.durationMs,
    costUsd: envelope.total_cost_usd ?? null,
    usage: envelope.usage ?? null,
    sessionId: envelope.session_id ?? null,
    // The model that actually served the turn, read back from the envelope's
    // modelUsage — this is evidence, unlike the requested --model value, and
    // it also fills in the answer when no --model was passed (CLI default).
    model: pickPrimaryModel(envelope.modelUsage),
    // Every tool_use block the agent issued, in order — {name, input}. Empty
    // for L4 (no tools granted). This is the record that answers "did it
    // actually look" instead of inferring it from what the final text cites.
    toolTrace,
    // 출력 예산 진단. 호출부가 파싱 실패를 "잘렸다"와 "형식이 틀렸다"로 구분할
    // 수 있게 하는 근거다.
    budget,
    truncated: budget.hitCap,
    // 주간 사용량 정보(있을 때만). 실비용 실행의 기록으로 남긴다.
    rateLimit,
  };
}

/**
 * modelUsage lists every model the turn touched, including the CLI's own
 * small helper calls (haiku). The main model is the one that spent the money.
 */
function pickPrimaryModel(modelUsage) {
  if (!modelUsage || typeof modelUsage !== 'object') return null;
  let best = null;
  for (const [model, usage] of Object.entries(modelUsage)) {
    const cost = Number(usage?.costUSD ?? 0);
    if (!best || cost > best.cost) best = { model, cost };
  }
  return best?.model ?? null;
}

/**
 * The stdout may carry stray lines around the envelope; the envelope is the
 * last JSON object on the stream.
 */
export function parseEnvelope(stdout) {
  const text = String(stdout ?? '').trim();
  if (!text) throw new Error('Claude CLI produced no output');
  try {
    return JSON.parse(text);
  } catch {
    const start = text.lastIndexOf('\n{');
    if (start !== -1) return JSON.parse(text.slice(start + 1));
    throw new Error('Claude CLI output was not the expected JSON envelope');
  }
}

/**
 * `stream-json` output is one JSON object per line: `system` (init),
 * `assistant`/`user` per turn, and a final `result` line shaped like the old
 * single-envelope `json` format. This walks every line once, collecting the
 * `tool_use` blocks out of the `assistant` lines (that is the toolTrace) and
 * handing the `result` line to `parseEnvelope` (same stray-line tolerance,
 * just applied to one line instead of the whole stream).
 *
 * A line that isn't valid JSON is skipped, not fatal — stray stderr-ish
 * output landing on stdout must not sink a run that otherwise completed.
 */
export function parseStreamJson(stdout) {
  const lines = String(stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const toolTrace = [];
  /*
   * 사용량 한도 경고. CLI는 주간 한도 소진율을 `rate_limit_event`로 스트림에
   * 실어 보낸다(`{rateLimitType:"seven_day", utilization, status, resetsAt}`).
   * 이건 세션 jsonl에는 남지 않아서, 여기서 집어 올리지 않으면 실행 뒤에
   * "그때 한도가 얼마였나"를 확인할 방법이 없다.
   */
  let rateLimit = null;
  let resultLine = null;
  for (const line of lines) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === 'assistant') {
      /*
       * 스트림의 assistant 이벤트에서 읽을 수 있는 건 content 블록뿐이다.
       * `stop_reason`은 항상 null이고 `usage.output_tokens`는 자리값(1~2)이라
       * 턴별 토큰 집계에 쓸 수 없다(실측). 진짜 수치는 `result` 라인에만 있다.
       */
      for (const block of event.message?.content ?? []) {
        if (block?.type === 'tool_use') toolTrace.push({ name: block.name, input: block.input ?? null });
      }
    } else if (event.type === 'rate_limit_event') {
      rateLimit = event.rate_limit_info ?? null;
    } else if (event.type === 'result') {
      // Multiple result lines should not happen in a single -p turn; the last
      // one wins so a truncated retry never shadows the real completion.
      resultLine = line;
    }
  }

  if (!resultLine) throw new Error('Claude CLI stream-json output did not contain a result line');
  return { envelope: parseEnvelope(resultLine), toolTrace, rateLimit };
}

/**
 * 출력이 한도에 부딪혔는지를 `result` 봉투에서 읽어낸다.
 *
 * 왜 봉투인가: 스트림의 assistant 이벤트는 `stop_reason`이 null이고 토큰 수도
 * 자리값이다. 실제 값(`stop_reason`·`num_turns`·`usage.output_tokens`·
 * `output_tokens_details.thinking_tokens`)은 `result` 라인에만 있다.
 *
 * 왜 `stop_reason`만으로 부족한가: CLI는 한도에 걸리면 이어쓰기를 시도하고,
 * 그게 성공하면 최종 `stop_reason`은 `end_turn`이 된다. 2026-08-13 골든이
 * 정확히 그랬다 — 첫 요청이 64,000에서 잘렸는데 봉투는 `end_turn`이었고,
 * 그래서 절단이 세 계층 위에서 JSON 파싱 오류로만 드러났다. 합계 출력이 한도
 * 이상이면 최소 한 요청은 한도를 찍은 것이므로, 그 비교가 실질적인 신호다.
 */
/*
 * 경고선. 기준선이 89%(57,111/64,000)에서 돌다가 그 다음 실행에 잘렸으므로
 * 경고는 89% **아래**에 있어야 한다 — 90%로 두면 정작 위험했던 그 상태를
 * 조용히 통과시킨다.
 */
const NEAR_CAP_RATIO = 0.85;

export function readOutputBudget(envelope, maxOutputTokens = null) {
  const usage = envelope?.usage ?? null;
  const outputTokens = Number(usage?.output_tokens ?? 0) || 0;
  const thinkingTokens = usage?.output_tokens_details?.thinking_tokens ?? null;
  const cap = Number(maxOutputTokens) > 0 ? Number(maxOutputTokens) : null;
  const stopReason = envelope?.stop_reason ?? null;
  const numTurns = envelope?.num_turns ?? null;

  return {
    outputTokens,
    thinkingTokens,
    stopReason,
    numTurns,
    maxOutputTokens: cap,
    // 한도를 아는 경우에만 비율을 계산한다 — 모르는 채로 CLI 기본값을 가정해
    // 경고를 내면 틀린 근거로 사람을 움직이게 된다.
    capRatio: cap ? outputTokens / cap : null,
    hitCap: stopReason === 'max_tokens' || (cap ? outputTokens >= cap : false),
    nearCap: cap ? outputTokens >= cap * NEAR_CAP_RATIO : false,
  };
}

/**
 * Strict-JSON read of an agent's final message. Accepts a bare JSON object,
 * a fenced ```json block, or JSON embedded in surrounding prose — anything
 * less parseable is an error, never silently accepted.
 */
export function parseJsonFromAgentMessage(message) {
  const trimmed = String(message ?? '').trim();
  if (!trimmed) throw new Error('agent produced an empty final message');

  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) candidates.push(fenced[1]);
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  let lastError = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  /*
   * 실패 메시지에 길이와 양쪽 끝을 함께 담는다. 이전에는 `SyntaxError`가 그대로
   * 올라와서(`Unexpected non-whitespace character after JSON at position 595`)
   * 메시지만 보면 형식이 틀린 건지 도중에 잘린 건지 구분할 수 없었다. 끝부분이
   * 열린 상태로 끊겨 있으면 절단, 닫혀 있으면 형식 문제다.
   */
  const error = new Error(
    `agent final message did not contain parseable JSON (${trimmed.length}자 · ${lastError?.message ?? 'unknown'})`
      + ` · 앞: ${JSON.stringify(trimmed.slice(0, 80))} · 끝: ${JSON.stringify(trimmed.slice(-80))}`,
  );
  error.rawText = trimmed;
  throw error;
}

function spawnClaude(command, args, stdin, options) {
  return new Promise((resolvePromise, reject) => {
    const startedAt = Date.now();
    const onLog = options.onLog ?? (() => {});
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      // 넘기지 않으면 spawn이 process.env를 그대로 물려주므로, 여기서 받은
      // env가 없을 때의 동작은 이전과 같다.
      ...(options.env ? { env: options.env } : {}),
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let cancelled = false;
    let timedOut = false;

    const settle = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (options.signal) options.signal.removeEventListener('abort', abortHandler);
      callback();
    };

    const abortHandler = () => {
      cancelled = true;
      onLog({ stream: 'system', message: 'cancel requested; terminating claude process' });
      child.kill('SIGTERM');
    };

    const timer = setTimeout(() => {
      timedOut = true;
      onLog({ stream: 'system', message: `timeout after ${options.timeoutMs}ms; terminating claude process` });
      child.kill('SIGTERM');
    }, options.timeoutMs);

    if (options.signal) {
      if (options.signal.aborted) abortHandler();
      else options.signal.addEventListener('abort', abortHandler, { once: true });
    }

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      onLog({ stream: 'stderr', message: text });
    });
    child.on('spawn', () => onLog({ stream: 'system', message: `claude process started pid=${child.pid}` }));
    child.on('error', (error) => settle(() => reject(error)));
    child.on('close', (code) => {
      settle(() => {
        const durationMs = Date.now() - startedAt;
        if (cancelled) {
          reject(new Error('Claude CLI cancelled'));
          return;
        }
        if (timedOut) {
          reject(new Error(`Claude CLI timed out after ${options.timeoutMs}ms`));
          return;
        }
        if (code !== 0) {
          reject(new Error(`Claude CLI failed: ${stderr.trim() || stdout.trim() || `exit code ${code}`}`));
          return;
        }
        onLog({ stream: 'system', message: `claude process completed in ${durationMs}ms` });
        resolvePromise({ stdout, stderr, durationMs });
      });
    });

    /*
     * A child that is already gone makes this write raise EPIPE, and an
     * unhandled 'error' on the stdin socket takes the whole process down —
     * measured: the dev-server died outright when a cancel landed between
     * spawn and this write. The child's own 'close'/'error' handlers above
     * carry the real outcome (cancelled / timed out / non-zero exit), so a
     * broken pipe here only needs to stop being fatal; `settle` keeps
     * whichever rejection got there first.
     */
    child.stdin.on('error', (error) => {
      if (error.code === 'EPIPE') {
        onLog({ stream: 'system', message: 'claude stdin closed before the prompt was fully written' });
        return;
      }
      settle(() => reject(error));
    });
    child.stdin.end(stdin);
  });
}
