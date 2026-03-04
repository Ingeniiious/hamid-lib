const CDN_BASE = "https://lib.thevibecodedcompany.com";

const GENDER_AVATARS: Record<string, string> = {
  male: `${CDN_BASE}/images/avatar-male.webp`,
  female: `${CDN_BASE}/images/avatar-female.webp`,
};

const DEFAULT_AVATAR = `${CDN_BASE}/images/avatar-default.webp`;

export function getDefaultAvatar(gender: string | null | undefined): string {
  if (gender && gender in GENDER_AVATARS) return GENDER_AVATARS[gender];
  return DEFAULT_AVATAR;
}

export function getAvatarUrl(
  avatarUrl: string | null | undefined,
  gender: string | null | undefined
): string {
  if (avatarUrl) return avatarUrl;
  return getDefaultAvatar(gender);
}
