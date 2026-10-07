/* 3 سنوات من الإبادة — square fields. One square = one unit, drawn in reading order (right → left). */
(() => {
  const root = getComputedStyle(document.documentElement);
  const colour = (v) => (v && v.startsWith('--') ? root.getPropertyValue(v).trim() : v) || '#000';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = () => Math.min(window.devicePixelRatio || 1, 3);
  const snap = (v, d) => Math.round(v * d) / d;

  function sizeCanvas(c, w, h) {
    const d = DPR();
    c.width = Math.round(w * d); c.height = Math.round(h * d);
    c.style.width = w + 'px'; c.style.height = h + 'px';
    const x = c.getContext('2d');
    x.setTransform(d, 0, 0, d, 0, 0);
    return x;
  }
  const gapFor = (p, d) => Math.max(1 / d, snap(p * 0.2, d));

  /* ---------- small fields (journalists, health workers, children) ---------- */
  function field(c) {
    const n = +c.dataset.n, hi = +(c.dataset.hi || n), maxh = +(c.dataset.maxh || 1e9);
    const par = c.parentElement, cs = getComputedStyle(par);
    const W = Math.floor(par.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    if (!W) return;
    const d = DPR();
    const phone = W < 600;
    let p = +(c.dataset.p || 8) * (phone ? 0.6 : 1);
    const lim = phone ? Math.min(maxh, 260) : maxh, floor = phone ? Math.max(1.5, 2 / d) : 2.5;
    const fits = (p) => Math.ceil(n / Math.floor(W / p)) * p <= lim;
    while (p > floor && !fits(p)) p -= 0.25;
    p = snap(p, d);
    const cols = Math.floor(W / p), rows = Math.ceil(n / cols), H = rows * p;
    const off = snap((W - cols * p) / 2, d);
    const x = sizeCanvas(c, W, H), g = gapFor(p, d), s = p - g;
    const a = colour(c.dataset.c || '--ink'), b = colour('--dust');
    x.fillStyle = a;
    for (let i = 0; i < n; i++) {
      if (i === hi) x.fillStyle = b;
      x.fillRect(W - off - (i % cols + 1) * p + g, Math.floor(i / cols) * p, s, s);
    }
  }
  const fields = [...document.querySelectorAll('canvas.field')];
  const drawFields = () => fields.forEach(field);

  /* ---------- hero: every person killed, flowing around the title card ---------- */
  const host = document.querySelector('.hero');
  let heroW = 0, plan = null, raf = 0;

  function planHero() {
    const c = host.querySelector('canvas'), card = host.querySelector('.hero-card');
    const N = +c.dataset.n, d = DPR();
    host.style.height = '';
    const W = Math.floor(host.clientWidth), H0 = host.clientHeight;
    const hr = host.getBoundingClientRect(), r = card.getBoundingClientRect();
    const pad = W < 700 ? 10 : 18;
    const hole = { l: r.left - hr.left - pad, t: r.top - hr.top - pad, r: r.right - hr.left + pad, b: r.bottom - hr.top + pad };
    const holeA = (hole.r - hole.l) * (hole.b - hole.t);
    const minP = Math.max(2 / d, +c.dataset.minp || (W < 700 ? 1.4 : 5)), grow = c.dataset.grow !== '0';
    const build = (p) => {
      const cols = Math.floor(W / p), off = snap((W - cols * p) / 2, d), xs = new Float32Array(N), ys = new Float32Array(N);
      let i = 0, y = 0;
      for (let row = 0; i < N && row < 1e5; row++, y = row * p) {
        for (let k = 0; k < cols && i < N; k++) {
          const x = W - off - (k + 1) * p;
          if (x + p > hole.l && x < hole.r && y + p > hole.t && y < hole.b) continue;
          xs[i] = x; ys[i] = y; i++;
        }
      }
      return { xs, ys, p, bottom: ys[N - 1] + p };
    };
    let p = Math.max(minP, Math.sqrt(Math.max(1, W * H0 - holeA) / N));
    let b = build(p);
    while (b.bottom > H0 && p > minP) { p = Math.max(minP, p - 0.1); b = build(p); }
    const H = grow ? Math.max(H0, Math.ceil(b.bottom)) : H0;
    if (H > H0) host.style.height = H + 'px';
    const x = sizeCanvas(c, W, H);
    x.fillStyle = colour('--ink');
    const g = gapFor(p, d);
    return { ...b, N, x, s: p - g, g, f: tones(b, W, H, hole) };
  }

  /* the squares double as a halftone: each one's size follows the photo's tone at its place */
  let photo = null;
  function tones({ xs, ys, p }, W, H, hole) {
    const N = xs.length, f = new Float32Array(N).fill(1);
    if (!photo) return f;
    const cw = Math.ceil(W / p), ch = Math.ceil(H / p);
    const oc = document.createElement('canvas'); oc.width = cw; oc.height = ch;
    const ox = oc.getContext('2d', { willReadFrequently: true });
    const iw = photo.naturalWidth, ih = photo.naturalHeight;
    const side = hole.l > W * 0.4;                       // card on the right (wide screens)
    const vh = Math.min(H, window.innerHeight || H);
    const fx = 0.5, fy = 0.42;                           // the face sits a little above centre
    let sc, lx, ly;
    if (side) {                                          // portrait beside the card, within the first screen
      sc = Math.min((vh * 1.12) / ih, (hole.l * 1.05) / iw);
      lx = hole.l / 2 - fx * iw * sc;
      ly = vh * 0.5 - fy * ih * sc;
    } else {                                             // portrait straight under the card
      sc = (W * 1.2) / iw;
      lx = W / 2 - fx * iw * sc;
      ly = Math.min(hole.b, H) - 0.04 * ih * sc;
    }
    const dw = iw * sc, dh = ih * sc;
    const k = 1 / p, BG = '#1f1f1f';
    ox.fillStyle = BG; ox.fillRect(0, 0, cw, ch);
    ox.drawImage(photo, lx * k, ly * k, dw * k, dh * k);
    // melt the photo into the dark ground with a soft oval, so no rectangle edge shows
    const cx = (lx + fx * dw) * k, cy = (ly + fy * dh) * k, rr = Math.max(dw, dh) * k;
    ox.save(); ox.translate(cx, cy); ox.scale(dw / Math.max(dw, dh), dh / Math.max(dw, dh));
    const vg = ox.createRadialGradient(0, 0, rr * 0.24, 0, 0, rr * 0.49);
    vg.addColorStop(0, 'rgba(31,31,31,0)'); vg.addColorStop(1, BG);
    ox.fillStyle = vg; ox.fillRect(-cw * 4, -ch * 4, cw * 8, ch * 8); ox.restore();
    let px;
    try { px = ox.getImageData(0, 0, cw, ch).data; } catch (e) { return f; }
    for (let i = 0; i < N; i++) {
      const c = Math.min(cw - 1, Math.floor((xs[i] + p / 2) / p)), r = Math.min(ch - 1, Math.floor((ys[i] + p / 2) / p));
      const L = px[(r * cw + c) * 4] / 255;
      f[i] = 0.2 + 0.8 * Math.pow(1 - L, 1.05);
    }
    return f;
  }

  function drawRange(from, to) {
    const { xs, ys, x, s, g, f } = plan, D = DPR();
    for (let i = from; i < to; i++) {
      const q = Math.max(1 / D, snap(s * f[i], D)), o = (s - q) / 2;
      x.fillRect(snap(xs[i] + g + o, D), snap(ys[i] + o, D), q, q);
    }
  }

  function heroStatic() {
    plan = planHero();
    drawRange(0, plan.N);
  }

  function heroAnimate() {
    plan = planHero();
    const out = host.querySelector('[data-count]');
    const fmt = new Intl.NumberFormat('en-US');
    const dur = 5200, t0 = performance.now();
    let drawn = 0;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const target = t >= 1 ? plan.N : Math.floor(ease(t) * plan.N);
      drawRange(drawn, target); drawn = target;
      out.textContent = fmt.format(target);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    out.textContent = '0';
    raf = requestAnimationFrame(step);
  }

  function startHero() {
    heroW = host.clientWidth;
    if (reduce) { heroStatic(); return; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); heroAnimate(); }
    }, { threshold: 0.25 });
    io.observe(host);
  }

  let rt = 0;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      drawFields();
      if (host && plan && Math.abs(host.clientWidth - heroW) > 1) {
        cancelAnimationFrame(raf); heroW = host.clientWidth;
        heroStatic(); host.querySelector('[data-count]').textContent = new Intl.NumberFormat('en-US').format(plan.N);
      }
    }, 150);
  });

  /* ---------- chapter rail: mark the chapter in view ---------- */
  const links = [...document.querySelectorAll('.menu a, .menu-m a')];
  if (links.length) {
    const byId = (id) => links.filter((a) => a.getAttribute('href') === '#' + id);
    const seen = new IntersectionObserver((es) => {
      es.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        byId(en.target.id).forEach((a) => a.setAttribute('aria-current', 'true'));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.chapter').forEach((s) => seen.observe(s));
    const hero = document.querySelector('.hero');
    if (hero) new IntersectionObserver((es) => { if (es[0].isIntersecting) links.forEach((a) => a.removeAttribute('aria-current')); },
      { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
    document.querySelectorAll('.menu-m a').forEach((a) => a.addEventListener('click', () => a.closest('details').removeAttribute('open')));
  }

  const loadPhoto = () => new Promise((res) => {
    const src = host && host.querySelector('canvas').dataset.img;
    if (!src) return res();
    const im = new Image();
    im.onload = () => { photo = im; res(); };
    im.onerror = () => res();
    im.src = src;
  });
  /* reels: load at once on wide screens; on phones only when asked */
  const vids = [...document.querySelectorAll('.vid [data-src]')];
  let xjs = null;
  const xWidgets = () => xjs || (xjs = new Promise((res) => {
    const s = document.createElement('script'); s.src = 'https://platform.twitter.com/widgets.js'; s.async = true;
    s.onload = () => (window.twttr && twttr.ready ? twttr.ready(res) : res()); document.head.appendChild(s);
  }));
  const load = (m) => {
    m.closest('.vid').classList.add('on');
    if (m.classList.contains('xpost')) {                 // X post: build it with the official widget
      if (m.dataset.done) return; m.dataset.done = '1';
      xWidgets().then(() => window.twttr && twttr.widgets.createTweet(m.dataset.src, m, { lang: 'ar', align: 'center', dnt: true })
        .then((el) => { if (el) m.querySelector(':scope > a')?.remove(); }));
      return;
    }
    if (m.dataset.src && !m.src) m.src = m.dataset.src;
  };
  const first = (fig) => fig.querySelector('.vitem:not([hidden]) [data-src]') || fig.querySelector('[data-src]');
  const figs = [...document.querySelectorAll('.vid')].filter((f) => f.querySelector('[data-src]'));
  const openAll = () => figs.forEach((f) => load(first(f)));
  if (matchMedia('(min-width: 701px)').matches) openAll();
  else matchMedia('(min-width: 701px)').addEventListener('change', (q) => { if (q.matches) openAll(); });
  document.querySelectorAll('.vid-open').forEach((b) => b.addEventListener('click', () => load(first(b.closest('.vid')))));
  // tabs: show one video, pause the rest
  document.querySelectorAll('.vid.multi').forEach((fig) => {
    const tabs = [...fig.querySelectorAll('.vtabs button')], panes = [...fig.querySelectorAll('.vitem')];
    tabs.forEach((t) => t.addEventListener('click', () => {
      const i = +t.dataset.i;
      tabs.forEach((x, j) => x.setAttribute('aria-selected', String(j === i)));
      panes.forEach((p, j) => { p.hidden = j !== i; if (j !== i) p.querySelector('video')?.pause(); });
      load(panes[i].querySelector('[data-src]'));
    }));
  });

  /* gallery arrows (RTL: next goes left) */
  document.querySelectorAll('.gal').forEach((g) => {
    const strip = g.querySelector('.gal-strip'), prev = g.querySelector('.gal-prev'), next = g.querySelector('.gal-next');
    const step = () => strip.clientWidth * 0.8;
    const sync = () => {
      const max = strip.scrollWidth - strip.clientWidth, pos = Math.abs(strip.scrollLeft);
      prev.disabled = pos < 4; next.disabled = pos > max - 4;
    };
    next.addEventListener('click', () => strip.scrollBy({ left: -step(), behavior: 'smooth' }));
    prev.addEventListener('click', () => strip.scrollBy({ left: step(), behavior: 'smooth' }));
    strip.addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); sync();
  });

  const go = () => { drawFields(); if (host) loadPhoto().then(startHero); };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go);
})();
