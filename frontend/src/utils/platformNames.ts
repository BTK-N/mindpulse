/**
 * Friendly display names for common social and media platforms.
 * Shared between HistoryTrendsView and PairingCard.
 */

export const KNOWN_PLATFORMS: Record<string, string> = {
  'youtube.com': 'YouTube',
  'www.youtube.com': 'YouTube',
  'instagram.com': 'Instagram',
  'www.instagram.com': 'Instagram',
  'whatsapp.com': 'WhatsApp',
  'web.whatsapp.com': 'WhatsApp',
  'tiktok.com': 'TikTok',
  'www.tiktok.com': 'TikTok',
  'x.com': 'X',
  'twitter.com': 'X',
  'facebook.com': 'Facebook',
  'www.facebook.com': 'Facebook',
  'snapchat.com': 'Snapchat',
  'reddit.com': 'Reddit',
  'www.reddit.com': 'Reddit',
  'discord.com': 'Discord',
  'linkedin.com': 'LinkedIn',
  'www.linkedin.com': 'LinkedIn',
  'github.com': 'GitHub',
  'google.com': 'Google',
  'www.google.com': 'Google',
  'aistudio.google.com': 'Google AI Studio',
};

/**
 * Returns a friendly display name for a domain if recognized, otherwise returns the clean domain.
 * @param domain - Raw or normalized domain name
 * @returns Human-friendly name or original domain
 */
export function getFriendlyPlatformName(domain: string): string {
  if (!domain) return '';
  const clean = domain.toLowerCase().trim();
  if (KNOWN_PLATFORMS[clean]) return KNOWN_PLATFORMS[clean];
  const withoutWww = clean.startsWith('www.') ? clean.slice(4) : clean;
  if (KNOWN_PLATFORMS[withoutWww]) return KNOWN_PLATFORMS[withoutWww];
  return domain;
}
