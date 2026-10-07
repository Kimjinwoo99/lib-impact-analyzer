import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const OWNER = 'vuetifyjs';
const REPO = 'vuetify';
const MIN_VERSION = '3.6.5';
const MAX_VERSION = '4.1.5';
const now = new Date();
const outputJson = resolve('data/vuetify/releases-3.6.5-to-4.1.5.json');
const outputMarkdown = resolve('data/vuetify/releases-3.6.5-to-4.1.5.md');

async function main() {
  const releases = await fetchGitHubReleasesInVersionRange({ owner: OWNER, repo: REPO, minVersion: MIN_VERSION, maxVersion: MAX_VERSION });
  const parsedReleases = releases.map(parseRelease);
  const changeItems = parsedReleases.flatMap((release) => release.items);
  const payload = {
    packageName: 'vuetify',
    source: 'github-releases',
    repository: `https://github.com/${OWNER}/${REPO}`,
    apiUrl: `https://api.github.com/repos/${OWNER}/${REPO}/releases`,
    collectedAt: now.toISOString(),
    minVersion: MIN_VERSION,
    maxVersion: MAX_VERSION,
    releaseCount: parsedReleases.length,
    changeItemCount: changeItems.length,
    releases: parsedReleases,
  };

  await writeJson(outputJson, payload);
  await writeMarkdown(outputMarkdown, payload);

  console.log(`Saved ${payload.releaseCount} releases and ${payload.changeItemCount} parsed items.`);
  console.log(outputJson);
  console.log(outputMarkdown);
}

async function fetchGitHubReleasesInVersionRange({ owner, repo, minVersion, maxVersion }) {
  const releases = [];
  for (let page = 1; page <= 20; page += 1) {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'lib-impact-analyzer-pilot',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub releases request failed: ${response.status} ${response.statusText}\n${text}`);
    }

    const pageItems = await response.json();
    if (!Array.isArray(pageItems) || pageItems.length === 0) break;

    for (const release of pageItems) {
      const version = String(release.tag_name ?? release.name ?? '').replace(/^v/, '');
      if (!isPlainSemver(version)) continue;
      if (compareSemver(version, maxVersion) > 0) continue;
      if (compareSemver(version, minVersion) < 0) return releases;
      releases.push(release);
    }
  }
  return releases;
}


function isPlainSemver(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

function compareSemver(a, b) {
  const left = String(a).split('.').map((part) => Number(part) || 0);
  const right = String(b).split('.').map((part) => Number(part) || 0);
  for (let i = 0; i < 3; i += 1) {
    if ((left[i] ?? 0) > (right[i] ?? 0)) return 1;
    if ((left[i] ?? 0) < (right[i] ?? 0)) return -1;
  }
  return 0;
}
function parseRelease(release) {
  const version = String(release.tag_name ?? release.name ?? '').replace(/^v/, '');
  const body = release.body ?? '';
  const sections = parseSections(body);
  const items = sections.flatMap((section) => section.items.map((item, index) => ({
    itemId: `${release.tag_name || version}:${slug(section.title)}:${index + 1}`,
    version,
    tagName: release.tag_name ?? null,
    releaseName: release.name ?? null,
    publishedAt: release.published_at ?? release.created_at ?? null,
    sectionTitle: section.title,
    rawText: item,
    sourceUrl: release.html_url,
  })));

  return {
    version,
    tagName: release.tag_name ?? null,
    name: release.name ?? null,
    publishedAt: release.published_at ?? release.created_at ?? null,
    sourceUrl: release.html_url,
    prerelease: Boolean(release.prerelease),
    draft: Boolean(release.draft),
    rawBody: body,
    sections,
    items,
  };
}

function parseSections(markdown) {
  const sections = [];
  let current = { title: 'Release Notes', lines: [] };

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^(#{2,4})\s+(.+?)\s*$/);
    if (heading) {
      pushSection(sections, current);
      current = { title: cleanupMarkdown(heading[2]), lines: [] };
      continue;
    }
    current.lines.push(line);
  }
  pushSection(sections, current);

  return sections.length ? sections : [{ title: 'Release Notes', body: markdown.trim(), items: extractBulletItems(markdown) }];
}

function pushSection(sections, section) {
  const body = section.lines.join('\n').trim();
  const items = extractBulletItems(body);
  if (!body && items.length === 0) return;
  sections.push({
    title: section.title,
    body,
    items,
  });
}

function extractBulletItems(markdown) {
  const items = [];
  let current = null;

  for (const line of markdown.split(/\r?\n/)) {
    const bullet = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (bullet) {
      if (current) items.push(cleanupMarkdown(current.join('\n')));
      current = [bullet[1]];
      continue;
    }

    if (current && /^\s{2,}\S/.test(line)) {
      current.push(line.trim());
    }
  }

  if (current) items.push(cleanupMarkdown(current.join('\n')));
  return items.filter(Boolean);
}

function cleanupMarkdown(text) {
  return text
    .replace(/<!--.*?-->/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function slug(text) {
  return String(text || 'section')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function writeMarkdown(path, data) {
  const lines = [];
  lines.push('# Vuetify Releases - 3.6.5 to 4.1.5');
  lines.push('');
  lines.push(`Collected: ${data.collectedAt}`);
  lines.push(`Version range: ${data.minVersion} -> ${data.maxVersion}`);
  lines.push(`Source: ${data.repository}/releases`);
  lines.push(`Releases: ${data.releaseCount}`);
  lines.push(`Parsed items: ${data.changeItemCount}`);
  lines.push('');

  for (const release of data.releases) {
    lines.push(`## ${release.tagName || release.version} - ${release.publishedAt}`);
    lines.push('');
    lines.push(`Source: ${release.sourceUrl}`);
    lines.push('');
    for (const section of release.sections) {
      if (!section.items.length) continue;
      lines.push(`### ${section.title}`);
      lines.push('');
      for (const item of section.items) {
        lines.push(`- ${item}`);
      }
      lines.push('');
    }
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${lines.join('\n').trim()}\n`, 'utf8');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});


