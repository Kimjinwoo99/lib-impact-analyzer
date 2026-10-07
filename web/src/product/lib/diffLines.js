/**
 * 줄 단위 LCS diff — 화면(FixDiffPanel)과 결과지(resultReport)가 함께 쓴다.
 *
 * 두 곳에 같은 계산을 따로 두면 결과지의 diff가 화면의 diff와 조용히 갈라진다.
 * 블록은 수십 줄 규모라 O(n·m)으로 충분하다.
 */
export function diffLines(before, after) {
  const a = String(before ?? '').split('\n');
  const b = String(after ?? '').split('\n');
  const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const lines = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { lines.push({ type: 'ctx', text: a[i] }); i += 1; j += 1; }
    else if (table[i + 1][j] >= table[i][j + 1]) { lines.push({ type: 'del', text: a[i] }); i += 1; }
    else { lines.push({ type: 'add', text: b[j] }); j += 1; }
  }
  while (i < a.length) { lines.push({ type: 'del', text: a[i] }); i += 1; }
  while (j < b.length) { lines.push({ type: 'add', text: b[j] }); j += 1; }
  return lines;
}

/**
 * 줄 번호를 붙인 블록. 번호는 **수정 전 파일 기준**이다 — del·ctx가 원본 줄을
 * 소비하고, add는 원본에 없던 줄이라 비운다. block.line이 없으면(대조 실패로
 * 위치를 모르는 블록) 번호를 매기지 않는다.
 */
export function diffBlock(block) {
  const lines = diffLines(block?.before, block?.after);
  let cursor = Number.isInteger(block?.line) ? block.line : null;
  for (const line of lines) {
    if (cursor !== null && line.type !== 'add') {
      line.no = cursor;
      cursor += 1;
    } else {
      line.no = null;
    }
  }
  return { note: block?.note ?? null, hasLineNumbers: Number.isInteger(block?.line), lines };
}
