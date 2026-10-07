/**
 * 결과지 — '대응 · 테스트 작업 목록'을 파일 하나로 굳힌다.
 *
 * 업데이트를 끝낸 사람이 "무엇을 왜 어떻게 처리했는가"를 남기는 산출물이다.
 * 그래서 화면의 스크린샷이 아니라 **화면과 같은 상호작용을 가진 HTML**이다:
 * 좌측 목록을 누르면 우측 상세가 바뀌고, 수정 diff와 완료 비고까지 함께 담긴다.
 *
 * 자체 완결형(self-contained)이 절대 조건이다 — CSS·JS를 인라인으로 넣고 외부
 * 요청을 하지 않는다. 시연장에서 네트워크 없이 열려야 하고, 몇 달 뒤 이 저장소가
 * 없는 사람이 받아도 그대로 열려야 한다.
 *
 * Agent 질문 패널은 모양만 남기고 동작을 뺀다(2026-08-22 사용자 결정) — 결과지는
 * 정적 기록이라 물어볼 상대가 없다. 아예 지우면 화면과 대조가 안 되므로 남긴다.
 */

const VERDICT_META = {
  ACTION_REQUIRED: { label: '수정 필요', tone: 'bad' },
  SMOKE_TEST: { label: '확인 필요', tone: 'warn' },
  NOT_AFFECTED: { label: '무영향', tone: 'ok' },
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 데이터를 <script> 안에 심을 때의 위험은 셋이다: 문서를 조기 종료시키는
 * `</script>`, HTML 주석 파서를 깨우는 `<!--`, 그리고 JS에서 줄바꿈으로 취급되는
 * U+2028·U+2029. 정규식에는 리터럴 문자가 아니라 이스케이프로 써야 한다 —
 * 리터럴로 넣으면 이 소스 자체의 정규식이 줄에서 끊긴다.
 */
function embedJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function formatStamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 파일명에 쓸 수 없는 문자를 걷어낸다(scoped 패키지의 `/` 포함). */
export function reportFileName({ packageName, currentVersion, targetVersion }, date = new Date()) {
  const safe = String(packageName ?? 'package').replace(/[^\w.-]+/g, '-');
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const range = targetVersion ? `${currentVersion}-to-${targetVersion}` : String(currentVersion ?? '');
  return `업데이트결과지_${safe}_${range}_${stamp}.html`;
}

const STYLE = `
:root {
  --ink: #16202e; --muted: #55617a; --line: #dfe4ec; --line-soft: #eceff5;
  --soft: #f7f9fc; --soft-alt: #fbfcfe; --bad: #c0392b; --warn: #a8710f;
  --ok: #1f7a4d; --accent: #1f5fd0;
  --bad-bg: #fdeceb; --warn-bg: #fdf5e4; --ok-bg: #eaf6ef; --idle-bg: #eef1f6;
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 28px 32px 56px;
  font-family: "Malgun Gothic", "맑은 고딕", -apple-system, "Segoe UI", sans-serif;
  color: var(--ink); background: #fff; font-size: 15px; line-height: 1.6;
}
h1 { margin: 0 0 4px; font-size: 26px; letter-spacing: -0.01em; }
.sub { margin: 0 0 20px; color: var(--muted); font-size: 14px; }
.mono { font-family: Consolas, "Courier New", monospace; }
.range { display: inline-block; padding: 2px 10px; border-radius: 999px; background: var(--ok-bg); color: var(--ok); font-weight: 700; font-size: 14px; }
.counts { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 18px; }
.pill { display: inline-block; padding: 3px 11px; border-radius: 999px; font-size: 13px; font-weight: 700; background: var(--idle-bg); color: var(--muted); }
.pill--bad { background: var(--bad-bg); color: var(--bad); }
.pill--warn { background: var(--warn-bg); color: var(--warn); }
.pill--ok { background: var(--ok-bg); color: var(--ok); }
.grid { display: grid; grid-template-columns: minmax(280px, 380px) 1fr; gap: 18px; align-items: start; }
.list { border: 1px solid var(--line); border-radius: 10px; background: var(--soft-alt); overflow: hidden; }
.list__group { margin: 0; padding: 10px 14px 8px; background: var(--soft); border-bottom: 1px solid var(--line-soft); font-size: 13px; font-weight: 700; display: flex; gap: 8px; align-items: center; }
.item { display: flex; gap: 10px; width: 100%; padding: 11px 14px; border: 0; border-bottom: 1px solid var(--line-soft); background: none; text-align: left; cursor: pointer; font: inherit; color: inherit; }
.item:hover { background: #f2f6fd; }
.item[aria-current="true"] { background: #eaf6ef; box-shadow: inset 3px 0 0 var(--ok); }
.item__body { flex: 1; min-width: 0; }
.item__title { display: block; font-weight: 600; }
.item__sub { display: block; color: var(--muted); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item__done { color: var(--ok); font-weight: 700; }
.detail { border: 1px solid var(--line); border-radius: 10px; padding: 20px 22px; min-height: 320px; }
.detail__top { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.detail__title { margin: 0 0 14px; font-size: 21px; }
.fact { display: grid; grid-template-columns: max-content 1fr; gap: 8px 14px; margin: 0 0 14px; }
.fact dt { font-weight: 700; font-size: 14px; white-space: nowrap; }
.fact dd { margin: 0; }
.section { margin: 18px 0 0; padding-top: 14px; border-top: 1px solid var(--line-soft); }
.section__title { margin: 0 0 10px; font-size: 15px; font-weight: 700; }
.points { margin: 0; padding-left: 20px; }
.points li { margin-bottom: 6px; }
.filepill { display: inline-block; padding: 2px 8px; margin: 0 6px 6px 0; border-radius: 6px; background: var(--idle-bg); font-size: 13px; }
.note { padding: 10px 12px; border-radius: 8px; background: var(--ok-bg); color: #17603c; }
.diff { border: 1px solid #2b3240; border-radius: 8px; overflow: hidden; margin-bottom: 12px; background: #1b2027; }
.diff__bar { display: flex; align-items: center; gap: 8px; padding: 7px 12px; background: #232935; color: #c8d0dc; font-size: 13px; }
.diff__dots { color: #7d8797; letter-spacing: 2px; }
.diff__body { margin: 0; padding: 10px 0; overflow-x: auto; }
.diff__line { display: flex; font-family: Consolas, "Courier New", monospace; font-size: 13px; white-space: pre; }
.diff__no { flex: 0 0 46px; text-align: right; padding-right: 12px; color: #6d7788; user-select: none; }
.diff__text { padding-right: 16px; color: #d7dde6; }
.diff__line--del { background: #3b2226; }
.diff__line--del .diff__text { color: #f2b8b5; }
.diff__line--add { background: #1e3327; }
.diff__line--add .diff__text { color: #a6e3b8; }
.term { background: #1b2027; color: #d7dde6; border-radius: 8px; padding: 12px 14px; font-family: Consolas, "Courier New", monospace; font-size: 13px; }
.qa { margin-top: 18px; padding: 14px 16px; border: 1px dashed var(--line); border-radius: 10px; background: var(--soft); }
.qa__title { margin: 0 0 8px; font-size: 14px; font-weight: 700; }
.qa__row { display: flex; gap: 8px; }
.qa input, .qa button { font: inherit; }
.qa input { flex: 1; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; background: #fff; }
.qa button { padding: 8px 14px; border: 1px solid var(--line); border-radius: 6px; background: var(--idle-bg); }
.qa input[disabled], .qa button[disabled] { color: #97a0b2; cursor: not-allowed; }
.qa__hint { margin: 8px 0 0; color: var(--muted); font-size: 13px; }
.foot { margin-top: 26px; padding-top: 14px; border-top: 1px solid var(--line-soft); color: var(--muted); font-size: 13px; }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
`;

const SCRIPT = `
(function () {
  var rows = window.__REPORT__.rows;
  var list = document.getElementById('list');
  var detail = document.getElementById('detail');

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function pill(verdict) {
    var meta = { ACTION_REQUIRED: ['수정 필요', 'bad'], SMOKE_TEST: ['확인 필요', 'warn'], NOT_AFFECTED: ['무영향', 'ok'] }[verdict];
    return meta ? '<span class="pill pill--' + meta[1] + '">' + meta[0] + '</span>' : '';
  }
  function factRow(label, value) {
    return value ? '<dt>' + label + '</dt><dd>' + esc(value) + '</dd>' : '';
  }
  // 줄 타입·번호는 화면과 같은 계산(lib/diffLines.js)이 이미 붙여 보낸 값이다.
  var SIGN = { del: '−', add: '+', ctx: ' ' };
  function renderDiff(fix) {
    if (!fix) return '';
    var html = '';
    (fix.files || []).forEach(function (file) {
      (file.blocks || []).forEach(function (block) {
        html += '<div class="diff"><div class="diff__bar"><span class="diff__dots">•••</span><span class="mono">' + esc(file.path) + '</span></div><div class="diff__body">';
        (block.lines || []).forEach(function (line) {
          var cls = line.type === 'del' ? ' diff__line--del' : line.type === 'add' ? ' diff__line--add' : '';
          html += '<div class="diff__line' + cls + '"><span class="diff__no">' + (line.no == null ? '' : line.no)
            + '</span><span class="diff__text">' + esc(SIGN[line.type] + ' ' + line.text) + '</span></div>';
        });
        html += '</div></div>';
        if (block.note) html += '<p class="qa__hint">' + esc(block.note) + '</p>';
      });
    });
    if (fix.command) html += '<div class="term">$ ' + esc(fix.command) + '</div>';
    return html;
  }

  function render(index) {
    var row = rows[index];
    if (!row) return;
    var html = '<div class="detail__top">' + pill(row.verdict) + (row.badge ? '<span class="pill">' + esc(row.badge) + '</span>' : '') + '</div>';
    html += '<h2 class="detail__title">' + esc(row.title) + '</h2>';

    var facts = factRow('근거', row.reason) + factRow('조치', row.action) + factRow('검증', row.verify);
    if ((row.files || []).length) {
      facts += '<dt>파일</dt><dd>' + row.files.map(function (f) { return '<span class="filepill mono">' + esc(f) + '</span>'; }).join('') + '</dd>';
    }
    if (facts) html += '<dl class="fact">' + facts + '</dl>';

    if ((row.points || []).length) {
      html += '<div class="section"><p class="section__title">확인 포인트</p><ul class="points">'
        + row.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>';
    }
    if ((row.members || []).length) {
      html += '<div class="section"><p class="section__title">같은 조치로 묶인 판정 ' + row.members.length + '건</p><ul class="points">'
        + row.members.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>';
    }
    if (row.fix) {
      html += '<div class="section"><p class="section__title">수정할 코드 위치 <span class="qa__hint" style="display:inline">— 수정 전(−) / 수정 후(+)</span></p>' + renderDiff(row.fix) + '</div>';
    }
    if (row.done) {
      html += '<div class="section"><p class="section__title">작업 완료</p><div class="note">' + esc(row.done.note)
        + (row.done.at ? ' <span class="qa__hint" style="display:inline">(' + esc(row.done.at) + ')</span>' : '') + '</div></div>';
    }

    html += '<div class="qa"><p class="qa__title">Agent에게 질문하기</p><div class="qa__row">'
      + '<input type="text" placeholder="이 판정에 대해 궁금한 점을 입력하세요" disabled />'
      + '<button type="button" disabled>질문</button></div>'
      + '<p class="qa__hint">결과지에서는 질문 기능이 동작하지 않습니다 — 분석 시스템에서 이용하세요.</p></div>';

    detail.innerHTML = html;
    Array.prototype.forEach.call(list.querySelectorAll('.item'), function (el) {
      el.setAttribute('aria-current', String(Number(el.dataset.index) === index));
    });
  }

  list.addEventListener('click', function (event) {
    var button = event.target.closest('.item');
    if (button) render(Number(button.dataset.index));
  });

  var first = rows.findIndex(function (row) { return row.verdict !== 'NOT_AFFECTED'; });
  render(first === -1 ? 0 : first);
})();
`;

/**
 * 결과지 HTML 한 장.
 *
 * `rows`는 화면이 이미 만들어 둔 행 그대로다 — 결과지가 판정을 다시 해석하면
 * 화면과 결과지가 갈라질 수 있어서, 해석은 화면에서 끝내고 여기서는 그리기만 한다.
 */
export function buildReportHtml({ packageName, currentVersion, targetVersion, rows, counts, projectPath, generatedAt = new Date() }) {
  const range = targetVersion ? `${currentVersion} → ${targetVersion}` : String(currentVersion ?? '');
  const groups = [
    { verdict: 'ACTION_REQUIRED', title: '수정 필요' },
    { verdict: 'SMOKE_TEST', title: '확인 필요' },
    { verdict: 'NOT_AFFECTED', title: '무영향' },
  ];

  const listHtml = groups
    .map((group) => {
      const members = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.verdict === group.verdict);
      if (!members.length) return '';
      const meta = VERDICT_META[group.verdict];
      return [
        `<p class="list__group"><span class="pill pill--${meta.tone}">${meta.label}</span><span>${members.length}건</span></p>`,
        ...members.map(({ row, index }) => `
          <button type="button" class="item" data-index="${index}" aria-current="false">
            <span class="item__body">
              <span class="item__title">${escapeHtml(row.title)}</span>
              <span class="item__sub">${escapeHtml(row.summary ?? '')}</span>
            </span>
            ${row.done ? '<span class="item__done" title="완료 처리됨">✓</span>' : ''}
          </button>`),
      ].join('\n');
    })
    .join('\n');

  const countPills = [
    `<span class="pill pill--bad">수정 필요 ${counts?.action ?? 0}건</span>`,
    `<span class="pill pill--warn">확인 필요 ${counts?.smoke ?? 0}건</span>`,
    `<span class="pill pill--ok">무영향 ${counts?.unaffected ?? 0}건</span>`,
    `<span class="pill">완료 처리 ${counts?.done ?? 0} / ${counts?.total ?? 0}건</span>`,
  ].join('');

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>업데이트 결과지 — ${escapeHtml(packageName)} ${escapeHtml(range)}</title>
<style>${STYLE}</style>
</head>
<body>
<h1>업데이트 결과지</h1>
<p class="sub">
  <strong class="mono">${escapeHtml(packageName)}</strong>
  <span class="range">${escapeHtml(range)}</span>
  · 작성 ${escapeHtml(formatStamp(generatedAt))}${projectPath ? ` · 대상 <span class="mono">${escapeHtml(projectPath)}</span>` : ''}
</p>
<div class="counts">${countPills}</div>

<div class="grid">
  <nav class="list" id="list" aria-label="작업 목록">${listHtml}</nav>
  <section class="detail" id="detail"></section>
</div>

<p class="foot">
  라이브러리 업데이트 영향 분석 시스템이 만든 기록입니다. 항목을 누르면 그 항목의 판정 근거와 조치가 보입니다.
</p>

<script>window.__REPORT__ = ${embedJson({ rows })};</script>
<script>${SCRIPT}</script>
</body>
</html>`;
}
