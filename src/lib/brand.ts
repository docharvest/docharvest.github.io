/** GitHub org id; logo is the org avatar (not vendored). */
export const ORG = 'docharvest';
export const ORG_GITHUB = `https://github.com/${ORG}`;
/** Org avatar URL, same CDN pattern as pack logos. */
export function orgLogoUrl(size = 128): string {
  return `https://github.com/${ORG}.png?size=${size}`;
}
