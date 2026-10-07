/**
 * GitHub `releases.atom` feed parsing.
 *
 * T1 is the first collection path because it costs no GitHub API quota
 * (`github.com/{repo}/releases.atom` is not `api.github.com`). Its only
 * structural limit is that the feed carries the 10 most recent entries.
 */

const ENTITIES = new Map([
  ['&lt;', '<'],
  ['&gt;', '>'],
  ['&quot;', '"'],
  ['&apos;', "'"],
  ['&#39;', "'"],
  ['&nbsp;', ' '],
]);

/**
 * `<content type="html">` arrives escaped: `&lt;li&gt;` rather than `<li>`.
 * Every tag-level read has to unescape first, otherwise item extraction
 * silently returns 0 for every release instead of failing loudly.
 */
export function unescapeHtml(text) {
  let result = String(text ?? '');
  for (const [entity, character] of ENTITIES) {
    result = result.split(entity).join(character);
  }
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(Number.parseInt(hex, 16)));
  result = result.replace(/&#(\d+);/g, (_, decimal) => safeCodePoint(Number.parseInt(decimal, 10)));
  // &amp; last: unescaping it earlier would turn `&amp;lt;` into `<`.
  return result.split('&amp;').join('&');
}

/**
 * Release note HTML to the markdown-lite subset the existing change item
 * parser already understands (`**Scope:** summary ([hash](url))`), so atom
 * items and REST/CHANGELOG items produce identical ChangeItem fields.
 */
export function htmlToMarkdownLite(html) {
  const converted = String(html ?? '')
    .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, ' ')
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => `[${stripTags(label)}](${href})`)
    .replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**')
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<br\s*\/?>/gi, ' ');
  return unescapeHtml(stripTags(converted)).replace(/\s+/g, ' ').trim();
}

/**
 * Top-level `<li>` elements, one change item each.
 *
 * Nested list text is dropped from the parent item rather than concatenated,
 * so a two-level list yields one item per bullet without duplicating text.
 */
export function extractListItems(html) {
  const source = String(html ?? '');
  const items = [];
  let depth = 0;
  let cursor = 0;
  let parts = [];

  for (const token of source.matchAll(/<li\b[^>]*>|<\/li\s*>/gi)) {
    const isOpeningTag = token[0][1] !== '/';
    const tokenEnd = token.index + token[0].length;

    if (isOpeningTag) {
      if (depth === 0) {
        parts = [];
        cursor = tokenEnd;
      } else if (depth === 1) {
        parts.push(source.slice(cursor, token.index));
      }
      depth += 1;
      continue;
    }

    if (depth === 0) continue;
    if (depth === 1) {
      parts.push(source.slice(cursor, token.index));
      const text = htmlToMarkdownLite(parts.join(' '));
      if (text) items.push(text);
      depth = 0;
      continue;
    }
    depth -= 1;
    if (depth === 1) cursor = tokenEnd;
  }

  return items;
}

/**
 * Headings become section titles, so `Bug Fixes` / `Breaking Changes` keep
 * driving categorization downstream.
 *
 * A section with no `<li>` is not emitted. That is deliberate: a release body
 * that is only a "see CHANGELOG" link must count as zero items so coverage
 * reports the gap instead of hiding it behind prose.
 */
export function extractSectionsFromHtml(html) {
  const source = String(html ?? '');
  const sections = [];
  const pushSection = (title, body) => {
    const items = extractListItems(body);
    if (!items.length) return;
    sections.push({ title, body: htmlToMarkdownLite(body), items });
  };

  let title = 'Release Notes';
  let cursor = 0;
  for (const heading of source.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)) {
    pushSection(title, source.slice(cursor, heading.index));
    title = htmlToMarkdownLite(heading[2]) || 'Release Notes';
    cursor = heading.index + heading[0].length;
  }
  pushSection(title, source.slice(cursor));

  return sections;
}

export function parseAtomFeed(xml) {
  const source = String(xml ?? '');
  const entries = Array.from(source.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi), (match) => parseAtomEntry(match[1]));
  return {
    feedTitle: htmlToMarkdownLite(readTag(source, 'title')),
    entries,
  };
}

export function parseAtomEntry(entryXml) {
  const source = String(entryXml ?? '');
  const id = readTag(source, 'id');
  const link = readLinkHref(source);
  const contentHtml = unescapeHtml(readTag(source, 'content'));

  return {
    id,
    tagName: readTagName({ link, id }),
    title: htmlToMarkdownLite(readTag(source, 'title')),
    updated: readTag(source, 'updated').trim() || null,
    link: link || null,
    author: htmlToMarkdownLite(readTag(source, 'name')) || null,
    contentHtml,
    sections: extractSectionsFromHtml(contentHtml),
  };
}

/**
 * Splits `pkg@1.2.3` / `v1.2.3` tags.
 *
 * A monorepo feed mixes sibling packages: querying `vite` also returns
 * `create-vite@9.1.2` and `plugin-legacy@8.2.0`. Reading only the trailing
 * version would accept both, so the package part is returned for validation.
 */
export function parseTagRef(tagName) {
  const tag = String(tagName ?? '').trim();
  const match = tag.match(/^(?:(.+)@)?v?(\d+\.\d+\.\d+)(?:[-+]([0-9A-Za-z.\-+]+))?$/);
  if (!match) return { tagName: tag, packageName: null, version: null, prerelease: false };

  return {
    tagName: tag,
    packageName: match[1] ?? null,
    version: match[2],
    prerelease: Boolean(match[3]) && !match[3].startsWith('+'),
  };
}

export function isTagForPackage(tagPackageName, packageName) {
  // A repo-level tag (`v3.9.0`) carries no package part and always belongs.
  if (!tagPackageName) return true;
  const tagName = normalizeName(tagPackageName);
  const target = normalizeName(packageName);
  if (!target) return false;
  return tagName === target || tagName === unscoped(target) || unscoped(tagName) === target;
}

function readTag(xml, tag) {
  const match = String(xml).match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}\\s*>`, 'i'));
  return match ? match[1] : '';
}

function readLinkHref(xml) {
  const alternate = String(xml).match(/<link\b[^>]*rel="alternate"[^>]*href="([^"]*)"/i)
    ?? String(xml).match(/<link\b[^>]*href="([^"]*)"[^>]*rel="alternate"/i)
    ?? String(xml).match(/<link\b[^>]*href="([^"]*)"/i);
  return alternate ? unescapeHtml(alternate[1]) : '';
}

function readTagName({ link, id }) {
  const fromLink = String(link).match(/\/releases\/tag\/(.+)$/);
  if (fromLink) return decodeURIComponent(fromLink[1]);
  const fromId = String(id).match(/Repository\/\d+\/(.+)$/);
  return fromId ? fromId[1] : '';
}

function stripTags(html) {
  return String(html).replace(/<[^>]+>/g, ' ');
}

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase();
}

function unscoped(name) {
  return name.startsWith('@') ? name.slice(name.indexOf('/') + 1) : name;
}

function safeCodePoint(code) {
  return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
}
