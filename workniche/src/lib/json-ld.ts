/**
 * Serialise structured data for an inline `<script type="application/ld+json">`.
 *
 * `JSON.stringify` alone is NOT safe here: the browser ends a script element at
 * the first `</script>` it sees, even inside a JSON string. Job titles and
 * descriptions are written by employers, so a posting containing
 * `</script><script>…` would otherwise run attacker code for every visitor
 * (stored XSS). Escaping `<`, `>` and `&` as unicode escapes keeps the output
 * valid JSON with the identical value, but removes every sequence the HTML
 * parser could treat as markup. U+2028 / U+2029 are escaped as well because
 * they are line terminators in older JavaScript parsers.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
