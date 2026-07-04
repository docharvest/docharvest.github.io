/** GitHub org id; logo is the org avatar (not vendored). */
export const ORG = 'docharvest';
export const ORG_GITHUB = `https://github.com/${ORG}`;

/** GitHub owner avatar URL (`https://github.com/{owner}.png`). */
export function logoFromGithub(githubOrRepo: string, size = 128): string {
  let owner = githubOrRepo.trim();
  if (owner.startsWith('https://github.com/')) {
    owner = owner.slice('https://github.com/'.length);
  }
  owner = owner.replace(/\.git$/, '').split('/')[0] || owner;
  if (!owner) return '';
  return `https://github.com/${owner}.png?size=${size}`;
}

/** Org avatar URL, same CDN pattern as pack logos. */
export function orgLogoUrl(size = 128): string {
  return logoFromGithub(ORG, size);
}
