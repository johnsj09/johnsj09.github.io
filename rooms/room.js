/* A room behind one of the doors. Inside the main page it is an iframe that waits for {wall:'enter'};
   opened on its own (a shared link, a refresh) it simply shows itself and links back to the doors. */
(() => {
  const root = document.documentElement, body = document.body;
  const embedded = window.parent !== window;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const setMode = m => { if (m === 'dark') root.dataset.mode = 'dark'; else delete root.dataset.mode; redrawAll(); };
  try { if (localStorage.getItem('jtj-mode') === 'dark') root.dataset.mode = 'dark'; } catch (e) {}
  const tell = msg => { try { window.parent.postMessage(msg, location.origin === 'null' ? '*' : location.origin); } catch (e) { window.parent.postMessage(msg, '*'); } };
  const go = to => {
    if (embedded) return tell(to === 'close' ? { wall: 'close' } : { wall: 'go', to });
    if (to === 'close') location.href = '../index.html#works';
    else if (to.startsWith('door:')) location.href = ROOMS[+to.slice(5)];
    else location.href = '../index.html#' + (to === 'about' ? 'about' : 'contact');
  };
  const ROOMS = ['lab.html', 'freelance.html', 'memory.html', 'vision.html', 'bench.html'];
  document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; e.preventDefault(); go(b.dataset.go); });
  // "Download CV": if the PDF isn't in assets/ yet, the CV request form opens instead
  document.addEventListener('click', async e => {
    const a = e.target.closest('[data-cvdl]'); if (!a || location.protocol === 'file:') return;
    e.preventDefault();
    let ok = false;
    try { ok = (await fetch(a.href, { method: 'HEAD' })).ok; } catch (err) {}
    if (!ok) return go('cv');
    const t = document.createElement('a'); t.href = a.href; t.download = ''; document.body.appendChild(t); t.click(); t.remove();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') go('close'); });

  // reveal: movement only once the room is lit; content is never hidden for good
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting){ x.target.classList.add('on'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px' }) : null;
  const arm = () => $$('.rv').forEach((el, i) => { el.style.transitionDelay = Math.min(i, 4) * 90 + 'ms'; io ? io.observe(el) : el.classList.add('on'); });
  function enter(){ body.classList.add('in'); arm(); running = true; kick(); }
  function exit(){ body.classList.remove('in'); }
  function reset(){ scrollTo(0, 0); $$('.rv').forEach(el => el.classList.remove('on')); running = false; }
  if (embedded){
    addEventListener('message', e => {
      const m = e.data || {}; if (!m.wall) return;
      if (m.wall === 'mode') setMode(m.mode);
      else if (m.wall === 'enter') enter();
      else if (m.wall === 'exit') exit();
      else if (m.wall === 'reset') reset();
    });
  } else {
    if (reduced) body.classList.add('static');
    requestAnimationFrame(enter);
  }

  /* ---------- canvases ---------- */
  const views = [];
  let running = !embedded;
  const css = n => getComputedStyle(root).getPropertyValue(n).trim();
  function view(canvas, draw, opts = {}){
    const ctx = canvas.getContext('2d');
    const v = { canvas, ctx, draw, w: 0, h: 0, seen: false, t0: performance.now(), ...opts };
    const size = () => { const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      v.w = r.width; v.h = r.height; canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d); ctx.setTransform(d, 0, 0, d, 0, 0); v.draw(v, reduced ? 4 : (performance.now() - v.t0) / 1000); };
    new ResizeObserver(size).observe(canvas); size();
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { v.seen = es[0].isIntersecting; kick(); }).observe(canvas); else v.seen = true;
    views.push(v); return v;
  }
  let raf = 0;
  function loop(now){
    raf = 0; let any = false;
    for (const v of views) if (v.seen && running && !reduced){ v.draw(v, (now - v.t0) / 1000); any = true; }
    if (any && !document.hidden) raf = requestAnimationFrame(loop);
  }
  function kick(){ if (!raf && !reduced) raf = requestAnimationFrame(loop); }
  function redrawAll(){ views.forEach(v => v.draw(v, (performance.now() - v.t0) / 1000)); }
  document.addEventListener('visibilitychange', kick);
  const round = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
  const font = (px, w = 500) => `${w} ${px}px Onest, system-ui, sans-serif`;
  const bez = (a, b, p, vertical) => {
    const u = 1 - p;
    if (vertical){ const my = (a[1] + b[1]) / 2; return [u*u*u*a[0] + 3*u*u*p*a[0] + 3*u*p*p*b[0] + p*p*p*b[0], u*u*u*a[1] + 3*u*u*p*my + 3*u*p*p*my + p*p*p*b[1]]; }
    const mx = (a[0] + b[0]) / 2; return [u*u*u*a[0] + 3*u*u*p*mx + 3*u*p*p*mx + p*p*p*b[0], u*u*u*a[1] + 3*u*u*p*a[1] + 3*u*p*p*b[1] + p*p*p*b[1]];
  };
  const tabs = (group, on) => { const bs = $$('button', group); bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', String(x === b))); on(b.dataset.k); })); };


  /* ---------- Memory hero: a brain drawn from neurons ---------- */
  const brC = $('#viz-brain');
  if (brC){
    const SAYB = { hip: 'Hippocampus. Where memories are formed and recalled, and the subject of my MSc dissertation.',
      front: 'Frontal cortex. Flexible decisions, which our cognitive-model benchmark studied through reversal learning in mice.',
      vis: 'Visual cortex. Seeing, which I approached from the engineering side with a self-driving model car.',
      sleep: 'Thalamus and brainstem. They shape sleep: spindles arise in the thalamus, and the brainstem helps switch REM on and off.' };
    let region = 'hip';
    const sayB = $('#say-brain'); sayB.textContent = SAYB[region];
    tabs($('#tabs-brain'), k => { region = k; sayB.textContent = SAYB[k]; redrawAll(); });
    const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const el2 = (x, y, cx, cy, rx, ry) => { const a = (x - cx) / rx, b = (y - cy) / ry; return a * a + b * b < 1; };
    const r = rng(11), pts = []; let tries = 0;
    const stem = (x, y) => el2(x, y, .585, .82, .045, .15);
    const inside = (x, y) => (el2(x, y, .46, .40, .40, .32) && y < .66) || el2(x, y, .40, .64, .20, .11) || el2(x, y, .76, .74, .14, .10) || stem(x, y);
    const reg = (x, y) => el2(x, y, .47, .585, .10, .06) ? 'hip' : (el2(x, y, .50, .43, .08, .065) || (stem(x, y) && y > .66)) ? 'sleep' : (x < .27 && y < .6) ? 'front' : (x > .69 && y < .6) ? 'vis' : '';
    while (pts.length < 200 && tries < 30000){ tries++; const x = r(), y = r(); if (!inside(x, y)) continue;
      if (pts.every(p => (p.x - x) ** 2 + (p.y - y) ** 2 >= .0015)) pts.push({ x, y, reg: reg(x, y), nb: [] }); }
    const edges = [], seen = {};
    pts.forEach((p, i) => { pts.map((q, j) => [(p.x - q.x) ** 2 + (p.y - q.y) ** 2, j]).filter(d => d[1] !== i && d[0] < .011).sort((a, b) => a[0] - b[0]).slice(0, 3)
      .forEach(([, j]) => { const k = Math.min(i, j) + '-' + Math.max(i, j); if (!seen[k]){ seen[k] = 1; edges.push([i, j]); p.nb.push(j); pts[j].nb.push(i); } }); });
    const pulses = Array.from({ length: 16 }, () => { const a = (r() * pts.length) | 0, nb = pts[a].nb; return { a, b: nb.length ? nb[(r() * nb.length) | 0] : a, p: r() }; });
    let lastB = 0;
    view(brC, (v, t) => {
      const { ctx, w, h } = v; ctx.clearRect(0, 0, w, h);
      const dark = root.dataset.mode === 'dark', base = dark ? '#b6a4ff' : css('--acc'), warm = dark ? '#ffb690' : '#e0784a';
      const sc = Math.min(w / .92, h / .96), ox = (w - .92 * sc) / 2 - .03 * sc, oy = (h - .96 * sc) / 2 - .03 * sc;
      const P = n => [ox + pts[n].x * sc, oy + pts[n].y * sc];
      ctx.lineWidth = 1;
      for (const [a, b] of edges){ const p = P(a), q = P(b), hot = pts[a].reg === region && pts[b].reg === region;
        ctx.strokeStyle = hot ? warm : base; ctx.globalAlpha = hot ? .85 : .22; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
      ctx.globalAlpha = 1;
      pts.forEach((pt, i) => { const p = P(i), on = pt.reg === region; ctx.beginPath(); ctx.arc(p[0], p[1], on ? 3.6 : 2.1, 0, 7); ctx.fillStyle = on ? warm : base; ctx.globalAlpha = on ? 1 : .7; ctx.fill(); });
      ctx.globalAlpha = 1;
      const dt = Math.min(.1, Math.max(0, t - lastB)); lastB = t;
      for (const pl of pulses){
        pl.p += dt * 2.2;
        if (pl.p >= 1){ pl.p = 0; const prev = pl.a; pl.a = pl.b; const nb = pts[pl.a].nb; let pick = nb[(r() * nb.length) | 0];
          if (nb.length > 1 && pick === prev) pick = nb[(nb.indexOf(pick) + 1) % nb.length]; pl.b = pick === undefined ? pl.a : pick;
          if (r() < .12){ const pool = pts.map((q, ix) => q.reg === region ? ix : -1).filter(ix => ix >= 0); if (pool.length){ pl.a = pool[(r() * pool.length) | 0]; const n2 = pts[pl.a].nb; pl.b = n2.length ? n2[(r() * n2.length) | 0] : pl.a; } } }
        const p = P(pl.a), q = P(pl.b), px = p[0] + (q[0] - p[0]) * pl.p, py = p[1] + (q[1] - p[1]) * pl.p, s0 = Math.max(0, pl.p - .45);
        ctx.strokeStyle = warm; ctx.lineWidth = 2; ctx.globalAlpha = .9; ctx.beginPath(); ctx.moveTo(p[0] + (q[0] - p[0]) * s0, p[1] + (q[1] - p[1]) * s0); ctx.lineTo(px, py); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = dark ? '#fff3ea' : '#ffffff'; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, 7); ctx.fill();
      }
    });
  }

  /* ---------- Lab hero: doors slide open on the lab; numbers jump to the work ---------- */
  const lab = $('#labroom');
  if (lab){
    const open = () => setTimeout(() => lab.classList.add('open'), reduced ? 0 : 450);
    if (embedded) addEventListener('message', e => { const m = e.data || {}; if (m.wall === 'enter') open(); else if (m.wall === 'reset') lab.classList.remove('open'); });
    else open();
    $$('.spot[data-to]', lab).forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.to)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })));
  }

  /* ---------- The Lab: instruments -> LIMS -> outputs ---------- */
  const labC = $('#viz-lab');
  if (labC){
    const IN = [['plate', 'Plate reader'], ['cds', 'Chromatography'], ['bal', 'Balance & pH'], ['path', 'Pathology']];
    const OUT = [['s3', 'AWS S3'], ['path2', 'Pathology viewer'], ['rep', 'Reports']];
    const SAY = {
      lims: ['The LIMS', 'Data models, workflow templates and metadata structures: the shape every result takes before anyone can trust it.'],
      plate: ['Plate reader', 'Assay results parsed from the reader export and attached to the right samples, with no copy and paste in between.'],
      cds: ['Chromatography', 'Run results pulled in from the chromatography data system with their audit trail intact. I also supported the CDS for lab users.'],
      bal: ['Balance & pH', 'Everyday bench instruments wired straight into the workflow, so a typo can’t creep into a GxP record.'],
      path: ['Digital pathology', 'A two-way link between the LIMS and a digital pathology platform, so slides and samples stay matched.'],
      path2: ['Digital pathology', 'A two-way link between the LIMS and a digital pathology platform, so slides and samples stay matched.'],
      s3: ['AWS S3', 'A Java pipeline over REST and SOAP, with the infrastructure in AWS CDK. It replaced a semi-manual job and halved processing time.'],
      rep: ['Reports', 'Validated, reviewable outputs: what an auditor or a scientist actually opens at the end.']
    };
    let sel = 'lims';
    const cap = $('#cap-lab');
    const setSel = k => { sel = k; cap.querySelector('b').textContent = SAY[k][0]; cap.querySelector('p').textContent = SAY[k][1]; $$('#tabs-lab button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k))); redrawAll(); };
    tabs($('#tabs-lab'), setSel);
    let rects = [];
    const packets = Array.from({ length: 22 }, (_, i) => ({ src: i % IN.length, dst: i % OUT.length, p: Math.random(), sp: .14 + Math.random() * .12, leg: Math.random() < .5 ? 0 : 1 }));
    let last = 0;
    view(labC, (v, t) => {
      const { ctx, w, h } = v, vert = w < 620;
      const dt = Math.min(.05, Math.max(0, t - last)); last = t;
      const ink = css('--ink'), mut = css('--mut'), acc = css('--acc'), acc2 = css('--acc2'), line = css('--line'), bg = css('--bg'), door = css('--door');
      ctx.clearRect(0, 0, w, h);
      const nIn = IN.length, nOut = OUT.length;
      const pos = (i, n, col) => vert ? [w * (i + .5) / n, h * (col === 0 ? .13 : col === 1 ? .5 : .87)] : [w * (col === 0 ? .13 : col === 1 ? .5 : .87), h * (i + .5) / n];
      const hub = pos(0, 1, 1);
      const pin = IN.map((_, i) => pos(i, nIn, 0)), pout = OUT.map((_, i) => pos(i, nOut, 2));
      // wires
      const wire = (a, b, hot) => { ctx.beginPath(); for (let k = 0; k <= 40; k++){ const q = bez(a, b, k / 40, vert); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.strokeStyle = hot ? acc : line; ctx.lineWidth = hot ? 2.2 : 1.4; ctx.stroke(); };
      pin.forEach((p, i) => wire(p, hub, sel === IN[i][0] || sel === 'lims'));
      pout.forEach((p, i) => wire(hub, p, sel === OUT[i][0] || sel === 'lims'));
      // packets
      for (const k of packets){
        k.p += k.sp * dt * (reduced ? 0 : 1);
        if (k.p >= 1){ k.p = 0; if (k.leg === 0) k.leg = 1; else { k.leg = 0; k.src = (Math.random() * nIn) | 0; k.dst = (Math.random() * nOut) | 0; } }
        const a = k.leg === 0 ? pin[k.src] : hub, b = k.leg === 0 ? hub : pout[k.dst];
        const q = bez(a, b, k.p, vert);
        const hot = sel === 'lims' || (k.leg === 0 ? sel === IN[k.src][0] : sel === OUT[k.dst][0]);
        ctx.beginPath(); ctx.arc(q[0], q[1], hot ? 3.6 : 2.4, 0, 7); ctx.fillStyle = hot ? (k.leg ? acc2 : acc) : mut; ctx.globalAlpha = hot ? 1 : .45; ctx.fill(); ctx.globalAlpha = 1;
      }
      // nodes
      rects = [];
      const node = (p, label, key, big) => {
        ctx.font = font(big ? 15 : 13, big ? 650 : 550);
        const tw = ctx.measureText(label).width, bw = tw + (big ? 34 : 24), bh = big ? 46 : 34;
        const x = Math.max(4, Math.min(w - bw - 4, p[0] - bw / 2)), y = p[1] - bh / 2;
        const on = sel === key;
        round(ctx, x, y, bw, bh, bh / 2); ctx.fillStyle = on ? ink : bg; ctx.fill(); ctx.strokeStyle = on ? ink : line; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = on ? bg : ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + bw / 2, p[1] + 1);
        rects.push([key, x, y, bw, bh]);
      };
      // hub pulse
      const pr = 34 + (t * 18 % 26);
      ctx.beginPath(); ctx.arc(hub[0], hub[1], pr, 0, 7); ctx.strokeStyle = door; ctx.globalAlpha = Math.max(0, 1 - (pr - 34) / 26) * .5; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
      IN.forEach(([k, l], i) => node(pin[i], vert ? l.split(' ')[0] : l, k));
      OUT.forEach(([k, l], i) => node(pout[i], vert ? l.split(' ')[0] : l, k));
      node(hub, 'LIMS', 'lims', true);
      ctx.font = font(11, 600); ctx.fillStyle = mut; ctx.textAlign = 'center';
      if (!vert){ ctx.fillText('INSTRUMENTS', w * .13, 18); ctx.fillText('GxP CHECKPOINT', w * .5, h * .5 + 44); ctx.fillText('WHERE IT LANDS', w * .87, 18); }
    });
    labC.addEventListener('click', e => { const r = labC.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const hit = rects.find(q => x >= q[1] && x <= q[1] + q[3] && y >= q[2] && y <= q[2] + q[4]); if (hit) setSel(hit[0]); });
    labC.addEventListener('pointermove', e => { const r = labC.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      labC.style.cursor = rects.some(q => x >= q[1] && x <= q[1] + q[3] && y >= q[2] && y <= q[2] + q[4]) ? 'pointer' : ''; });
    setSel('lims');
  }

  /* ---------- Freelance: samples moving through a lab's day ---------- */
  const flC = $('#viz-free');
  if (flC){
    const ST = ['Received', 'Registered', 'Stored', 'Processed', 'Reported'];
    let samples = [], nextId = 1041, made = 0, lastT = 0;
    const add = n => { for (let i = 0; i < n; i++) samples.push({ id: 'S-' + (nextId++), st: 0, x: -0.06 - i * .035, wait: 0, lane: Math.random(), born: 0 }); made += n; };
    // the lab is already busy when you walk in: samples at every stage
    for (let i = 0; i < 26; i++){ const st = i % 5; samples.push({ id: 'S-' + (nextId++), st, x: (st + .2 + Math.random() * .3) / 5, wait: Math.random() * 2, lane: Math.random(), born: 0 }); }
    add(4);
    $('#add-batch')?.addEventListener('click', () => { add(12); kick(); });
    let hover = null;
    view(flC, (v, t) => {
      const { ctx, w, h } = v; const dt = Math.min(.05, Math.max(0, t - lastT)); lastT = t;
      const ink = css('--ink'), mut = css('--mut'), acc = css('--acc'), acc2 = css('--acc2'), line = css('--line'), door = css('--door'), bg = css('--bg');
      ctx.clearRect(0, 0, w, h);
      const top = 54, bot = h - 70, colW = w / ST.length;
      ST.forEach((s, i) => {
        const x = i * colW;
        if (i) { ctx.beginPath(); ctx.moveTo(x, top - 10); ctx.lineTo(x, bot + 10); ctx.strokeStyle = line; ctx.setLineDash([3, 5]); ctx.stroke(); ctx.setLineDash([]); }
        ctx.font = font(w < 560 ? 11 : 13, 600); ctx.fillStyle = mut; ctx.textAlign = 'center'; ctx.fillText(w < 560 ? s.slice(0, 5) + (s.length > 5 ? '.' : '') : s.toUpperCase(), x + colW / 2, 30);
        const n = samples.filter(q => q.st === i && q.x >= 0).length;
        ctx.font = font(w < 560 ? 18 : 24, 650); ctx.fillStyle = ink; ctx.fillText(String(n), x + colW / 2, bot + 44);
      });
      if (!reduced && Math.random() < dt * .7 && samples.length < 70) add(1);
      for (const q of samples){
        const target = (q.st + .5) / ST.length;
        if (q.wait > 0) q.wait -= dt;
        else if (q.x < target) q.x = Math.min(target, q.x + dt * .12);
        else if (q.st < ST.length - 1){ q.st++; q.wait = .6 + Math.random() * 1.6; }
        else q.wait = -1, q.gone = (q.gone || 0) + dt;
      }
      samples = samples.filter(q => !(q.gone > 2.2));
      hover = null;
      for (const q of samples){
        if (q.x < -0.02) continue;
        const x = q.x * w + (q.lane - .5) * colW * .55, y = top + 14 + q.lane * (bot - top - 28);
        const fade = q.gone ? Math.max(0, 1 - q.gone / 2.2) : 1;
        ctx.globalAlpha = fade;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = q.st === ST.length - 1 ? acc2 : q.st >= 2 ? acc : door; ctx.fill();
        if (v.mx != null && Math.hypot(v.mx - x, v.my - y) < 10) hover = [q, x, y];
        ctx.globalAlpha = 1;
      }
      if (hover){
        const [q, x, y] = hover, txt = `${q.id} · ${ST[q.st]}`;
        ctx.font = font(12, 600); const tw = ctx.measureText(txt).width + 18;
        const bx = Math.min(w - tw - 6, Math.max(6, x - tw / 2));
        round(ctx, bx, y - 36, tw, 24, 12); ctx.fillStyle = ink; ctx.fill(); ctx.fillStyle = bg; ctx.textAlign = 'center'; ctx.fillText(txt, bx + tw / 2, y - 20);
      }
    });
    const fv = views[views.length - 1];
    flC.addEventListener('pointermove', e => { const r = flC.getBoundingClientRect(); fv.mx = e.clientX - r.left; fv.my = e.clientY - r.top; });
    flC.addEventListener('pointerleave', () => { fv.mx = null; });
  }

  /* ---------- Memory: the two hippocampal pathways ---------- */
  const hpC = $('#viz-hpc');
  if (hpC){
    const PN = { ecin: [.14, .3, 'EC in', '29'], dg: [.5, .14, 'DG', '400'], ca3: [.86, .3, 'CA3', '80'], ca1: [.7, .8, 'CA1', '100'], ecout: [.22, .8, 'EC out', ''] };
    const PE = [['ecin', 'dg', 'tsp'], ['dg', 'ca3', 'tsp'], ['ca3', 'ca1', 'tsp'], ['ecin', 'ca1', 'msp'], ['ca1', 'ecout', 'out']];
    const SAY = {
      none: 'Both pathways working. The model uses the season as a cue, switches between two conflicting rule sets, and avoids the catastrophic interference seen in single-system learners.',
      tsp: 'Trisynaptic pathway silenced. This is the route that separates similar inputs into distinct codes. In my simulations it was needed for specific episodic detail, which is what an exception is.',
      msp: 'Monosynaptic pathway silenced. This direct route picks up regularities across experiences. In my simulations it was the one that mattered for abstracting the rule and generalising it.'
    };
    let les = 'none';
    tabs($('#tabs-hpc'), k => { les = k; $('#cap-hpc p').textContent = SAY[k]; redrawAll(); });
    view(hpC, (v, t) => {
      const { ctx, w, h } = v; const ink = css('--ink'), mut = css('--mut'), acc = css('--acc'), acc2 = css('--acc2'), line = css('--line'), bg = css('--bg');
      ctx.clearRect(0, 0, w, h);
      const pad = 46, P = k => [pad + PN[k][0] * (w - pad * 2), pad + PN[k][1] * (h - pad * 2)];
      PE.forEach(([a, b, kind], ei) => {
        const A = P(a), B = P(b), off = les === kind;
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
        ctx.setLineDash(kind === 'msp' ? [7, 6] : []); ctx.strokeStyle = off ? line : kind === 'msp' ? acc2 : kind === 'out' ? mut : acc; ctx.lineWidth = off ? 1.2 : 2.4; ctx.stroke(); ctx.setLineDash([]);
        if (!off){
          for (let s = 0; s < 3; s++){
            const p = ((t * (kind === 'msp' ? .55 : .42) + s / 3 + ei * .17) % 1);
            const x = A[0] + (B[0] - A[0]) * p, y = A[1] + (B[1] - A[1]) * p;
            ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 7); ctx.fillStyle = kind === 'msp' ? acc2 : acc; ctx.fill();
          }
        } else {
          const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
          ctx.strokeStyle = mut; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - 7, my - 7); ctx.lineTo(mx + 7, my + 7); ctx.moveTo(mx + 7, my - 7); ctx.lineTo(mx - 7, my + 7); ctx.stroke();
        }
      });
      Object.keys(PN).forEach(k => {
        const [x, y] = P(k), r = k === 'dg' ? 30 : 24;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = ink; ctx.font = font(13, 650); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(PN[k][2], x, y - (PN[k][3] ? 5 : 0));
        if (PN[k][3]){ ctx.font = font(10, 500); ctx.fillStyle = mut; ctx.fillText(PN[k][3] + ' units', x, y + 9); }
      });
    });
  }

  /* ---------- Sleep: one night, stage by stage ---------- */
  const slC = $('#viz-sleep');
  if (slC){
    const ST = { W: ['Awake', 0, 'Relaxed with eyes closed, the EEG settles into alpha rhythm at around 8 to 13 Hz.'],
      R: ['REM sleep', 1, 'Low-amplitude, mixed-frequency activity that looks close to waking. Most vivid dreams are reported from REM.'],
      N1: ['Light sleep, N1', 2, 'The drift into sleep. Alpha fades and slower theta activity at 4 to 7 Hz takes over.'],
      N2: ['Light sleep, N2', 3, 'Sleep spindles, short bursts at around 11 to 16 Hz, and K-complexes appear. Spindles are linked to memory consolidation.'],
      N3: ['Deep sleep', 4, 'Slow-wave sleep. Large delta waves below 4 Hz dominate: thought to be a key window for consolidating memories.'] };
    const PLAN = [['W',8],['N1',6],['N2',20],['N3',38],['N2',12],['R',8],['N2',28],['N3',26],['N2',14],['R',16],['N2',34],['N3',10],['N2',22],['R',24],['W',2],['N2',30],['R',30],['N2',16],['R',34],['N1',6],['N2',40],['R',40],['W',16]];
    const TOTAL = PLAN.reduce((a, b) => a + b[1], 0);
    const at = m => { let acc = 0; for (const [s, d] of PLAN){ acc += d; if (m < acc) return s; } return 'W'; };
    let drag = null, lastS = '';
    const cap = $('#cap-sleep');
    const eeg = (s, x) => {
      if (s === 'W') return Math.sin(x * .9) * .35 + Math.sin(x * 2.3) * .12;
      if (s === 'R') return Math.sin(x * 1.7) * .22 + Math.sin(x * 3.1 + 1) * .14 + Math.sin(x * .37) * .1;
      if (s === 'N1') return Math.sin(x * .5) * .4 + Math.sin(x * 1.6) * .12;
      if (s === 'N2'){ const sp = Math.exp(-Math.pow(((x % 60) - 30) / 6, 2)); return Math.sin(x * .45) * .3 + Math.sin(x * 2.6) * .5 * sp; }
      return Math.sin(x * .16) * .85 + Math.sin(x * .41) * .15;
    };
    view(slC, (v, t) => {
      const { ctx, w, h } = v; const ink = css('--ink'), mut = css('--mut'), acc = css('--acc'), acc2 = css('--acc2'), line = css('--line');
      ctx.clearRect(0, 0, w, h);
      const L = 64, Rr = w - 18, T = 22, H = h * .55, X = m => L + m / TOTAL * (Rr - L), Y = l => T + l / 4 * (H - T);
      const m = drag != null ? drag : (t * 22) % TOTAL;
      ctx.font = font(11, 550); ctx.fillStyle = mut; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ['Awake', 'REM', 'N1', 'N2', 'N3'].forEach((l, i) => { ctx.fillText(l, L - 10, Y(i)); ctx.beginPath(); ctx.moveTo(L, Y(i)); ctx.lineTo(Rr, Y(i)); ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.stroke(); });
      ctx.beginPath(); let acc0 = 0, first = true;
      for (const [s, d] of PLAN){ const y = Y(ST[s][1]); if (first){ ctx.moveTo(X(0), y); first = false; } else ctx.lineTo(X(acc0), y); acc0 += d; ctx.lineTo(X(acc0), y); }
      ctx.strokeStyle = mut; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, X(m), H + 4); ctx.clip();
      ctx.beginPath(); acc0 = 0; first = true;
      for (const [s, d] of PLAN){ const y = Y(ST[s][1]); if (first){ ctx.moveTo(X(0), y); first = false; } else ctx.lineTo(X(acc0), y); acc0 += d; ctx.lineTo(X(acc0), y); }
      ctx.strokeStyle = acc; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      const s = at(m);
      ctx.beginPath(); ctx.moveTo(X(m), T - 10); ctx.lineTo(X(m), H + 6); ctx.strokeStyle = acc2; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(X(m), Y(ST[s][1]), 6, 0, 7); ctx.fillStyle = acc2; ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = mut; ctx.font = font(11, 550);
      for (let hr = 0; hr <= 8; hr++){ const x = L + hr / 8 * (Rr - L); ctx.fillText((23 + hr) % 24 + ':00', Math.min(x - 12, w - 40), H + 20); }
      // the EEG under the cursor
      const E0 = H + 40, EH = h - E0 - 12;
      ctx.beginPath();
      for (let x = L; x <= Rr; x += 2){ const y = E0 + EH / 2 - eeg(s, x * .5 + t * 40) * EH * .45; x === L ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.fillStyle = mut; ctx.textAlign = 'right'; ctx.fillText('EEG', L - 10, E0 + EH / 2);
      if (s !== lastS){ lastS = s; cap.querySelector('b').textContent = ST[s][0]; cap.querySelector('p').textContent = ST[s][2]; }
    });
    const sv = views[views.length - 1];
    const toM = e => { const r = slC.getBoundingClientRect(); return Math.max(0, Math.min(TOTAL - 1, (e.clientX - r.left - 64) / (r.width - 82) * TOTAL)); };
    slC.addEventListener('pointerdown', e => { drag = toM(e); slC.setPointerCapture(e.pointerId); redrawAll(); });
    slC.addEventListener('pointermove', e => { if (drag != null){ drag = toM(e); if (reduced) redrawAll(); } });
    slC.addEventListener('pointerup', () => { sv.t0 = performance.now() - (drag / 22) * 1000; drag = null; });
  }

  /* ---------- The Bench: a schematic perfusion trace ---------- */
  const bnC = $('#viz-bench');
  if (bnC){
    let treated = false;
    tabs($('#tabs-bench'), k => { treated = k === 'yes'; redrawAll(); });
    view(bnC, (v, t) => {
      const { ctx, w, h } = v; const ink = css('--ink'), mut = css('--mut'), acc = css('--acc'), acc2 = css('--acc2'), line = css('--line'), door = css('--door');
      ctx.clearRect(0, 0, w, h);
      const L = 20, R = w - 20, T = 44, B = h - 40, span = R - L;
      const phases = [[0, .3, 'Stabilise'], [.3, .55, 'Ischaemia'], [.55, 1, 'Reperfusion']];
      phases.forEach(([a, b, n], i) => {
        if (i === 1){ ctx.fillStyle = door; ctx.globalAlpha = .12; ctx.fillRect(L + a * span, T - 20, (b - a) * span, B - T + 20); ctx.globalAlpha = 1; }
        ctx.fillStyle = mut; ctx.font = font(11, 650); ctx.textAlign = 'center'; ctx.fillText(n.toUpperCase(), L + (a + b) / 2 * span, T - 26 + 14);
      });
      const rec = treated ? .78 : .42;
      const amp = f => f < .3 ? 1 : f < .55 ? Math.max(.04, 1 - (f - .3) / .05) : Math.min(rec, (f - .55) / .25 * rec);
      const head = (t * .12) % 1.15;
      ctx.beginPath();
      for (let x = 0; x <= span; x += 1.5){
        const f = x / span; if (f > head) break;
        const beat = Math.pow(Math.max(0, Math.sin(f * 140)), 6);
        const y = B - 18 - beat * (B - T - 40) * amp(f);
        x ? ctx.lineTo(L + x, y) : ctx.moveTo(L + x, y);
      }
      ctx.strokeStyle = treated ? acc : ink; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.setLineDash([4, 5]); ctx.beginPath(); const yr = B - 18 - (B - T - 40) * rec; ctx.moveTo(L + .55 * span, yr); ctx.lineTo(R, yr); ctx.strokeStyle = acc2; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = acc2; ctx.textAlign = 'right'; ctx.font = font(12, 650); ctx.fillText(treated ? 'treated: stronger recovery' : 'untreated: weaker recovery', R, yr - 10);
      ctx.fillStyle = mut; ctx.textAlign = 'left'; ctx.font = font(11, 500); ctx.fillText('Schematic for illustration, not study data', L, B + 26);
    });
  }
})();
