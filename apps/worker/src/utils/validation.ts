const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug) && slug.length >= 2 && slug.length <= 64;
}

export function sanitizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
];

export function isAllowedMediaType(contentType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(contentType) || ALLOWED_VIDEO_TYPES.includes(contentType);
}

export function getMediaType(contentType: string): 'image' | 'video' {
  return ALLOWED_VIDEO_TYPES.includes(contentType) ? 'video' : 'image';
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.slice(lastDot + 1).toLowerCase() : '';
}
