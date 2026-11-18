/* FAANAK Group website — interactions. No dependencies. Designed by graphcent.com */
(() => {
  'use strict';
  const doc = document.documentElement;
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------------------------------------------------------------- split text
     Words (or letters inside words) become spans for the staggered entrance.
     The original text stays available to assistive tech through aria-label. */
  function split(el) {
    const mode = el.dataset.split;
    const label = el.innerHTML.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', label);
    let i = 0;
    const walk = (node, out) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(' ')); return; }
            const word = document.createElement('span');
            word.setAttribute('aria-hidden', 'true');
            if (mode === 'chars') {
              word.className = 'split-word';
              [...part].forEach((ch) => {
                const c = document.createElement('span');
                c.className = 'split-c';
                c.style.setProperty('--i', i++);
                c.textContent = ch;
                word.appendChild(c);
              });
            } else {
              word.className = 'split-w';
              word.style.setProperty('--i', i++);
              word.textContent = part;
            }
            out.appendChild(word);
          });
        } else if (n.nodeName === 'BR') {
          out.appendChild(document.createElement('br'));
        } else {
          const clone = n.cloneNode(false);
          walk(n, clone);
          out.appendChild(clone);
        }
      });
    };
    const frag = document.createDocumentFragment();
    walk(el, frag);
    el.textContent = '';
    el.appendChild(frag);
  }
  $$('[data-split]').forEach(split);
  doc.classList.add('ready');
  $$('[data-stagger]').forEach((list) => [...list.children].forEach((c, i) => c.style.setProperty('--i', i)));

  /* ---------------------------------------------------------------- reveal on scroll (once) */
  // Clip-path reveals start fully clipped, and Chrome treats a fully clipped target as never
  // intersecting, so those are observed through their parent instead.
  const targets = $$('[data-split], [data-reveal]:not([data-reveal="clip"]), [data-stagger], .process__lanes');
  const clipMap = new Map();
  $$('[data-reveal="clip"]').forEach((el) => {
    const host = el.parentElement;
    if (!clipMap.has(host)) { clipMap.set(host, []); targets.push(host); }
    clipMap.get(host).push(el);
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (clipMap.has(e.target)) clipMap.get(e.target).forEach((el) => el.classList.add('is-in'));
        if (e.target.matches('[data-split], [data-reveal], [data-stagger], .process__lanes')) e.target.classList.add('is-in');
        if (e.target.matches('[data-count]') || e.target.querySelector('[data-count]')) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
  } else {
    targets.forEach((t) => t.classList.add('is-in'));
    clipMap.forEach((els) => els.forEach((el) => el.classList.add('is-in')));
  }
  // Hero plays on load, after fonts are ready so letters don't shift mid-animation.
  const hero = $('.hero');
  const startHero = () => requestAnimationFrame(() => hero && hero.classList.add('is-in'));
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(startHero);
  setTimeout(startHero, 1200);

  /* ---------------------------------------------------------------- counters */
  function countUp(scope) {
    $$('[data-count]', scope).concat(scope.matches('[data-count]') ? [scope] : []).forEach((el) => {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      const end = parseInt(el.dataset.count, 10);
      const pad = parseInt(el.dataset.pad || '0', 10);
      const fmt = new Intl.NumberFormat(undefined, { useGrouping: false, minimumIntegerDigits: pad || 1 });
      if (reduceMQ.matches) { el.textContent = fmt.format(end); return; }
      const start = end > 100 ? end - 25 : 0;
      const dur = 1100;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = fmt.format(Math.round(start + (end - start) * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  $$('.stat, .about__box').forEach((box) => {
    if (!('IntersectionObserver' in window)) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { countUp(box); o.disconnect(); } }, { threshold: 0.4 });
    o.observe(box);
  });

  /* ---------------------------------------------------------------- header */
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------------------------------------------------------- mobile menu */
  const menuBtn = $('[data-menu-btn]');
  const menu = $('[data-menu]');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      header.classList.add('is-solid');
      document.body.style.overflow = 'hidden';
    } else {
      menu.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => { if (menuBtn.getAttribute('aria-expanded') === 'false') menu.hidden = true; }, 220);
      onScroll();
    }
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------------------------------------------------------------- accordions */
  $$('[data-acc]').forEach((acc) => {
    const items = $$('[data-acc-item]', acc);
    const useHash = acc.hasAttribute('data-acc-hash');
    const setOpen = (item, open, { updateHash = true } = {}) => {
      item.classList.toggle('is-open', open);
      $('.acc__btn', item).setAttribute('aria-expanded', String(open));
      if (useHash && updateHash && open) history.replaceState(null, '', '#' + item.id);
    };
    items.forEach((item) => {
      setOpen(item, item.hasAttribute('data-open'), { updateHash: false });
      $('.acc__btn', item).addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        if (useHash) items.forEach((o) => o !== item && setOpen(o, false));
        setOpen(item, open);
      });
    });
    if (useHash) {
      const fromHash = () => {
        const hit = items.find((i) => '#' + i.id === location.hash);
        if (!hit) return;
        items.forEach((o) => setOpen(o, o === hit, { updateHash: false }));
      };
      fromHash();
      window.addEventListener('hashchange', fromHash);
    }
  });

  /* ---------------------------------------------------------------- tabs (how we work) */
  $$('[data-tabs]').forEach((wrap) => {
    const tabs = $$('[role="tab"]', wrap);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (on) {
          panel.hidden = false;
          panel.classList.remove('is-entering');
          void panel.offsetWidth; // restart the entrance animation for the newly shown panel
          panel.classList.add('is-entering');
        } else {
          panel.hidden = true;
        }
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t, false));
      t.addEventListener('keydown', (e) => {
        const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        if (e.key in keys) { e.preventDefault(); select(tabs[(i + keys[e.key] + tabs.length) % tabs.length], true); }
        if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
  });

  /* ---------------------------------------------------------------- marquee pause */
  $$('[data-marquee]').forEach((m) => {
    const btn = $('[data-pause]', m);
    if (!btn) return;
    const base = btn.getAttribute('aria-label');
    btn.addEventListener('click', () => {
      const paused = m.classList.toggle('is-paused');
      btn.setAttribute('aria-pressed', String(paused));
      btn.setAttribute('aria-label', paused ? base.replace('Pause', 'Play') : base);
    });
  });

  /* ---------------------------------------------------------------- contact form → email app */
  const form = $('[data-form]');
  if (form) {
    const rules = {
      name: (v) => v.trim().length > 1 || 'Enter your name so we know who is writing.',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Enter an email address like name@company.com.',
      message: (v) => v.trim().length > 4 || 'Tell us what you need, even in one line.',
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let first = null;
      Object.entries(rules).forEach(([name, test]) => {
        const input = form.elements[name];
        const res = test(input.value);
        const err = document.getElementById(input.id + '-err');
        const bad = res !== true;
        input.setAttribute('aria-invalid', String(bad));
        if (bad) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby');
        err.textContent = bad ? res : '';
        if (bad && !first) first = input;
      });
      if (first) { first.focus(); return; }
      const company = form.elements.company.value;
      const subject = `Enquiry: ${company}`;
      const body = `${form.elements.message.value.trim()}\n\n${form.elements.name.value.trim()}\n${form.elements.email.value.trim()}`;
      window.location.href = `mailto:info@faanakgroup.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  /* ---------------------------------------------------------------- year */
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
})();
