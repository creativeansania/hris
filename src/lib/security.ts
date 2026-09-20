/**
 * Security & Input Sanitization Utilities
 * Prevents Cross-Site Scripting (XSS), Path Traversal, and Malformed Input.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Strips dangerous HTML tags, inline scripts, event handlers, and javascript protocols.
 */
export function sanitizeText(input?: string | null): string {
  if (!input) return '';

  return input
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe, object, embed tags
    .replace(/<(?:iframe|object|embed|svg|style|link)\b[^<]*(?:(?!<\/(?:iframe|object|embed|svg|style|link)>)<[^<]*)*<\/(?:iframe|object|embed|svg|style|link)>/gi, '')
    // Remove dangerous HTML attributes (onerror, onload, onclick, onmouseover, etc.)
    .replace(/\s*on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '')
    // Remove javascript: and vbscript: URIs
    .replace(/javascript:[^\s"'>]+/gi, '')
    .replace(/vbscript:[^\s"'>]+/gi, '')
    // Strip remaining HTML tags
    .replace(/<[^>]*>?/gm, '')
    .trim();
}

/**
 * Sanitizes file names to prevent path traversal and shell injection.
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'file_' + Date.now();

  // Strip path traversal sequences
  const baseName = fileName.replace(/.*[/\\]/, '');

  // Replace spaces and invalid characters
  const clean = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Prevent multiple consecutive dots
  return clean.replace(/\.{2,}/g, '.').substring(0, 150);
}

/**
 * Validates RFC4122 UUID strings.
 */
export function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Validates allowed MIME types.
 */
export function isValidMimeType(
  mime: string,
  allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
): boolean {
  return allowedMimes.includes(mime.toLowerCase());
}

/**
 * Validates file size in megabytes.
 */
export function isValidFileSize(sizeInBytes: number, maxMegabytes = 5): boolean {
  return sizeInBytes > 0 && sizeInBytes <= maxMegabytes * 1024 * 1024;
}
