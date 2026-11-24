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


  /* ---------------------------------------------------------------- companies dropdown */
  $$('[data-dd]').forEach((dd) => {
    const btn = $('[data-dd-btn]', dd);
    const panel = $('[data-dd-panel]', dd);
    let closeT;
    const set = (open) => {
      clearTimeout(closeT);
      btn.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
      if (open) header.classList.add('is-solid'); else onScroll();
    };
    const isOpen = () => btn.getAttribute('aria-expanded') === 'true';
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    let hoverOpened = false; // a click right after hover-open should keep the panel open, not toggle it shut
    btn.addEventListener('click', () => {
      if (hoverOpened && isOpen()) { hoverOpened = false; return; }
      set(!isOpen());
    });
    dd.addEventListener('pointerenter', () => {
      if (!fine.matches) return;
      clearTimeout(closeT); // coming back before the grace period ends keeps it open
      if (!isOpen()) { hoverOpened = true; set(true); }
    });
    // a short grace period forgives a pointer that cuts a corner on its way to the cards
    dd.addEventListener('pointerleave', () => { hoverOpened = false; if (fine.matches) closeT = setTimeout(() => set(false), 280); });
    dd.addEventListener('focusout', (e) => { if (!dd.contains(e.relatedTarget)) set(false); });
    document.addEventListener('click', (e) => { if (isOpen() && !dd.contains(e.target)) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) { set(false); btn.focus(); } });
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  });

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
  window.matchMedia('(min-width: 1121px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------------------------------------------------------------- accordions */
  $$('[data-acc]').forEach((acc) => {
    const items = $$('[data-acc-item]', acc);
    const stage = acc.closest('[data-scrolly]');
    const setOpen = (item, open) => {
      item.classList.toggle('is-open', open);
      $('.acc__btn', item).setAttribute('aria-expanded', String(open));
    };
    acc._setOpen = setOpen;
    items.forEach((item, i) => {
      setOpen(item, item.hasAttribute('data-open'));
      $('.acc__btn', item).addEventListener('click', () => {
        if (stage && stage.classList.contains('is-on')) { stage._goTo(i); return; }
        setOpen(item, !item.classList.contains('is-open'));
      });
    });
    // Small screens: each company opens as it scrolls into view (and stays open).
    if (stage && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || stage.classList.contains('is-on')) return;
          const item = e.target.closest('[data-acc-item]');
          if (!item.dataset.autoOpened) { item.dataset.autoOpened = '1'; setOpen(item, true); }
        });
      }, { rootMargin: '0px 0px -35% 0px', threshold: 0 });
      items.forEach((item) => io.observe($('.acc__h', item)));
    }
  });

  /* ---------------------------------------------------------------- tabs (how we work) */
  $$('[data-tabs]').forEach((wrap) => {
    const tabs = $$('[role="tab"]', wrap);
    const stage = wrap.closest('[data-scrolly]');
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        const was = t.getAttribute('aria-selected') === 'true';
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panel.hidden = !on;
        if (on && !was) {
          panel.classList.remove('is-entering');
          void panel.offsetWidth; // restart the entrance animation for the newly shown panel
          panel.classList.add('is-entering');
        }
      });
      if (focus) tab.focus({ preventScroll: true });
    };
    wrap._select = select;
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => {
        if (stage && stage.classList.contains('is-on')) { stage._goTo(i); return; }
        select(t, false);
      });
      t.addEventListener('keydown', (e) => {
        const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        let next = null;
        if (e.key in keys) next = (i + keys[e.key] + tabs.length) % tabs.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        if (stage && stage.classList.contains('is-on')) { stage._goTo(next); tabs[next].focus({ preventScroll: true }); }
        else select(tabs[next], true);
      });
    });
  });

  /* ---------------------------------------------------------------- scroll-driven stages
     Large screens: the section pins and scrolling steps through its items.
     Smaller or short screens: companies open as they scroll in; How We Work stacks into cards. */
  const bigMQ = window.matchMedia('(min-width: 1024px) and (min-height: 720px)');
  $$('[data-scrolly]').forEach((sec) => {
    const type = sec.dataset.scrolly;
    const steps = parseInt(sec.style.getPropertyValue('--steps'), 10) || 3;
    const counter = $('[data-scrolly-n]', sec);
    const acc = $('[data-acc]', sec);
    const tabsWrap = $('[data-tabs]', sec);
    const items = type === 'acc' ? $$('[data-acc-item]', sec) : $$('[role="tab"]', sec);
    let top = 0, span = 1, current = -1, ticking = false;
    const measure = () => {
      const r = sec.getBoundingClientRect();
      top = r.top + window.scrollY;
      span = Math.max(1, sec.offsetHeight - window.innerHeight);
    };
    const activate = (i) => {
      if (i === current) return;
      current = i;
      if (counter) counter.textContent = String(i + 1).padStart(2, '0');
      if (type === 'acc') items.forEach((it, k) => acc._setOpen(it, k === i));
      else tabsWrap._select(items[i], false);
    };
    const update = () => {
      ticking = false;
      if (!sec.classList.contains('is-on')) return;
      const p = (window.scrollY - top) / span;
      activate(Math.max(0, Math.min(steps - 1, Math.floor(p * steps))));
    };
    sec._goTo = (i) => {
      window.scrollTo({ top: top + ((i + 0.5) / steps) * span, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
    };
    const setMode = () => {
      const on = bigMQ.matches;
      sec.classList.toggle('is-on', on);
      if (type === 'tabs') sec.classList.toggle('is-stacked', !on);
      current = -1;
      measure();
      if (on) update();
    };
    setMode();
    bigMQ.addEventListener('change', setMode);
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); update(); }, 120); });
    window.addEventListener('load', () => { measure(); update(); });
  });


  /* ---------------------------------------------------------------- filters (careers, insights) */
  $$('[data-filter]').forEach((box) => {
    const btns = $$('[data-filter-btn]', box);
    const items = $$('[data-cat]', box);
    const status = $('[data-filter-status]', box);
    const noun = status ? status.dataset.noun : 'item';
    btns.forEach((b) => b.addEventListener('click', () => {
      const v = b.dataset.filterBtn;
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      let n = 0;
      items.forEach((it) => {
        const show = v === 'all' || it.dataset.cat === v;
        it.hidden = !show;
        if (show) {
          n += 1;
          it.classList.remove('is-entering');
          void it.offsetWidth; // restart the short fade for items that stay or return
          it.classList.add('is-entering');
        }
      });
      if (status) status.textContent = `Showing ${n} ${noun}${n === 1 ? '' : 's'}`;
    }));
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
