/* responsive.js: the menu drawer below 1280px. Works with motion on or off (a feature, not motion).
   The drawer is built from the mega menu markup in index.html, so the links live in one place:
   each nav item becomes an accordion with its mega panel's links. Native <dialog>: focus stays inside,
   Esc closes, focus returns to the menu button. Loads before modal.js, so drawer links with data-modal
   (Watch Live, Join Saint Cecilia) get wired to their dialogs like every other trigger. */
(() => {
  const root = document.documentElement;
  const burger = document.querySelector('.burger');
  const mega = document.getElementById('mega');
  if (!burger || !mega || typeof HTMLDialogElement !== 'function') return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lenis = on => { if (window.Motion && Motion.lenis) Motion.lenis[on ? 'start' : 'stop'](); };

  /* ---------- build ---------- */
  const groups = [...document.querySelectorAll('.nav__trigger')].map((t, i) => {
    const panel = document.getElementById(t.dataset.panel);
    const links = panel ? [...panel.querySelectorAll('.mega__links a')].map(a => {
      const label = [...a.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
      const modal = a.dataset.modal ? ` data-modal="${esc(a.dataset.modal)}"` : '';
      return `<li><a href="${esc(a.getAttribute('href') || '#')}"${modal}>${esc(label)}</a></li>`;
    }).join('') : '';
    return `<details style="--i:${i}"><summary>${esc(t.textContent.trim())}<svg aria-hidden="true"><use href="#i-chev"/></svg></summary><ul class="drawer__links">${links}</ul></details>`;
  }).join('');
  const hours = document.querySelector('.site-header__hours');
  const address = [...document.querySelectorAll('.site-footer address span')].map(s => s.textContent.trim());

  const drawer = document.createElement('dialog');
  drawer.className = 'drawer';
  drawer.id = 'drawer';
  drawer.setAttribute('aria-label', 'Menu');
  drawer.setAttribute('data-lenis-prevent', '');
  drawer.innerHTML = `
    <div class="drawer__top">
      <a class="drawer__logo" href="/"><img src="images/logo-tab.svg" alt="Saint Cecilia Parish" width="140" height="63"></a>
      <button class="drawer__close" type="button" aria-label="Close menu"><svg aria-hidden="true"><use href="#i-close"/></svg></button>
    </div>
    <nav class="drawer__nav" aria-label="Main">${groups}</nav>
    <div class="drawer__actions" style="--i:7">
      <a class="btn btn--gold" href="#" data-modal="live"><span class="live-dot"></span>Watch Mass Live</a>
      <a class="btn btn--outline" href="#">Give</a>
    </div>
    <p class="drawer__info">${hours ? esc(hours.textContent.trim()) + '<br>' : ''}${esc(address.join(' · '))}</p>`;
  document.body.appendChild(drawer);

  /* ---------- open / close ---------- */
  const open = () => {
    if (drawer.open) return;
    drawer.showModal();
    drawer.scrollTop = 0;
    burger.setAttribute('aria-expanded', 'true');
    root.classList.add('modal-open');
    lenis(false);
  };
  const close = () => {
    if (!drawer.open || drawer.classList.contains('is-closing')) return;
    const done = () => { drawer.classList.remove('is-closing'); drawer.close(); };
    if (reduce || !root.classList.contains('js')) return done();
    drawer.classList.add('is-closing');
    setTimeout(done, 280);   // matches drawer-out in responsive.css
  };
  drawer.addEventListener('close', () => {
    burger.setAttribute('aria-expanded', 'false');
    if (!document.querySelector('dialog.modal[open]')) { root.classList.remove('modal-open'); lenis(true); }
    burger.focus({ preventScroll: true });
    drawer.querySelectorAll('details[open]').forEach(d => { d.open = false; });
  });
  burger.addEventListener('click', open);
  drawer.querySelector('.drawer__close').addEventListener('click', close);
  drawer.addEventListener('cancel', e => { e.preventDefault(); close(); });   // Esc: slide out instead of snapping shut
  drawer.addEventListener('click', e => { if (e.target === drawer) close(); });   // backdrop

  // one accordion open at a time
  drawer.querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) drawer.querySelectorAll('details[open]').forEach(o => { if (o !== d) o.open = false; });
  }));

  // a link closes the drawer. A link that opens a dialog (data-modal) hands focus back to the menu button
  // when that dialog closes, since the link itself is gone by then.
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    if (a.closest('.drawer__top')) return;
    if (a.dataset.modal) setTimeout(() => { const d = document.getElementById(a.dataset.modal + '-modal'); if (d) d._opener = burger; });
    close();
  }));

  // growing past the drawer breakpoint (tablet rotated, window resized) closes it
  const wide = matchMedia('(min-width: 1280px)');
  const onWide = () => { if (wide.matches) close(); };
  wide.addEventListener ? wide.addEventListener('change', onWide) : wide.addListener(onWide);
})();
