/**
 * Input sanitization utilities for XSS prevention.
 * Use these to sanitize user inputs before storing or displaying.
 */

/**
 * Strip HTML tags from a string to prevent XSS.
 * Keeps the text content but removes all HTML markup.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML special characters to prevent XSS.
 * Use this when you need to display user input inside HTML.
 */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Sanitize an object's string values recursively.
 * Strips HTML from all string fields. Useful for sanitizing request bodies.
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = stripHtml(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string'
          ? stripHtml(item)
          : typeof item === 'object' && item !== null
          ? sanitizeObject(item)
          : item
      );
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Validate and sanitize a phone number (keep only digits, +, -, spaces).
 */
export function sanitizePhone(input: string): string {
  return input.replace(/[^\d+\-\s()]/g, '');
}

/**
 * Validate and sanitize an email address.
 * Returns empty string if invalid.
 */
export function sanitizeEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : '';
}

/**
 * Limit string length to prevent excessively large inputs.
 */
export function truncate(input: string, maxLength: number): string {
  return input.length > maxLength ? input.slice(0, maxLength) : input;
}
