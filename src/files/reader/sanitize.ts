import DOMPurify from 'dompurify'

/** HTML seguro para o leitor: sem scripts, handlers, iframes nem formulários. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'button', 'object', 'embed'],
    FORBID_ATTR: ['style'],
  })
}
