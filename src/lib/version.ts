export function bumpPatchVersion(version: string): string {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}
