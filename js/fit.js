// Text fitting: wrap only at spaces; if a single word does not fit, shrink the font to a minimum,
// then truncate with an ellipsis (the full text stays in the title attribute).
export function fitText(el, { min = 12 } = {}) {
  el.style.fontSize = '';
  el.classList.remove('clip');
  let size = parseFloat(getComputedStyle(el).fontSize);
  let guard = 0;
  while (el.scrollWidth > el.clientWidth + 0.5 && size > min && guard++ < 60) {
    size -= 0.5;
    el.style.fontSize = size + 'px';
  }
  if (el.scrollWidth > el.clientWidth + 0.5) {
    el.classList.add('clip');
    if (!el.title) el.title = el.textContent.trim();
  }
}

export function fitAll(root, selector, opts) {
  root.querySelectorAll(selector).forEach((el) => fitText(el, opts));
}

/** Re-fit when fonts load or the container is resized. */
export function autoFit(root, selector, opts) {
  const run = () => fitAll(root, selector, opts);
  document.fonts?.ready.then(run);
  const ro = new ResizeObserver(run);
  ro.observe(root);
  return () => ro.disconnect();
}
