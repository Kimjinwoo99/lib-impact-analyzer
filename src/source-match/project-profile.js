/**
 * 결정론적 프로젝트 프로파일 — "이 프로젝트에 어떤 파이프라인이 존재하는가"의
 * 사실 몇 개. 판정이 아니라 사실이며, 소비처가 결론을 만든다:
 *
 *   - 사용 사전 스캔: 타입 파이프라인이 없는 프로젝트에서 타입 전용 scope
 *     (`types` 등)의 미분석 항목을 UNUSED로 강등 (도달 경로가 없는 변경)
 *   - L6 입력: "이 프로젝트는 타입 검사를 돌리지 않는다"를 증거로 전달 —
 *     타입 전용 항목이 "확인 불가"가 아니라 "해당 없음(근거)"이 되게
 *
 * vite 5→8 골든 실행 재채점에서 나온 결함의 수정: JS 프로젝트(sample-app)에
 * 타입 전용 SMOKE_TEST 6건이 남았는데, 전부 "타입체크로 확인하라"는 지시였고
 * 그 프로젝트에는 확인할 타입체크가 없었다.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { discoverSourceFiles } from './source-matcher.js';

/**
 * @returns 프로파일 객체, 또는 프로젝트를 읽을 수 없으면 null.
 * null은 "모름"이지 "JS 프로젝트"가 아니다 — 소비처는 null이면 강등하지
 * 않는다 (chain 유닛의 "unknown must not silently drop" 관례와 동일).
 */
export function detectProjectProfile(projectPath) {
  const trimmed = String(projectPath ?? '').trim();
  if (!trimmed) return null;
  const root = resolve(trimmed);
  if (!existsSync(root)) return null;

  try {
    const rootEntries = readdirSync(root);
    // tsconfig.json 외에 tsconfig.app.json 같은 분할 구성도 파이프라인 신호다.
    const hasTsconfig = rootEntries.some((name) => /^tsconfig(\..+)?\.json$/.test(name));

    let typeCheckScript = null;
    try {
      const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
      for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
        if (/\bvue-tsc\b|(^|[\s&|;])tsc(\s|$)/.test(String(command))) {
          typeCheckScript = name;
          break;
        }
      }
    } catch {
      // package.json이 없거나 파손 — 스크립트 신호만 포기하고 계속.
    }

    /*
     * .d.ts는 제외한다 — 선언 파일만 있는 프로젝트(자동 생성 d.ts, env.d.ts)는
     * TS를 "쓰는" 게 아니라 "받는" 것이고, 타입 검사가 돌지 않는다.
     * vite.config.ts 하나뿐인 프로젝트는 TS 소스 1개로 잡혀 파이프라인
     * 있음으로 판정된다 — 설정 파일이 TS로 컴파일되는 것은 사실이므로 보수적
     * 방향의 오차다 (강등을 덜 하는 쪽).
     */
    const tsSourceFileCount = discoverSourceFiles(root).filter(
      (path) => /\.tsx?$/.test(path) && !/\.d\.ts$/.test(path),
    ).length;

    return {
      hasTsconfig,
      typeCheckScript,
      tsSourceFileCount,
      hasTypePipeline: hasTsconfig || Boolean(typeCheckScript) || tsSourceFileCount > 0,
    };
  } catch {
    return null;
  }
}
