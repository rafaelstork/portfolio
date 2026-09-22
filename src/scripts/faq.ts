import gsap from 'gsap';

export function setupFAQ(signal: AbortSignal, reduced: boolean, refresh: () => void) {
  const cleanups: Array<() => void> = [];
  document.querySelectorAll<HTMLDetailsElement>('.faq details').forEach(details => {
    const summary = details.querySelector('summary')!;
    let expanded = details.open;
    let tween: gsap.core.Tween | undefined;
    const settle = () => {
      details.open = expanded;
      details.style.removeProperty('height');
      details.style.removeProperty('overflow');
      delete details.dataset.expanded;
    };
    summary.addEventListener('click', event => {
      event.preventDefault();
      const start = details.getBoundingClientRect().height;
      tween?.kill();
      expanded = !expanded;
      if (reduced) { settle(); refresh(); return; }
      details.dataset.expanded = String(expanded);
      details.open = true;
      details.style.height = 'auto';
      const border = parseFloat(getComputedStyle(details).borderBottomWidth) + parseFloat(getComputedStyle(details).borderTopWidth);
      const end = expanded ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + border;
      details.style.overflow = 'hidden';
      tween = gsap.fromTo(details, {height: start}, {
        height: end, duration: expanded ? .38 : .28, ease: 'power3.out',
        onComplete: () => { settle(); refresh(); }
      });
    }, {signal});
    const resize = () => { if(tween?.isActive()) { tween.kill(); settle(); refresh(); } };
    window.addEventListener('resize', resize, {signal});
    cleanups.push(() => { tween?.kill(); settle(); });
  });
  return () => cleanups.forEach(cleanup => cleanup());
}
