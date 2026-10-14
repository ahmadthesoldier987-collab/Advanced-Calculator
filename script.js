const $ = s => document.querySelector(s);
let deg = false, ans = 0;
const defs = {};
const k = () => (deg ? Math.PI / 180 : 1);
const fact = n => { if (n < 0 || n % 1) return NaN; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const FN = {
  sin: x => Math.sin(x * k()), cos: x => Math.cos(x * k()), tan: x => Math.tan(x * k()),
  asin: x => Math.asin(x) / k(), acos: x => Math.acos(x) / k(), atan: x => Math.atan(x) / k(),
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  ln: Math.log, log: Math.log10, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round,
  sign: Math.sign, fact, min: Math.min, max: Math.max, pow: Math.pow, mod: (a, b) => a % b,
  root: (a, n) => Math.pow(a, 1 / n), gcd: (a, b) => (b ? FN.gcd(b, a % b) : Math.abs(a)),
};
const K = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI, phi: (1 + Math.sqrt(5)) / 2 };

// Parser: text -> function(vars) -> number. No eval used.
function compile(src) {
  const t = src.toLowerCase().replace(/\s+/g, '').replace(/π/g, 'pi').replace(/\*\*/g, '^')
    .match(/\d*\.?\d+(e[+-]?\d+)?|[a-z_]\w*|[-+*/^%!(),=]/g) || [];
  let i = 0;
  const peek = () => t[i], eat = s => (t[i] === s ? (i++, true) : false);
  const implicit = () => /^[\d.a-z_(]/.test(peek() || '');
  function expr() {
    let l = term();
    while (peek() === '+' || peek() === '-') {
      const o = t[i++], r = term(), a = l;
      l = o === '+' ? v => a(v) + r(v) : v => a(v) - r(v);
    }
    return l;
  }
  function term() {
    let l = unary();
    while ('*/%'.includes(peek() || ' ') || implicit()) {
      let o = peek();
      if ('*/%'.includes(o)) i++; else o = '*';
      const r = unary(), a = l;
      l = o === '*' ? v => a(v) * r(v) : o === '/' ? v => a(v) / r(v) : v => a(v) % r(v);
    }
    return l;
  }
  function unary() {
    if (eat('-')) { const a = unary(); return v => -a(v); }
    if (eat('+')) return unary();
    const b = post();
    if (eat('^')) { const e = unary(); return v => Math.pow(b(v), e(v)); }
    return b;
  }
  function post() {
    let a = atom();
    while (eat('!')) { const b = a; a = v => fact(b(v)); }
    return a;
  }
  function atom() {
    const s = t[i++];
    if (s === undefined) throw Error('Expression is incomplete');
    if (/^[\d.]/.test(s)) { const n = +s; return () => n; }
    if (s === '(') { const e = expr(); if (!eat(')')) throw Error('Missing )'); return e; }
    if (/^[a-z_]/.test(s)) {
      if (peek() === '(') {
        i++;
        const a = [];
        if (!eat(')')) { do a.push(expr()); while (eat(',')); if (!eat(')')) throw Error('Missing )'); }
        return v => {
          const x = a.map(f => f(v)), d = defs[s];
          if (d) { const sc = { ...v }; d.p.forEach((p, j) => (sc[p] = x[j])); return d.f(sc); }
          if (!FN[s]) throw Error('Unknown function: ' + s);
          return FN[s](...x);
        };
      }
      return v => { if (s in v) return v[s]; if (s in K) return K[s]; throw Error('Unknown name: ' + s); };
    }
    throw Error('Unexpected "' + s + '"');
  }
  const f = expr();
  if (i < t.length) throw Error('Unexpected "' + t[i] + '"');
  return f;
}

// ---------- Calculator ----------
const inp = $('#inp'), res = $('#res'), hist = $('#hist');
const fmt = r => (Number.isFinite(r) ? String(+r.toPrecision(12)) : String(r));
function run() {
  const raw = inp.value.trim();
  if (!raw) return;
  try {
    const m = raw.toLowerCase().replace(/\s/g, '').match(/^([a-z]\w*)\(([a-z,]+)\)=(.+)$/);
    let out;
    if (m) { defs[m[1]] = { p: m[2].split(','), f: compile(m[3]) }; out = m[1] + '(' + m[2] + ') saved'; }
    else { ans = compile(raw)({ ans }); out = fmt(ans); }
    res.textContent = out; res.className = '';
    const li = document.createElement('li');
    li.innerHTML = '<span></span><b></b>';
    li.firstChild.textContent = raw; li.lastChild.textContent = m ? 'saved' : '= ' + out;
    li.onclick = () => { inp.value = raw; inp.focus(); };
    if (hist.querySelector('.empty')) hist.innerHTML = '';
    hist.prepend(li);
    inp.value = '';
    draw();
  } catch (e) { res.textContent = e.message; res.className = 'err'; }
}
inp.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
const keys = 'sin cos tan ln log √ xʸ ( ) ! π e x ans ⌫ 7 8 9 ÷ C 4 5 6 × - 1 2 3 + % 0 . , f(x)= ='.split(' ');
const MAP = { '÷': '/', '×': '*', '√': 'sqrt(', 'xʸ': '^', 'π': 'pi' };
keys.forEach(b => {
  const el = document.createElement('button');
  el.type = 'button'; el.textContent = b;
  if (b === '=') el.className = 'eq';
  else if (/^[a-z]{2,}$|^[√xʸ÷×+%!^-]+$/.test(b) && b !== 'ans') el.className = 'op';
  if (b === 'f(x)=') el.classList.add('wide');
  el.onclick = () => {
    if (b === 'C') inp.value = '';
    else if (b === '⌫') inp.value = inp.value.slice(0, -1);
    else if (b === '=') return run();
    else inp.value += MAP[b] ?? (/^[a-z]{2,}$/.test(b) && b !== 'ans' ? b + '(' : b);
    inp.focus();
  };
  $('#pad').append(el);
});
$('#mode').onclick = e => { deg = !deg; e.target.textContent = deg ? 'DEG' : 'RAD'; draw(); };

// ---------- Graph ----------
const cv = $('#cv'), g = cv.getContext('2d');
const COL = ['#E4366B', '#2A6FDB', '#1B9A72'];
const start = ['sin(x)', 'x^2/4 - 2', ''];
const V = { x: 0, y: 0, s: 50 };
let fs = [null, null, null];
start.forEach((val, j) => {
  const d = document.createElement('div'); d.className = 'fn';
  d.innerHTML = '<i style="background:' + COL[j] + '"></i><input spellcheck="false" autocomplete="off" aria-label="Function ' + (j + 1) + '" placeholder="y = ...">';
  const input = d.querySelector('input'); input.value = val;
  input.oninput = () => parseFn(j); $('#fns').append(d);
});
function parseFn(j) {
  const input = $('#fns').children[j].querySelector('input');
  const src = input.value.replace(/^\s*y\s*=/i, '').trim();
  input.classList.remove('bad'); fs[j] = null;
  if (src) { try { fs[j] = compile(src); fs[j]({ x: 1, ans }); } catch (e) { if (!/Unknown (name|function)/.test(e.message) || /function/.test(e.message)) { /* allow later definition */ } fs[j] = fs[j] || null; if (!fs[j]) input.classList.add('bad'); } }
  draw();
}
const ev = (f, x) => { try { return f({ x, ans }); } catch { return NaN; } };
function draw() {
  const w = cv.clientWidth, h = cv.clientHeight, r = devicePixelRatio || 1;
  if (cv.width !== Math.round(w * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); }
  g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, w, h);
  const X = u => w / 2 + (u - V.x) * V.s, Y = u => h / 2 - (u - V.y) * V.s;
  const x0 = V.x - w / 2 / V.s, x1 = V.x + w / 2 / V.s, y0 = V.y - h / 2 / V.s, y1 = V.y + h / 2 / V.s;
  const raw = 80 / V.s, p = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 5, 10].find(m => m * p >= raw) * p;
  g.font = '11px IBM Plex Mono, monospace'; g.fillStyle = '#5d6b86'; g.lineWidth = 1;
  const line = (a, b, c, d, col) => { g.strokeStyle = col; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
  for (let n = Math.ceil(x0 / st); n <= Math.floor(x1 / st); n++) {
    const px = Math.round(X(n * st)) + .5; line(px, 0, px, h, n ? '#E1E8E4' : '#16213A');
    if (n) g.fillText(+(n * st).toPrecision(6), px + 3, Math.min(Math.max(Y(0) + 13, 12), h - 4));
  }
  for (let n = Math.ceil(y0 / st); n <= Math.floor(y1 / st); n++) {
    const py = Math.round(Y(n * st)) + .5; line(0, py, w, py, n ? '#E1E8E4' : '#16213A');
    if (n) g.fillText(+(n * st).toPrecision(6), Math.min(Math.max(X(0) + 4, 2), w - 40), py - 3);
  }
  const roots = [];
  fs.forEach((f, j) => {
    if (!f) return;
    g.strokeStyle = COL[j]; g.lineWidth = 2.4; g.beginPath();
    let pen = false, py, pu, pv;
    for (let px = 0; px <= w; px++) {
      const u = x0 + px / V.s, y = ev(f, u), sy = Y(y);
      if (!isFinite(sy) || Math.abs(sy) > 1e5) { pen = false; pv = NaN; continue; }
      if (pen && Math.abs(sy - py) < h) g.lineTo(px, sy); else g.moveTo(px, sy);
      if (pv * y < 0) {
        let a = pu, b = u;
        for (let q = 0; q < 40; q++) { const m = (a + b) / 2; if (ev(f, m) * pv <= 0) b = m; else a = m; }
        if (Math.abs(ev(f, a)) < 1e-6 && roots.length < 12) roots.push([a, j]);
      }
      pen = true; py = sy; pu = u; pv = y;
    }
    g.stroke();
  });
  roots.forEach(([u, j]) => { g.fillStyle = '#fff'; g.strokeStyle = COL[j]; g.lineWidth = 2; g.beginPath(); g.arc(X(u), Y(0), 4.5, 0, 7); g.fill(); g.stroke(); });
  $('#roots').textContent = roots.length ? 'Zeros at x = ' + [...new Set(roots.map(r => +r[0].toFixed(4)))].join(', ') : '';
}
let drag = null;
cv.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY, vx: V.x, vy: V.y }; cv.setPointerCapture(e.pointerId); };
cv.onpointerup = () => (drag = null);
cv.onpointermove = e => {
  const b = cv.getBoundingClientRect();
  if (drag) { V.x = drag.vx - (e.clientX - drag.x) / V.s; V.y = drag.vy + (e.clientY - drag.y) / V.s; draw(); }
  const u = V.x + (e.clientX - b.left - b.width / 2) / V.s;
  $('#trace').textContent = 'x = ' + +u.toFixed(3) + fs.map((f, j) => (f ? '   y' + (j + 1) + ' = ' + fmt(ev(f, u)) : '')).join('');
};
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const b = cv.getBoundingClientRect(), mx = e.clientX - b.left - b.width / 2, my = e.clientY - b.top - b.height / 2;
  const ux = V.x + mx / V.s, uy = V.y - my / V.s, z = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  V.s = Math.min(Math.max(V.s * z, 1e-3), 1e6); V.x = ux - mx / V.s; V.y = uy + my / V.s; draw();
}, { passive: false });
$('#reset').onclick = () => { Object.assign(V, { x: 0, y: 0, s: 50 }); draw(); };
['sin(x)/x', 'x^3 - 3x', 'tan(x)', 'ln(x)', 'e^(-x^2)', 'abs(x) - 2', 'sin(x) + sin(3x)/3', 'sqrt(25 - x^2)'].forEach(s => {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = s;
  b.onclick = () => {
    [...$('#fns').children].forEach((d, j) => (d.querySelector('input').value = j ? '' : s));
    fs = [null, null, null]; parseFn(0); parseFn(1); parseFn(2);
    Object.assign(V, { x: 0, y: 0, s: 50 }); draw(); $('#bench').scrollIntoView({ behavior: 'smooth' });
  };
  $('#chips').append(b);
});
addEventListener('resize', draw);
[0, 1, 2].forEach(parseFn);