/**
 * Patch-line health — is my current major.minor line still alive, or has
 * development moved on without backporting?
 *
 * The healthcheck's patch-line scan (`selectLaterPatchesInLine` in
 * release-range-parser.js) only ever looks INSIDE the current line, by
 * design — that is the fix a team can apply without an upgrade decision. But
 * it means an abandoned line reports "0 patches ahead" indistinguishably
 * from a healthy line that simply has nothing to fix yet. The two are
 * opposite findings: one says "you are current", the other says "no one is
 * watching this line anymore, and N releases happened on a newer line
 * instead — any future fix goes there, not here".
 *
 * This tells them apart from the registry alone — no calendar threshold,
 * just "has something newer shipped since my line's last release". A
 * threshold would need an arbitrary cutoff (how many months is abandoned?);
 * "development moved to a newer line and never came back" is a fact, not a
 * guess, the same registry-fact-over-heuristic bias as peer-audit.js.
 */

import { compareVersions } from './peer-audit.js';

function isStableVersion(version) {
  return /^\d+\.\d+\.\d+$/.test(String(version ?? ''));
}

function latestStableOf(metadata) {
  const tagged = metadata?.['dist-tags']?.latest ?? null;
  if (tagged && isStableVersion(tagged)) return tagged;
  const stable = Object.keys(metadata?.versions ?? {}).filter(isStableVersion).sort(compareVersions);
  return stable[stable.length - 1] ?? tagged;
}

function minorLineOf(version) {
  const [major, minor] = String(version).split('.');
  return `${major}.${minor}`;
}

/**
 * @param metadata          full npm registry document (versions + time + dist-tags)
 * @param currentVersion    the installed version
 * @param latestPatchInLine the healthcheck parser's own answer — the newest
 *                          release already known to be in this line (or null
 *                          if none), so this module does not re-derive it
 */
export function assessPatchLine({ metadata, currentVersion, latestPatchInLine }) {
  const versions = metadata?.versions ?? {};
  const stable = Object.keys(versions).filter(isStableVersion);
  const latestOverall = latestStableOf(metadata);
  const myLine = minorLineOf(currentVersion);
  // No usable registry data to say otherwise — treat as active rather than
  // manufacture a dormant verdict out of absence of evidence.
  const myLineIsLatest = latestOverall ? minorLineOf(latestOverall) === myLine : true;

  // The newest release actually published in my line so far.
  const lineFloor = latestPatchInLine ?? currentVersion;
  const lineFloorPublishedAt = metadata?.time?.[lineFloor] ?? null;

  let fixForwardCount = 0;
  let fixForwardSince = null;
  if (!myLineIsLatest && lineFloorPublishedAt) {
    const floorTime = Date.parse(lineFloorPublishedAt);
    const elsewhereLater = stable
      .filter((version) => minorLineOf(version) !== myLine)
      .filter((version) => {
        const publishedAt = metadata?.time?.[version];
        return publishedAt && Date.parse(publishedAt) > floorTime;
      });
    fixForwardCount = elsewhereLater.length;
    if (elsewhereLater.length) {
      fixForwardSince = elsewhereLater.map((version) => metadata.time[version]).sort()[0];
    }
  }

  return {
    myLine,
    latestOverall,
    myLineIsLatest,
    lineFloor,
    lineFloorPublishedAt,
    /*
     * DORMANT: a newer line exists AND it kept shipping after my line's last
     * release — development moved on without me. ACTIVE covers both "I am on
     * the current line" and "no newer line exists yet, so there is nothing
     * to have moved on to".
     */
    status: !myLineIsLatest && fixForwardCount > 0 ? 'DORMANT' : 'ACTIVE',
    fixForwardCount,
    fixForwardSince,
  };
}
