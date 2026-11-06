/* modal.js: the page's dialogs (live stream, join the parish). Runs with motion on or off (features, not motion).
   Native <dialog>: focus stays inside, Esc closes, focus returns to the button that opened it.
   A trigger opens the dialog whose id is "<name>-modal":  <a href="#" data-modal="join">  ->  #join-modal */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dialogs = [...document.querySelectorAll('dialog.modal')];
  if (!dialogs.length || typeof dialogs[0].showModal !== 'function') return;
  const lenis = on => { if (window.Motion && Motion.lenis) Motion.lenis[on ? 'start' : 'stop'](); };

  /* ---------- shared open / close ---------- */
  const close = dlg => {
    if (!dlg.open || dlg.classList.contains('is-closing')) return;
    const done = () => { dlg.classList.remove('is-closing'); dlg.close(); };
    if (reduce || !root.classList.contains('js')) return done();
    dlg.classList.add('is-closing');
    setTimeout(done, 260);   // matches the closing animation in animations.css
  };
  dialogs.forEach(dlg => {
    const name = dlg.id.replace(/-modal$/, '');
    dlg.addEventListener('close', () => {
      if (dlg._onClose) dlg._onClose();
      root.classList.remove('modal-open');
      lenis(true);   // smooth scroll was stopped so the page behind stays put
      if (dlg._opener) dlg._opener.focus({ preventScroll: true });
    });
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(dlg); });   // Esc: animate out instead of snapping shut
    dlg.addEventListener('click', e => { if (e.target === dlg) close(dlg); });   // the dialog box itself = the backdrop area
    dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(dlg)));
    document.querySelectorAll(`[data-modal="${name}"]`).forEach(t => {
      t.setAttribute('aria-haspopup', 'dialog');
      t.addEventListener('click', e => {
        e.preventDefault();
        dlg._opener = t;
        dlg.scrollTop = 0;
        dlg.showModal();
        root.classList.add('modal-open');
        lenis(false);
        if (dlg._onOpen) dlg._onOpen();
      });
    });
  });

  /* ---------- live stream: YouTube loads only after the visitor clicks play ---------- */
  // SAMPLE stream from the client (2026-11-05). Swap the id in data-youtube for the parish's real live stream.
  const live = document.getElementById('live-modal');
  const player = live && live.querySelector('.live-modal__player'), play = live && live.querySelector('.live-modal__play');
  if (player && play) {
    play.addEventListener('click', () => {
      const id = player.dataset.youtube;
      if (!id || player.querySelector('iframe')) return;
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
      f.title = 'Sunday Solemn Mass live stream';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      player.appendChild(f);
      player.classList.add('is-playing');
      // keep focus in the page, not in the YouTube frame: keys typed inside the frame (Esc) never reach the dialog
      live.querySelector('.modal__close').focus();
    });
    live._onClose = () => {   // closing must stop the sound
      const f = player.querySelector('iframe');
      if (f) f.remove();
      player.classList.remove('is-playing');
    };
  }

  /* ---------- join form ----------
     Errors show after a field is left (not while typing the first time), then update as the visitor fixes them.
     On submit, a summary at the top lists every problem with a link to the field.
     Closing the dialog keeps what was typed, so an accidental Esc loses nothing. */
  const join = document.getElementById('join-modal');
  const form = join && join.querySelector('#join-form');
  if (form) {
    const fields = [...form.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), select')];
    const summary = form.querySelector('.join-form__errors');
    const done = join.querySelector('.join-done');
    let sent = false;

    const problem = el => {
      const v = el.value.trim();
      if (el.required && !v) return el.dataset.msg || 'This field is required';
      if (!v) return '';
      if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return el.dataset.typeMsg;
      if (el.type === 'tel' && v.replace(/\D/g, '').length < 10) return el.dataset.typeMsg;
      if (el.pattern && !new RegExp(`^(?:${el.pattern})$`).test(v)) return el.dataset.typeMsg;
      return '';
    };
    const check = el => {
      const msg = problem(el);
      const err = document.getElementById(`${el.id}-err`);
      if (err) err.textContent = msg;
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      return msg;
    };
    fields.forEach(el => {
      el.addEventListener('blur', () => { if (el.value.trim() || el.dataset.touched) { el.dataset.touched = '1'; check(el); } });
      el.addEventListener('input', () => { if (el.dataset.touched) check(el); });
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const bad = fields.map(el => { el.dataset.touched = '1'; return [el, check(el)]; }).filter(([, m]) => m);
      if (bad.length) {
        summary.innerHTML = `<strong>Please check ${bad.length === 1 ? 'this field' : `these ${bad.length} fields`}:</strong><ul>` +
          bad.map(([el, m]) => `<li><a href="#${el.id}">${m}</a></li>`).join('') + '</ul>';
        summary.hidden = false;
        summary.querySelectorAll('a').forEach(a => a.addEventListener('click', ev => {
          ev.preventDefault();
          const el = document.getElementById(a.getAttribute('href').slice(1));
          el.focus(); el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
        }));
        summary.focus();
        summary.scrollIntoView({ block: 'center' });
        return;
      }
      summary.hidden = true;
      // PLACEHOLDER: send new FormData(form) to the parish backend here (Netlify Forms, CRM or email).
      sent = true;
      const first = form.querySelector('#jf-first').value.trim();
      done.querySelector('[data-name]').textContent = first ? `, ${first}` : '';
      form.hidden = true;
      done.hidden = false;
      join.scrollTop = 0;
      done.focus();
    });

    join._onClose = () => {
      if (!sent) return;   // keep unsent entries
      sent = false;
      form.reset();
      fields.forEach(el => { delete el.dataset.touched; el.removeAttribute('aria-invalid'); });
      form.querySelectorAll('.field__error').forEach(p => { p.textContent = ''; });
      summary.hidden = true;
      form.hidden = false;
      done.hidden = true;
    };
  }
})();
