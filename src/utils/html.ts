/**
 * Shared HTML escaping utilities for XSS prevention.
 */

/**
 * Escapes special characters in a string for use in HTML content.
 * Escapes &, <, >, ", '
 */
export function escapeHtml(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = typeof value === 'string' ? value : String(value);

  return str.replace(/[&<>"']/g, (match) => {
    switch (match) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return match;
    }
  });
}

/**
 * Escapes special characters in a string for use in HTML attributes.
 * Wrapper around escapeHtml as it covers all necessary characters for quoted attributes.
 */
export function escapeAttribute(value: string | number | boolean | null | undefined): string {
  return escapeHtml(value);
}
