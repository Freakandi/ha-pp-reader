/**
 * Shared HTML escaping utilities for XSS prevention.
 */
/**
 * Escapes special characters in a string for use in HTML content.
 * Escapes &, <, >, ", '
 */
export declare function escapeHtml(value: string | number | boolean | null | undefined): string;
/**
 * Escapes special characters in a string for use in HTML attributes.
 * Wrapper around escapeHtml as it covers all necessary characters for quoted attributes.
 */
export declare function escapeAttribute(value: string | number | boolean | null | undefined): string;
//# sourceMappingURL=html.d.ts.map