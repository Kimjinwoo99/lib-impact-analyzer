/**
 * Minimal markdown → HTML, no dependencies.
 *
 * Everything is HTML-escaped FIRST and only known markdown constructs are
 * turned back into tags. That ordering is the whole safety argument: the input
 * here is text this tool did not write — a README from an arbitrary project, an
 * agent's answer — so any `<script>` in it stays literal text.
 *
 * Deliberately small: headings, lists, quotes, fenced code, inline code/bold/
 * italic/links, rules. Tables render as monospace lines rather than a grid —
 * enough to read, and not worth a parser.
 */

export function renderMarkdown(text) {
  const escaped = String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = escaped.split(/\r?\n/);
  const html = [];
  let inCode = false;
  let listTag = null;
  let inQuote = false;

  const closeList = () => {
    if (listTag) {
      html.push(`</${listTag}>`);
      listTag = null;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      html.push('</blockquote>');
      inQuote = false;
    }
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      closeList();
      closeQuote();
      html.push(inCode ? '</code></pre>' : '<pre><code>');
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      html.push(`${line}\n`);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      closeQuote();
      const level = heading[1].length;
      html.push(`<h${level + 2}>${inline(heading[2])}</h${level + 2}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line.trim())) {
      closeList();
      closeQuote();
      html.push('<hr>');
      continue;
    }
    const quote = line.match(/^&gt;\s?(.*)$/);
    if (quote) {
      closeList();
      if (!inQuote) {
        html.push('<blockquote>');
        inQuote = true;
      }
      html.push(`<p>${inline(quote[1])}</p>`);
      continue;
    }
    closeQuote();

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const tag = bullet ? 'ul' : 'ol';
      if (listTag !== tag) {
        closeList();
        html.push(`<${tag}>`);
        listTag = tag;
      }
      html.push(`<li>${inline((bullet ?? numbered)[1])}</li>`);
      continue;
    }
    closeList();

    if (/^\|.*\|\s*$/.test(line)) {
      html.push(`<p class="md-table mono">${inline(line)}</p>`);
      continue;
    }

    if (!line.trim()) continue;
    html.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  closeQuote();
  if (inCode) html.push('</code></pre>');
  return html.join('');
}

function inline(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    // http(s) only: a rendered link must not become a javascript: sink.
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}
