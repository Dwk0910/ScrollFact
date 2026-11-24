/** Keep the element tree stable so server-generated nth-of-type paths still match. */
export function serializeUpload(document: Document): string {
  const clone = document.documentElement.cloneNode(true) as HTMLElement
  clone.querySelectorAll('#scrollfact-root, [data-scrollfact-root]').forEach(node => node.remove())
  clone.classList.remove('scrollfact-open')
  clone.style.removeProperty('--scrollfact-offset')
  clone.querySelectorAll('.scrollfact-active').forEach(node => node.classList.remove('scrollfact-active'))
  for (const element of clone.querySelectorAll('*')) {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name) || ['value', 'checked', 'selected', 'nonce'].includes(attribute.name))
        element.removeAttribute(attribute.name)
    }
  }
  for (const element of clone.querySelectorAll('script, style, noscript, textarea, select, [contenteditable]:not([contenteditable="false"]), [hidden], [aria-hidden="true"]')) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) walker.currentNode.textContent = ''
  }
  return `<!DOCTYPE html>\n${clone.outerHTML}`
}
