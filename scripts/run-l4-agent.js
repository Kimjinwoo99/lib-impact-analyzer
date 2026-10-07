import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildL4Input, buildL4Prompt } from '../src/agent/l4-prompt.js';
import { runL4Classification } from '../src/agent/l4-agent-runner.js';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const stage3Result = readStage3Input(args.input);
  const options = {
    cwd: args.cwd ? resolve(args.cwd) : resolve('.'),
    schemaPath: args.schema ? resolve(args.schema) : undefined,
    promptPath: args.prompt ? resolve(args.prompt) : undefined,
    outputLastMessagePath: args.outputLastMessage ? resolve(args.outputLastMessage) : undefined,
    maxItems: args.maxItems,
    // Was parsed and validated but never passed on, so --selection-mode first
    // silently ran a priority selection.
    selectionMode: args.selectionMode,
    all: args.all,
    model: args.model,
    timeoutMs: args.timeoutMs,
    batchSize: args.batchSize,
    maxConcurrency: args.maxConcurrency,
    keepTemp: args.keepTemp,
  };

  if (args.dryRun) {
    const prompt = buildL4Prompt(stage3Result, options);
    writeOutput(args.promptOutput, prompt, false);
    return;
  }

  if (args.previewInput) {
    const input = buildL4Input(stage3Result, options);
    writeOutput(args.output, JSON.stringify(input, null, 2), false);
    return;
  }

  const { result, meta } = await runL4Classification(stage3Result, options);
  const output = args.includeMeta ? { result, meta } : result;
  writeOutput(args.output, JSON.stringify(output, null, 2), true);
}

function readStage3Input(inputPath) {
  if (!inputPath || inputPath === '-') {
    const text = readFileSync(0, 'utf8');
    return JSON.parse(stripBom(text));
  }
  return JSON.parse(stripBom(readFileSync(resolve(inputPath), 'utf8')));
}

function stripBom(text) {
  return String(text).charCodeAt(0) === 0xfeff ? String(text).slice(1) : String(text);
}
function writeOutput(outputPath, content, json) {
  if (!outputPath || outputPath === '-') {
    process.stdout.write(content);
    process.stdout.write('\n');
    return;
  }
  writeFileSync(resolve(outputPath), `${content}\n`, 'utf8');
  const label = json ? 'L4 result' : 'L4 prompt/input preview';
  console.error(`${label} written to ${resolve(outputPath)}`);
}

function parseArgs(argv) {
  const args = {
    input: null,
    output: null,
    promptOutput: null,
    maxItems: 80,
    selectionMode: 'priority',
    all: false,
    dryRun: false,
    previewInput: false,
    includeMeta: false,
    keepTemp: false,
    timeoutMs: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--input') args.input = argv[++index];
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--prompt-output') args.promptOutput = argv[++index];
    else if (arg === '--cwd') args.cwd = argv[++index];
    else if (arg === '--schema') args.schema = argv[++index];
    else if (arg === '--prompt') args.prompt = argv[++index];
    else if (arg === '--model') args.model = argv[++index];
    else if (arg === '--timeout-ms') args.timeoutMs = Number(argv[++index]);
    else if (arg === '--max-items') args.maxItems = Number(argv[++index]);
    else if (arg === '--batch-size') args.batchSize = Number(argv[++index]);
    else if (arg === '--max-concurrency') args.maxConcurrency = Number(argv[++index]);
    else if (arg === '--selection-mode') args.selectionMode = argv[++index];
    else if (arg === '--all') args.all = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--preview-input') args.previewInput = true;
    else if (arg === '--include-meta') args.includeMeta = true;
    else if (arg === '--keep-temp') args.keepTemp = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.timeoutMs !== undefined && (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0)) {
    throw new Error('--timeout-ms must be a positive number');
  }
  // 0 is meaningful here: it turns the fan-out off and runs one call.
  if (args.batchSize !== undefined && (!Number.isFinite(args.batchSize) || args.batchSize < 0)) {
    throw new Error('--batch-size must be 0 (single call) or a positive number');
  }
  if (args.maxConcurrency !== undefined && (!Number.isFinite(args.maxConcurrency) || args.maxConcurrency <= 0)) {
    throw new Error('--max-concurrency must be a positive number');
  }
  if (!args.all && (!Number.isFinite(args.maxItems) || args.maxItems <= 0)) {
    throw new Error('--max-items must be a positive number');
  }
  if (!['priority', 'first'].includes(args.selectionMode)) {
    throw new Error('--selection-mode must be priority or first');
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/run-l4-agent.js --input <stage3.json> --output <l4.json> [options]

Options:
  --input <file|->              Stage 3 parse result JSON. Reads stdin when omitted or '-'.
  --output <file|->             L4 JSON output. Writes stdout when omitted or '-'.
  --max-items <n>               Priority-selection budget after mandatory items. Default: 80.
  --selection-mode <mode>       priority or first. Default: priority.
  --all                         Send every Stage 3 item to the Agent.
  --model <model>               Optional Claude model override.
  --timeout-ms <n>              Claude CLI timeout, per batch. Default: 300000.
  --batch-size <n>              Items per parallel Claude call. Default: 5. 0 runs one call.
  --max-concurrency <n>         Batches in flight at once. Default: 4.
  --dry-run                     Print the exact prompt instead of calling the Agent.
  --prompt-output <file|->      Output target for --dry-run.
  --preview-input               Print the compact JSON payload sent inside the prompt.
  --include-meta                Include runner metadata in output.
  --keep-temp                   Keep temp last-message file.
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
