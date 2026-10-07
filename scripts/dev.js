import { spawn } from 'node:child_process';
import { existsSync, watch } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const apiPort = Number(process.env.API_PORT ?? 5174);
const webPort = Number(process.env.PORT ?? 5173);

const apiEnv = { PORT: String(apiPort) };

// Both children run through process.execPath with shell:false. Going through a
// shell breaks on Windows, where execPath contains a space ("C:\Program Files").
const viteBin = resolve('node_modules/vite/bin/vite.js');
if (!existsSync(viteBin)) {
  process.stderr.write('vite is not installed. Run `npm install` first.\n');
  process.exit(1);
}

const children = new Set();
let shuttingDown = false;

function run(label, args, env, { onExit } = {}) {
  const child = spawn(process.execPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  });

  const prefix = (stream) => (chunk) => {
    for (const line of String(chunk).split(/\r?\n/)) {
      if (line.trim()) stream.write(`[${label}] ${line}\n`);
    }
  };

  child.stdout.on('data', prefix(process.stdout));
  child.stderr.on('data', prefix(process.stderr));
  child.on('exit', (code) => {
    children.delete(child);
    if (shuttingDown) return;
    if (onExit?.(code)) return;
    process.stderr.write(`[${label}] exited with code ${code}\n`);
    shutdown(code ?? 1);
  });

  children.add(child);
  return child;
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

/* ---- API server, with a restart path ----------------------------------- */

let api = null;
let restarting = false;

function startApi() {
  api = run('api', ['server/dev-server.js'], apiEnv, {
    // A restart kills the child on purpose — that exit must not take the
    // whole dev session down with it.
    onExit: () => restarting,
  });
}

function restartApi(reason) {
  if (restarting || shuttingDown) return;
  restarting = true;
  process.stdout.write(`[dev] API 서버 재시작 — ${reason}\n`);
  const previous = api;
  const boot = () => {
    restarting = false;
    startApi();
  };
  if (previous && previous.exitCode === null) {
    previous.once('exit', boot);
    previous.kill();
  } else {
    boot();
  }
}

startApi();
run('web', [viteBin], { PORT: String(webPort), API_PORT: String(apiPort) });

/* ---- Stale-server guard ------------------------------------------------ */

/*
 * `server/dev-server.js`와 `src/`는 Node 프로세스가 시작할 때 한 번 읽는다 —
 * Vite와 달리 핫리로드가 없다. 그래서 고친 뒤 재시작을 잊으면 **낡은 코드가
 * 조용히 계속 돈다.** 이 함정으로 2026-08-12에 실비용 $3.88을 날렸고
 * (프롬프트·러너를 고쳐놓고 재시작 없이 골든 실행), 8-13에는 판정 Q&A에
 * 새로 실은 데이터가 반영되지 않아 Agent가 화면의 사실을 부정하는 답을 냈다.
 *
 * 자동 재시작은 하지 않는다: L4/L6 실행이 도는 중에 서버를 내리면 진행 중인
 * 실비용 작업이 통째로 날아간다 — 낡은 코드보다 비싼 실패다. 그래서 변경을
 * 감지해 **눈에 띄게 경고하고, 한 키로 재시작**할 수 있게만 한다. 언제
 * 재시작해도 안전한지는 사람이 안다.
 */
const WATCHED = ['server', 'src'];
const pending = new Set();
let notifyTimer = null;

function noteChange(path) {
  pending.add(path);
  clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => {
    const files = [...pending];
    pending.clear();
    process.stdout.write(
      `\n[dev] ⚠ API 서버가 읽는 파일이 변경되었습니다 — ${files.slice(0, 3).join(', ')}`
        + `${files.length > 3 ? ` 외 ${files.length - 3}건` : ''}\n`
        + '[dev]   이 서버는 핫리로드되지 않습니다. 지금 도는 서버는 변경 전 코드입니다.\n'
        + '[dev]   재시작: r + Enter   (실행 중인 분석이 없을 때 하십시오)\n\n',
    );
  }, 250);
}

for (const dir of WATCHED) {
  if (!existsSync(dir)) continue;
  try {
    watch(dir, { recursive: true }, (_event, filename) => {
      if (!filename || !/\.(js|mjs|json)$/.test(filename)) return;
      noteChange(`${dir}/${filename}`);
    });
  } catch {
    // recursive watch가 없는 플랫폼이면 경고 없이 넘어간다 — 감시가 없는 것이
    // dev 자체를 막을 이유는 아니다.
  }
}

if (process.stdin.isTTY) {
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    const key = String(chunk).trim().toLowerCase();
    if (key === 'r') restartApi('r 입력');
    if (key === 'q') shutdown(0);
  });
  process.stdin.resume();
}

process.stdout.write(`[dev] web http://localhost:${webPort}  |  api http://localhost:${apiPort}\n`);
process.stdout.write('[dev] r + Enter = API 서버 재시작 · q + Enter = 종료\n');
