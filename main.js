/* main.js: St Cecilia interactions on top of motion-core.js (runs only with html.js).
   Sticky header, mega menu (ported from stcecilia-homepage-b), arrow links, Mass-time tabs, seasons carousel. */
(() => {
  if (!window.Motion) return;   // static mode: nothing to do
  const { $, $$, reduce, fine, flush } = Motion;
  const header = $('.site-header');

  /* ---------- sticky header: follows the 40px top bar away, turns solid after it ---------- */
  // top bar height: 40 on desktop, taller on phones (two lines, responsive.css)
  const topbar = $('.topbar');
  let TOPBAR = topbar ? topbar.offsetHeight : 40;
  addEventListener('resize', () => { if (topbar) TOPBAR = topbar.offsetHeight; onScroll(); });
  const onScroll = () => {
    const y = scrollY;
    header.style.setProperty('--hdr-top', Math.max(0, TOPBAR - y) + 'px');
    header.classList.toggle('is-solid', y > TOPBAR || header.classList.contains('menu-open'));
  };
  addEventListener('scroll', onScroll, { passive: true });
  Motion.onScroll(onScroll);
  onScroll();

  /* ---------- mega menu: hover opens on desktop, click toggles, Esc / outside click / leaving the header closes ---------- */
  const mega = $('#mega'), triggers = $$('.nav__trigger');
  let closeT, openedAt = 0;
  // hover opens on a real mouse move over a nav item, not on mouseenter: when the bar slides under a still
  // pointer (scrolling, Esc), Chrome fires mouseenter and a fake mousemove at the same point, and the menu
  // must not pop open by itself
  let px = -1, py = -1;
  addEventListener('mousemove', e => {
    const real = e.clientX !== px || e.clientY !== py;
    px = e.clientX; py = e.clientY;
    const t = real && fine && e.target.closest && e.target.closest('.nav__trigger');
    if (t && t.getAttribute('aria-expanded') !== 'true') open(t);
  }, { passive: true });
  const open = t => {
    clearTimeout(closeT);
    if (t.getAttribute('aria-expanded') !== 'true') openedAt = Date.now();
    triggers.forEach(b => { const on = b === t; b.setAttribute('aria-expanded', on); b.parentElement.classList.toggle('is-open', on); });
    $$('.mega__panel').forEach(p => p.classList.toggle('is-active', p.id === t.dataset.panel));
    mega.classList.add('open');
    header.classList.add('menu-open', 'is-solid');
  };
  const close = () => {
    triggers.forEach(b => { b.setAttribute('aria-expanded', 'false'); b.parentElement.classList.remove('is-open'); });
    mega.classList.remove('open');
    header.classList.remove('menu-open');
    onScroll();
  };
  $$('.mega__links').forEach(l => [...l.children].forEach((c, i) => c.style.setProperty('--i', i)));
  triggers.forEach(t => {
    // hover opens first on desktop, so a click right after it should not close the panel again
    t.addEventListener('click', e => { e.preventDefault(); t.getAttribute('aria-expanded') === 'true' && Date.now() - openedAt > 400 ? close() : open(t); });
  });
  header.addEventListener('mouseleave', () => { closeT = setTimeout(close, 220); });
  header.addEventListener('mouseenter', () => clearTimeout(closeT));
  $$('.mega a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !mega.classList.contains('open')) return;
    const t = $('.nav__trigger[aria-expanded="true"]'); close(); t && t.focus();
  });
  document.addEventListener('click', e => { if (!header.contains(e.target)) close(); });

  /* ---------- arrow links: second arrow for the diagonal slide-through, label span for the underline ---------- */
  $$('.more').forEach(a => {
    const svg = $('svg', a), use = svg && $('use', svg);
    if (!use) return;
    const twin = use.cloneNode(); twin.classList.add('more__in'); svg.appendChild(twin);
    const txt = [...a.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (txt) { const s = document.createElement('span'); s.className = 'more__label'; txt.replaceWith(s); s.appendChild(txt); }
  });

  /* ---------- Mass-time tabs: bar slides, rows swap ---------- */
  const tabs = $$('.tabs [role="tab"]'), list = $('.services'), bar = $('.tabs__bar');
  if (tabs.length && list && bar) {
    const panes = [list.innerHTML.replace(/ data-reveal(="[^"]*")?/g, ''), ...[1, 2, 3].map(i => $(`template[data-tab="${i}"]`).innerHTML)];
    const textW = b => { const r = document.createRange(); r.selectNodeContents(b); return r.getBoundingClientRect().width; };
    const extra = 149 - textW(tabs[0]);   // XD bar = label + side room (149px under "Weekend Mass")
    // below 1240 the tabs lose their fixed XD widths (responsive.css), so the bar sits exactly under the label:
    // the XD side room would run into the next tab
    const xdTabs = matchMedia('(min-width: 1240px)');
    const place = b => {
      const xd = xdTabs.matches;
      bar.style.translate = `${xd ? b.offsetLeft - tabs[0].offsetLeft : b.offsetLeft}px 0`;
      bar.style.width = (textW(b) + (xd ? extra : 0)) + 'px';
    };
    let cur = 0, busy = false;
    place(tabs[0]);
    if (document.fonts) document.fonts.ready.then(() => place(tabs[cur]));
    addEventListener('resize', () => place(tabs[cur]));
    tabs.forEach((t, k) => { t.tabIndex = k === 0 ? 0 : -1; t.setAttribute('aria-controls', 'services'); });
    list.id = 'services';
    const select = (i, focus) => {
      if (i === cur || busy) return;
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; });
      if (focus) tabs[i].focus({ preventScroll: true });
      place(tabs[i]);
      // narrow screens: the tab list scrolls sideways (responsive.css), bring the chosen tab into view
      const tl = tabs[i].parentElement;
      if (tl.scrollWidth > tl.clientWidth) tl.scrollTo({ left: Math.max(0, tabs[i].offsetLeft - 24), behavior: reduce ? 'auto' : 'smooth' });
      cur = i;
      if (reduce) { list.innerHTML = panes[i]; return; }
      busy = true;
      list.classList.add('is-out');
      setTimeout(() => {   // setTimeout, not rAF: it must finish in a background tab too
        list.innerHTML = panes[i];
        list.classList.remove('is-out');
        $$('.service', list).forEach((li, k) => { li.style.setProperty('--i', k); li.classList.add('is-enter'); });
        busy = false;
      }, 260);
    };
    tabs.forEach((t, k) => {
      t.addEventListener('click', () => select(k));
      t.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); select((cur + d + tabs.length) % tabs.length, true); }
      });
    });
  }

  /* ---------- seasons carousel: one card per click, loops at both ends, drag/swipe ---------- */
  const track = $('.seasons__track'), more = $('#season-more');
  if (track && more) {
    track.append(more.content.cloneNode(true));
    // one card + gap (490 at 1440; smaller cards on tablet and phone, responsive.css)
    const STEP = () => { const c = track.children; return c.length > 1 ? c[1].offsetLeft - c[0].offsetLeft : 490; };
    const maxX = () => Math.max(0, track.scrollWidth - track.parentElement.clientWidth);   // last card lands on the content edge
    const stops = () => Math.ceil(maxX() / STEP());
    let idx = 0, x = 0;
    const go = i => {
      const n = stops();
      idx = (i + n + 1) % (n + 1);
      x = Math.min(idx * STEP(), maxX());
      track.style.translate = `${-x}px 0`;
    };
    addEventListener('resize', () => go(Math.min(idx, stops())));
    const [prev, next] = $$('.seasons__arrows button');
    prev.addEventListener('click', () => go(idx - 1));
    next.addEventListener('click', () => go(idx + 1));
    track.setAttribute('aria-roledescription', 'carousel');

    let startX = null, dx = 0;
    track.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      startX = e.clientX; dx = 0;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', e => {
      if (startX === null) return;
      dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { track.classList.add('is-drag'); track.style.translate = `${-x + dx}px 0`; }
    });
    const end = () => {
      if (startX === null) return;
      startX = null;
      track.classList.remove('is-drag');
      if (dx < -60 && idx < stops()) go(idx + 1);
      else if (dx > 60 && idx > 0) go(idx - 1);
      else go(idx);
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
  }

  /* ---------- page bottom: reveal whatever is still waiting ----------
     The core reveal needs an item to clear a 6% margin above the viewport bottom. On tall windows (1100px+) the
     footer's last line never gets that high, because the page can't scroll further, so it stayed invisible. */
  const atBottom = () => {
    if (scrollY + innerHeight < document.documentElement.scrollHeight - 4) return;
    $$('[data-reveal]:not(.is-in)').forEach((el, i) => {
      el.style.setProperty('--rd', Math.min(i, 6) * 90 + 'ms');
      el.classList.add('is-in');
      setTimeout(() => { el.removeAttribute('data-reveal'); el.style.removeProperty('--rd'); }, 1700);
    });
  };
  addEventListener('scroll', atBottom, { passive: true });
  Motion.onScroll(atBottom);
  atBottom();

  /* ---------- counter: keep the caption from shifting while the number counts up ---------- */
  const stat = $('.hub__stat strong');
  if (stat) (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { stat.style.minWidth = stat.getBoundingClientRect().width + 'px'; });
})();
