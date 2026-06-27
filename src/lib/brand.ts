/** Site / org brand — GitHub org profile photo (not vendored). */
export const ORG = 'docharvest';
export const ORG_GITHUB = `https://github.com/${ORG}`;
/** Same avatar CDN pattern as pack logos. */
export function orgLogoUrl(size = 128): string {
  return `https://github.com/${ORG}.png?size=${size}`;
}
