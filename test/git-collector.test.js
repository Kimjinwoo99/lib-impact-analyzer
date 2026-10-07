import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test, { after, before, describe } from 'node:test';
import { buildChangelogParseResult } from '../src/changelog/release-range-parser.js';
import {
  buildSections,
  collectFromGitRepository,
  collectT2Git,
  findTag,
  parseConventionalCommit,
} from '../src/collect/git-collector.js';

/*
 * Runs against a real repository built here rather than a mocked git.
 *
 * The thing worth testing is whether tag ranges map onto change items the way
 * a generated release note does, and that only holds against actual git
 * behaviour — tag resolution, commit ordering, range boundaries.
 */

let repoPath = null;

function git(args) {
  execFileSync('git', ['-C', repoPath, ...args], { stdio: 'pipe' });
}

function commit(message, file = 'src.js') {
  const target = join(repoPath, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${message}\n`);
  git(['add', '.']);
  git(['commit', '-q', '--no-gpg-sign', '-m', message]);
}

before(() => {
  repoPath = mkdtempSync(join(tmpdir(), 'git-collector-'));
  execFileSync('git', ['init', '-q', '-b', 'main', repoPath], { stdio: 'pipe' });
  git(['config', 'user.email', 'test@example.test']);
  git(['config', 'user.name', 'test']);
  git(['config', 'commit.gpgsign', 'false']);

  commit('chore: initial');
  git(['tag', 'v1.0.0']);

  // v1.1.0 — two readable items plus noise that must not become items.
  commit('fix(VSelect): fix menu behavior (#100)');
  commit('feat(VBtn): add loading slot');
  commit('docs(readme): fix typo');
  commit('chore(release): publish v1.1.0');
  git(['tag', 'v1.1.0']);

  // v2.0.0 — a breaking change flagged by the `!` marker.
  commit('feat(VApp)!: remove deprecated behavior');
  git(['tag', 'v2.0.0']);

  // v2.1.0 — nothing but noise, so it must be reported as uncovered.
  commit('test: add coverage');
  commit('ci: bump runner');
  git(['tag', 'v2.1.0']);

  // v2.2.0 — a revert is the only change. GitHub writes these as
  // `Revert "<original subject>"`, which is not conventional-commit shaped.
  commit('Revert "fix(VSelect): fix menu behavior (#100)"');
  git(['tag', 'v2.2.0']);

  // v2.3.0 — one change in this package, one in a sibling package.
  commit('fix(core): guard against null options', 'packages/target/src.js');
  commit('fix(other): unrelated sibling change', 'packages/sibling/src.js');
  git(['tag', 'v2.3.0']);
});

after(() => {
  if (repoPath) rmSync(repoPath, { recursive: true, force: true });
});

describe('conventional commit parsing', () => {
  test('splits type, scope and breaking marker', () => {
    assert.deepEqual(parseConventionalCommit('fix(VSelect): fix menu behavior (#100)'), {
      type: 'fix',
      scope: 'VSelect',
      breaking: false,
      summary: 'fix menu behavior (#100)',
    });
    assert.deepEqual(parseConventionalCommit('feat(VApp)!: remove deprecated behavior'), {
      type: 'feat',
      scope: 'VApp',
      breaking: true,
      summary: 'remove deprecated behavior',
    });
    assert.equal(parseConventionalCommit('fix: no scope').scope, null);
    // Not a conventional commit — kept as a summary so nothing is lost.
    assert.deepEqual(parseConventionalCommit('Add yuwu9145 to FUNDING.yml'), {
      type: null,
      scope: null,
      breaking: false,
      summary: 'Add yuwu9145 to FUNDING.yml',
    });
  });

  test('parses a GitHub style revert subject', () => {
    assert.deepEqual(parseConventionalCommit('Revert "fix(VSelect): respect click outside (#20004)"'), {
      type: 'revert',
      scope: 'VSelect',
      breaking: false,
      summary: 'revert "respect click outside (#20004)"',
    });
    // A revert of a non-conventional commit keeps the whole subject.
    assert.equal(parseConventionalCommit('Revert "Add FUNDING.yml"').summary, 'revert "Add FUNDING.yml"');
  });

  test('a breaking marker outranks the commit type', () => {
    const sections = buildSections(
      [{ hash: 'abc1234', subject: 'feat(VApp)!: drop legacy prop', body: '' }],
      'vuetifyjs/vuetify',
    );
    assert.deepEqual(sections.map((section) => section.title), ['Breaking Changes']);
  });

  test('a BREAKING CHANGE body promotes an ordinary fix', () => {
    const sections = buildSections(
      [{ hash: 'abc1234', subject: 'fix(core): tighten validation', body: 'BREAKING CHANGE: rejects empty input' }],
      'vuetifyjs/vuetify',
    );
    assert.deepEqual(sections.map((section) => section.title), ['Breaking Changes']);
  });
});

describe('tag resolution', () => {
  test('checks candidates against the real tag list', () => {
    const tags = ['v3.6.11', 'plugin-vue@6.0.0', '1.2.3'];
    assert.equal(findTag(tags, '3.6.11', 'vuetify'), 'v3.6.11');
    assert.equal(findTag(tags, '1.2.3', 'anything'), '1.2.3');
    // A monorepo tag carries the package name; the unscoped form counts too.
    assert.equal(findTag(tags, '6.0.0', '@vitejs/plugin-vue'), 'plugin-vue@6.0.0');
    assert.equal(findTag(tags, '9.9.9', 'vuetify'), null);
  });
});

describe('T2-git collection', () => {
  test('reads change items from tag ranges and drops project noise', async () => {
    const result = await collectFromGitRepository({
      packageName: 'vuetify',
      repository: 'vuetifyjs/vuetify',
      repoPath,
      fromVersion: '1.0.0',
      targetVersions: ['1.1.0', '2.0.0'],
    });

    assert.equal(result.ok, true);
    assert.equal(result.tier, 'T2_GIT');
    assert.equal(result.evidence.rateLimitCost, 0);
    // Commits are the note's inputs, never the note — callers must see this.
    assert.equal(result.precision, 'COMMIT_LOG');
    assert.equal(result.degraded, true);
    assert.equal(result.coverage, 1);
    assert.deepEqual(result.coveredVersions, ['1.1.0', '2.0.0']);

    // docs + chore(release) were filtered, and the count is reported rather
    // than hidden — a note comparison needs to know what was removed.
    assert.equal(result.evidence.filteredCommitCount, 2);

    const v110 = result.sourceReleases.find((release) => release.version === '1.1.0');
    assert.deepEqual(v110.sections.map((section) => section.title), ['Bug Fixes', 'Features']);
    assert.equal(v110.rangeFrom, '1.0.0');
    assert.match(v110.sourceUrl, /compare\/v1\.0\.0\.\.\.v1\.1\.0$/);
  });

  test('produces items the existing range parser can consume', async () => {
    const result = await collectFromGitRepository({
      packageName: 'vuetify',
      repository: 'vuetifyjs/vuetify',
      repoPath,
      fromVersion: '1.0.0',
      targetVersions: ['1.1.0', '2.0.0'],
    });

    const parsed = buildChangelogParseResult({
      packageName: 'vuetify',
      currentVersion: '1.0.0',
      targetVersion: '2.0.0',
      releases: result.sourceReleases,
    });

    assert.equal(parsed.changeItemCount, 3);
    assert.deepEqual(parsed.releases.map((release) => release.version), ['2.0.0', '1.1.0']);

    const breaking = parsed.items.find((item) => item.category === 'BREAKING');
    assert.equal(breaking.scope, 'VApp');

    // `(#100)` is rewritten as a markdown link so the parser's existing
    // extraction finds the PR number and the commit hash.
    const bugFix = parsed.items.find((item) => item.category === 'BUG_FIX');
    assert.equal(bugFix.scope, 'VSelect');
    assert.deepEqual(bugFix.prNumbers, [100]);
    assert.equal(bugFix.commitHashes.length, 1);
  });

  test('takes the predecessor from the full version list, not from the target subset', async () => {
    // The realistic call: T1 already collected 1.1.0, so git is asked only for
    // 2.0.0. Its range must start at 1.1.0. Chaining from the installed version
    // instead would fold 1.1.0's commits into 2.0.0 — wrong release, and
    // duplicated against what T1 already returned.
    const result = await collectFromGitRepository({
      packageName: 'vuetify',
      repository: 'vuetifyjs/vuetify',
      repoPath,
      fromVersion: '1.0.0',
      targetVersions: ['2.0.0'],
      versionOrder: ['1.0.0', '1.1.0', '2.0.0', '2.1.0'],
    });

    const release = result.sourceReleases[0];
    assert.equal(release.rangeFrom, '1.1.0');
    assert.equal(release.rangeWidened, false);
    assert.equal(release.itemCount, 1);
    assert.deepEqual(release.sections.map((section) => section.title), ['Breaking Changes']);
  });

  test('widens the range when the predecessor carries no tag', async () => {
    const result = await collectFromGitRepository({
      packageName: 'vuetify',
      repository: 'vuetifyjs/vuetify',
      repoPath,
      targetVersions: ['2.0.0'],
      // 1.5.0 was never tagged in this repository.
      versionOrder: ['1.1.0', '1.5.0', '2.0.0'],
    });

    const release = result.sourceReleases[0];
    assert.equal(release.rangeFrom, '1.1.0');
    assert.equal(release.rangeWidened, true);
  });

  test('reads a revert as a change, not as noise', async () => {
    const result = await collectFromGitRepository({
      packageName: 'vuetify',
      repository: 'vuetifyjs/vuetify',
      repoPath,
      targetVersions: ['2.2.0'],
      versionOrder: ['2.1.0', '2.2.0'],
    });

    assert.equal(result.coverage, 1);
    const release = result.sourceReleases[0];
    assert.deepEqual(release.sections.map((section) => section.title), ['Reverts']);
    // The scope survives from the reverted commit's own subject.
    assert.match(release.sections[0].items[0], /^\*\*VSelect:\*\* revert "fix menu behavior/);
  });

  test('restricts the range to the package directory when one is known', async () => {
    const withFilter = await collectFromGitRepository({
      packageName: 'target',
      repository: 'org/monorepo',
      repoPath,
      targetVersions: ['2.3.0'],
      versionOrder: ['2.2.0', '2.3.0'],
      pathFilter: 'packages/target',
    });

    assert.equal(withFilter.evidence.pathFilter, 'packages/target');
    assert.equal(withFilter.sourceReleases[0].itemCount, 1);
    assert.match(withFilter.sourceReleases[0].sections[0].items[0], /guard against null options/);

    // Without a directory the sibling package's commit is read as ours. That
    // is the cost of not guessing a path, and it must stay visible.
    const withoutFilter = await collectFromGitRepository({
      packageName: 'target',
      repository: 'org/monorepo',
      repoPath,
      targetVersions: ['2.3.0'],
      versionOrder: ['2.2.0', '2.3.0'],
    });

    assert.equal(withoutFilter.evidence.pathFilter, null);
    assert.equal(withoutFilter.sourceReleases[0].itemCount, 2);
  });

  test('reports a release whose range held only noise', async () => {
    const result = await collectFromGitRepository({
      packageName: 'vuetify',
      repository: 'vuetifyjs/vuetify',
      repoPath,
      fromVersion: '2.0.0',
      targetVersions: ['2.1.0'],
    });

    assert.equal(result.coverage, 0);
    assert.deepEqual(result.missingVersions, [{ version: '2.1.0', reason: 'NO_ITEMS_IN_COMMITS' }]);
  });

  test('reports a version whose tag does not exist', async () => {
    const result = await collectFromGitRepository({
      packageName: 'vuetify',
      repository: 'vuetifyjs/vuetify',
      repoPath,
      fromVersion: '1.0.0',
      targetVersions: ['9.9.9'],
    });

    assert.deepEqual(result.missingVersions, [{ version: '9.9.9', reason: 'NO_TAG_IN_REPOSITORY' }]);
    assert.equal(result.releaseCount, 0);
  });

  test('degrades a git failure instead of reporting no changes', async () => {
    const result = await collectT2Git({
      packageName: 'vuetify',
      repository: 'vuetifyjs/vuetify',
      targetVersions: ['1.1.0'],
      cacheDir: join(repoPath, 'missing-cache'),
      url: join(repoPath, 'does-not-exist.git'),
    });

    assert.equal(result.ok, false);
    assert.equal(result.releaseCount, 0);
    assert.deepEqual(result.missingVersions, [{ version: '1.1.0', reason: 'GIT_UNAVAILABLE' }]);
  });
});
