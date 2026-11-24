/** Keep the element tree stable so server-generated nth-of-type paths still match. */
export function serializeUpload(document: Document): string {
  const clone = document.documentElement.cloneNode(true) as HTMLElement
  const images = document.querySelectorAll('img')
  clone.querySelectorAll('img').forEach((image, index) => {
    const original = images[index]
    const url = original?.currentSrc || original?.dataset.src || original?.src
    if (url && /^https?:\/\//i.test(url)) image.setAttribute('data-scrollfact-image-src', url)
    const rect = original?.getBoundingClientRect()
    // Tiny rendered icons and tracking pixels are not article illustrations.
    if (rect && rect.width > 0 && rect.height > 0 && rect.width <= 48 && rect.height <= 48)
      image.setAttribute('data-scrollfact-image-decorative', 'true')
  })
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
  // XML keeps script-inserted block children inside p intact on the server.
  return `<!--scrollfact-dom-v1-->${new XMLSerializer().serializeToString(clone)}`
}
