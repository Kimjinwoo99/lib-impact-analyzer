import { runL4WithClaudeCli } from './l4-claude-runner.js';
import { buildL4FallbackClassification } from './l4-fallback-result.js';

export async function runL4Classification(stage3Result, options = {}) {
  const provider = options.provider ?? 'claude-cli';
  if (provider === 'fallback' || provider === 'mock') {
    return buildL4FallbackClassification(stage3Result, {
      ...options,
      reason: options.reason ?? 'Manual Skip Agent requested from pilot UI.',
    });
  }

  if (provider === 'claude-cli') {
    try {
      return await runL4WithClaudeCli(stage3Result, options);
    } catch (error) {
      // A user abort must stay cancelled; only real failures may fall back.
      if (options.signal?.aborted || isCancellationError(error)) throw error;
      if (options.fallbackOnError === false) throw error;
      const reason = error instanceof Error ? error.message : String(error);
      options.onLog?.({ stream: 'system', message: `falling back to mock L4 result: ${reason}` });
      return buildL4FallbackClassification(stage3Result, {
        ...options,
        reason: `Claude CLI failed: ${reason}`,
      });
    }
  }

  throw new Error(`Unsupported L4 agent provider: ${provider}`);
}

function isCancellationError(error) {
  return /cancelled|canceled|abort/i.test(error instanceof Error ? error.message : String(error));
}
