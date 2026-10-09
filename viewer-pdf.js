(function () {
'use strict';
var LIB_DIR = 'vendor/pdfjs-3.11.174/';
var CHUNK = 131072;
var EDGE = 2 * CHUNK;
var FETCH_MIN = 2 * CHUNK;
var FETCH_MAX = 16 * CHUNK;
var FETCH_DEFAULT = 4 * CHUNK;
var RECENT_MAX = 3 * 1024 * 1024;
var ZOOMS = [1, 1.5, 2];
var MAX_W = 900;
var MAX_PIXELS = 5000000;
var MAX_DPR = 2;
var HEADERS_MS = 45000;
var STALL_MS = 30000;
var RETRY_MS = 1500;
var SLOW_MS = 7000;
var RESIGN_MIN_AGE = 20000;
var WORKER_READY_MS = 20000;
var WORKER_KILL_MS = 3000;
var TXT = {
preparing: 'جارٍ التحضير…',
downloading: 'جارٍ التحميل…',
opening: 'جارٍ فتح الملف…',
slow: 'النت بطيء — عم نكمّل المحاولة…',
oldBrowser: 'متصفحك ما بيقدر يفتح الملف — افتحه بالتطبيق.',
unavailable: 'هالملف مو متاح هلق.',
broken: 'ما قدرنا نفتح الملف',
pageFailed: 'ما قدرنا نعرض هالصفحة',
what: 'الملف',
whatRest: 'باقي صفحات الملف',
open: 'افتح بالتطبيق',
retry: 'إعادة المحاولة',
zoomIn: 'كبّر',
zoomOut: 'صغّر',
pages: 'صفحات الملف',
untitled: 'ملف',
pageOf: function (c, t) { return 'صفحة ' + c + ' من ' + t; },
};
var SVG_NS = 'http://www.w3.org/2000/svg';
var ICON_PLUS = 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z';
var ICON_MINUS = 'M19 13H5v-2h14v2z';
var AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function arDigits(s) {
return String(s).replace(/[0-9]/g, function (d) { return AR_DIGITS.charAt(+d); });
}
function kindErr(kind, detail) {
var e = new Error(kind + (detail ? ': ' + detail : ''));
e.kind = kind;
e.detail = detail ? String(detail) : '';
return e;
}
function noop() {}
function now() { return new Date().getTime(); }
function absUrl(rel) {
var a = document.createElement('a');
a.href = rel;
return a.href;
}
function zap(canvas) {
if (!canvas) return;
try { canvas.width = 0; canvas.height = 0; } catch (e) {   }
if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
}
function statusKind(st) {
if (st === 400 || st === 401 || st === 403) return 'auth';
if (st === 404 || st === 410) return 'missing';
if (st === 0 || st === 408 || st === 425 || st === 429 || st >= 500) return 'net';
return 'bad';
}
function concat(parts, total) {
if (parts.length === 1) return parts[0];
var out = new Uint8Array(total);
var at = 0;
for (var i = 0; i < parts.length; i++) {
out.set(parts[i], at);
at += parts[i].length;
}
return out;
}
function svgIcon(d) {
var svg = document.createElementNS(SVG_NS, 'svg');
svg.setAttribute('viewBox', '0 0 24 24');
svg.setAttribute('aria-hidden', 'true');
svg.setAttribute('focusable', 'false');
var p = document.createElementNS(SVG_NS, 'path');
p.setAttribute('d', d);
svg.appendChild(p);
return svg;
}
function supported() {
try {
if (!window.Promise || !window.fetch || !window.Uint8Array || !window.Worker) return false;
if (typeof Array.prototype.at !== 'function') return false;
var c = document.createElement('canvas');
return !!(c.getContext && c.getContext('2d'));
} catch (e) {
return false;
}
}
var workerUrl = '';
function mount(host, lesson, ctx) {
var M = window.MEC;
lesson = lesson || {};
ctx = ctx || {};
var course = ctx.course || {};
var S = {
dead: false,
final: false,
run: 0,
url: '', signedAt: 0, resigning: null, authRetried: false,
worker: null, workerRaw: null, workerP: null, closing: null, side: [],
task: null, pdf: null, transport: null,
mode: '', phase: 'prep', length: 0, received: 0, urlBusy: false,
full: null, tail: null, have: null, pend: [], recent: [],
lat: 0, bps: 0, fetchSize: FETCH_DEFAULT,
reqs: [], timers: [], failed: [], retryFn: null,
pages: [], live: {}, job: null, vis: null, cur: -1, zoomIdx: 0, W: 0, lastCw: 0,
first: false, raf: 0, rafIsTimer: false, resizeT: 0, slowI: 0, lastProgress: 0,
io: null, load: null,
stats: { mode: '', requests: 0, ranges: 0, bytes: 0, firstPageBytes: 0, firstPageMs: 0, startedAt: new Date().getTime() },
trace: [],
};
function trace(what) {
if (S.trace.length < 80) {
S.trace.push((new Date().getTime() - S.stats.startedAt) + 'ms ' + S.stats.bytes + 'B ' + what);
}
}
M.clear(host);
var root = M.el('div', 'vp');
var bar = M.el('div', 'vp-bar');
var back = M.ui.backButton(function () {
if (!S.dead && typeof ctx.back === 'function') ctx.back();
}, 'dark');
var titles = M.el('div', 'vp-titles');
var title = M.el('h1', 'vp-title', lesson.displayTitle || lesson.title || TXT.untitled);
title.setAttribute('dir', 'auto');
titles.appendChild(title);
var courseTitle = String(course.title || '');
if (courseTitle) {
var sub = M.el('p', 'vp-sub', courseTitle);
sub.setAttribute('dir', 'auto');
titles.appendChild(sub);
}
var pill = M.el('div', 'vp-pill');
pill.setAttribute('role', 'status');
pill.setAttribute('aria-live', 'off');
pill.hidden = true;
M.add(bar, back, titles, pill);
var body = M.el('div', 'vp-body');
var scroller = M.el('div', 'vp-scroll');
scroller.tabIndex = 0;
scroller.setAttribute('role', 'region');
scroller.setAttribute('aria-label', TXT.pages);
var pagesEl = M.el('div', 'vp-pages');
scroller.appendChild(pagesEl);
var stateEl = M.el('div', 'vp-state');
var banner = M.el('div', 'vp-net');
banner.setAttribute('role', 'alert');
banner.hidden = true;
var zoomBox = M.el('div', 'vp-zoom');
zoomBox.hidden = true;
var zIn = zoomButton(ICON_PLUS, TXT.zoomIn, function () { setZoom(S.zoomIdx + 1); });
var zOut = zoomButton(ICON_MINUS, TXT.zoomOut, function () { setZoom(S.zoomIdx - 1); });
M.add(zoomBox, zIn, zOut);
M.add(body, scroller, stateEl, banner, zoomBox);
M.add(root, bar, body);
host.appendChild(root);
syncZoomButtons();
function zoomButton(d, label, fn) {
var b = M.el('button', 'vp-zbtn');
b.type = 'button';
b.setAttribute('aria-label', label);
b.title = label;
b.appendChild(svgIcon(d));
b.addEventListener('click', function () { if (!S.dead) fn(); });
return b;
}
function onScroll() { schedule(); }
function onCtx(e) { if (e && e.preventDefault) e.preventDefault(); }
function onOnline() { if (!S.dead && S.retryFn) S.retryFn(); }
function onResize() {
if (S.dead) return;
clearTimeout(S.resizeT);
S.resizeT = setTimeout(relayout, 150);
}
var passive = false;
try {
var opts = Object.defineProperty({}, 'passive', { get: function () { passive = true; return true; } });
window.addEventListener('vp-test', noop, opts);
window.removeEventListener('vp-test', noop, opts);
} catch (e) { passive = false; }
var scrollOpt = passive ? { passive: true } : false;
scroller.addEventListener('scroll', onScroll, scrollOpt);
pagesEl.addEventListener('contextmenu', onCtx, false);
window.addEventListener('resize', onResize, false);
window.addEventListener('online', onOnline, false);
function later(ms, fn) {
var id = setTimeout(function () {
var i = S.timers.indexOf(id);
if (i >= 0) S.timers.splice(i, 1);
if (!S.dead) fn();
}, ms);
S.timers.push(id);
return id;
}
function wait(ms) {
return new Promise(function (resolve) { later(ms, resolve); });
}
function setState(node) {
S.load = null;
stopSlowWatch();
M.clear(stateEl);
if (node) {
stateEl.appendChild(node);
stateEl.hidden = false;
} else {
stateEl.hidden = true;
}
}
function showLoading() {
var box = M.el('div', 'vp-card vp-load');
var ld = M.ui.loading(TXT.preparing);
var prog = M.el('div', 'vp-prog');
var fill = M.el('div', 'vp-prog-in');
prog.appendChild(fill);
prog.hidden = true;
var hint = M.el('p', 'vp-hint', TXT.slow);
hint.hidden = true;
M.add(box, ld, prog, hint);
setState(box);
S.load = { ld: ld, prog: prog, fill: fill, hint: hint, text: TXT.preparing, pct: -1 };
S.lastProgress = new Date().getTime();
S.slowI = setInterval(slowWatch, 1000);
uiTick();
}
function stopSlowWatch() {
if (S.slowI) { clearInterval(S.slowI); S.slowI = 0; }
}
function slowWatch() {
var L = S.load;
if (!L || S.dead) { stopSlowWatch(); return; }
var idle = now() - S.lastProgress;
var slow = idle > SLOW_MS;
if (L.hint.hidden === slow) L.hint.hidden = !slow;
if (S.mode === 'url' && S.urlBusy && idle > STALL_MS) {
teardownDoc();
fatal(kindErr('net', 'timeout'));
}
}
function progressed() {
S.lastProgress = new Date().getTime();
}
function loadingText() {
if (S.phase === 'prep') return TXT.preparing;
if (S.reqs.length > 0 || S.urlBusy) {
if (S.length > 0) return TXT.downloading + ' ' + arDigits(percent()) + '٪';
return TXT.downloading;
}
return S.phase === 'doc' ? TXT.opening : TXT.downloading;
}
function percent() {
var p = Math.floor(S.received * 100 / S.length);
return p < 0 ? 0 : (p > 99 ? 99 : p);
}
function uiTick() {
var L = S.load;
if (!L || S.first || S.dead) return;
var t = loadingText();
if (t !== L.text) {
L.text = t;
if (L.ld && typeof L.ld.setText === 'function') L.ld.setText(t);
}
var pct = S.phase !== 'prep' && S.length > 0 ? percent() : -1;
if (pct !== L.pct) {
L.pct = pct;
L.prog.hidden = pct < 0;
if (pct >= 0) L.fill.style.width = pct + '%';
}
}
function showMsg(text, iconName) {
var box = M.el('div', 'vp-card vp-msg');
var ic = M.el('div', 'vp-msg-ic');
ic.appendChild(M.icon(iconName));
var p = M.el('p', 'vp-msg-t', text);
M.add(box, ic, p, M.ui.openInAppButton(TXT.open));
setState(box);
}
function showNetError(err, onRetry) {
var box = M.el('div', 'vp-card vp-errcard');
box.appendChild(M.ui.errorState(err, TXT.what, onRetry));
setState(box);
}
function hideChrome() {
pill.hidden = true;
zoomBox.hidden = true;
banner.hidden = true;
}
function req(url, opt) {
return new Promise(function (resolve, reject) {
var ac = null;
try { if (window.AbortController) ac = new window.AbortController(); } catch (e) { ac = null; }
var r = { ac: ac, reader: null, timer: 0, done: false, kill: null, t0: now(), th: 0 };
var list = opt.side ? S.side : S.reqs;
list.push(r);
if (!opt.side) S.stats.requests++;
uiTick();
function finish(err, val) {
if (r.done) return;
r.done = true;
clearTimeout(r.timer);
var i = list.indexOf(r);
if (i >= 0) list.splice(i, 1);
if (err) reject(err); else resolve(val);
uiTick();
}
function kill(kind, why) {
if (r.done) return;
if (r.reader) {
try { var c = r.reader.cancel(); if (c && c.then) c.then(null, noop); } catch (e) {   }
}
if (ac) { try { ac.abort(); } catch (e) {   } }
finish(kindErr(kind, why));
}
function arm(ms) {
clearTimeout(r.timer);
r.timer = setTimeout(function () { kill('net', 'timeout'); }, ms);
}
r.kill = kill;
var init = { method: opt.method || 'GET', credentials: 'omit', mode: 'cors' };
if (opt.range) init.headers = { Range: opt.range };
if (ac) init.signal = ac.signal;
arm(HEADERS_MS);
var p;
try { p = window.fetch(url, init); } catch (e) { finish(kindErr('net', e && e.message)); return; }
p.then(function (res) {
if (r.done) return;
r.th = now();
var st = res.status;
if (!opt.body || (st !== 200 && st !== 206)) {
try {
if (opt.body && res.body && res.body.cancel) {
var cn = res.body.cancel();
if (cn && cn.then) cn.then(null, noop);
}
} catch (e) {   }
finish(null, { status: st, res: res, bytes: null });
return;
}
arm(STALL_MS);
readBody(res, r, function (n) {
arm(STALL_MS);
if (!opt.side) {
S.received += n;
S.stats.bytes += n;
}
progressed();
uiTick();
}).then(function (bytes) {
if (!opt.side) measure(r, bytes.length);
finish(null, { status: st, res: res, bytes: bytes });
}, function (e) {
finish(kindErr('net', (e && e.message) || 'body'));
});
}, function (e) {
finish(kindErr('net', (e && e.message) || 'fetch'));
});
});
}
function measure(r, n) {
if (n < 16384 || !r.th) return;
var lat = Math.max(1, r.th - r.t0);
var bps = n / Math.max(1, now() - r.th);
S.lat = S.lat ? (S.lat + lat) / 2 : lat;
S.bps = S.bps ? (S.bps + bps) / 2 : bps;
var want = Math.floor(S.bps * S.lat / CHUNK) * CHUNK;
S.fetchSize = Math.max(FETCH_MIN, Math.min(FETCH_MAX, want));
}
function readBody(res, r, onChunk) {
var b = res.body;
if (!b || typeof b.getReader !== 'function') {
return res.arrayBuffer().then(function (buf) {
var u = new Uint8Array(buf);
onChunk(u.length);
return u;
});
}
var reader = b.getReader();
r.reader = reader;
var parts = [];
var total = 0;
return new Promise(function (resolve, reject) {
function pump() {
reader.read().then(function (x) {
if (r.done) return;
if (x.done) { resolve(concat(parts, total)); return; }
var v = x.value;
if (v && v.length) {
parts.push(v);
total += v.length;
onChunk(v.length);
}
pump();
}, reject);
}
pump();
});
}
function killAll(side) {
var list = (side ? S.side : S.reqs).slice();
for (var i = 0; i < list.length; i++) list[i].kill('aborted', 'stop');
}
function attempt(fn, tries) {
return fn().then(null, function (e) {
if (S.dead || !e || e.kind !== 'net' || tries <= 1) throw e;
return wait(RETRY_MS).then(function () { return attempt(fn, tries - 1); });
});
}
function sign() {
var p;
try {
p = M.api.signPdf(String(lesson.url || '').replace(/^\s+|\s+$/g, ''), 3600);
} catch (e) {
return Promise.reject(e && e.kind ? e : kindErr('bad', e && e.message));
}
return p.then(function (u) {
if (S.dead) throw kindErr('aborted');
u = String(u || '');
if (!/^https?:\/\/\S+$/i.test(u)) throw kindErr('bad', 'sign');
S.url = u;
S.signedAt = new Date().getTime();
trace('signed');
return u;
}, function (e) {
throw e && e.kind ? e : kindErr('net', e && e.message);
});
}
function resign(usedUrl) {
if (usedUrl && usedUrl !== S.url) return Promise.resolve();
if (new Date().getTime() - S.signedAt < RESIGN_MIN_AGE) return Promise.reject(kindErr('denied', 'fresh'));
if (!S.resigning) {
S.resigning = sign().then(function () {
S.resigning = null;
}, function (e) {
S.resigning = null;
throw e;
});
}
return S.resigning;
}
function headLength() {
return req(S.url, { method: 'HEAD' }).then(function (x) {
if (x.status === 200 || x.status === 206) {
var n = 0;
try { n = parseInt(x.res.headers.get('content-length') || '', 10); } catch (e) { n = 0; }
return n > 0 ? n : 0;
}
var k = statusKind(x.status);
if (k === 'bad') return 0;
throw kindErr(k, 'http-' + x.status);
});
}
function getRange(range) {
var used = S.url;
return req(used, { range: range, body: true }).then(function (x) {
if (x.bytes) return { bytes: x.bytes, full: x.status === 200 };
var e = kindErr(statusKind(x.status), 'http-' + x.status);
e.url = used;
throw e;
});
}
function probe(run) {
S.phase = 'probe';
uiTick();
function soft(e) {
if (S.dead || run !== S.run) throw kindErr('aborted');
return { err: e };
}
var pH = attempt(headLength, 2).then(function (n) {
if (n > 0 && run === S.run) S.length = n;
uiTick();
return { len: n };
}, soft);
var pA = attempt(function () { return getRange('bytes=0-' + (EDGE - 1)); }, 2).then(null, soft);
var pZ = attempt(function () { return getRange('bytes=-' + EDGE); }, 2).then(null, soft);
trace('probe sent');
return Promise.all([pH, pA, pZ]).then(function (r) {
if (S.dead || run !== S.run) throw kindErr('aborted');
trace('probe done, length ' + (r[0].len || 0));
var h = r[0], a = r[1], z = r[2];
var errs = [h.err, a.err, z.err];
for (var i = 0; i < errs.length; i++) {
var k = errs[i] && errs[i].kind;
if (k === 'auth' || k === 'missing') throw kindErr('denied', errs[i].detail);
}
var L = h.len || 0;
if (a.bytes && (a.full || a.bytes.length === L || (!L && a.bytes.length < EDGE))) return { data: a.bytes };
if (z.bytes && (z.full || (L > 0 && z.bytes.length === L))) return { data: z.bytes };
if (!L) {
if (!a.bytes && h.err) throw h.err;
return { url: true };
}
if (z.bytes && z.bytes.length <= L) S.tail = { start: L - z.bytes.length, bytes: z.bytes };
return { length: L, initial: a.bytes && a.bytes.length === EDGE ? a.bytes : null };
});
}
function cacheAt(pos) {
if (S.full && pos < S.full.length) return { s: 0, bytes: S.full };
var t = S.tail;
if (t && pos >= t.start && pos < t.start + t.bytes.length) return { s: t.start, bytes: t.bytes };
for (var i = S.recent.length - 1; i >= 0; i--) {
var r = S.recent[i];
if (pos >= r.s && pos < r.s + r.bytes.length) return r;
}
return null;
}
function fromCache(b, e) {
var c = cacheAt(b);
if (!c || e > c.s + c.bytes.length) return null;
return new Uint8Array(c.bytes.subarray(b - c.s, e - c.s));
}
function remember(s, bytes) {
S.recent.push({ s: s, bytes: bytes });
var total = 0;
for (var i = S.recent.length - 1; i >= 0; i--) {
total += S.recent[i].bytes.length;
if (total > RECENT_MAX && i < S.recent.length - 1) {
S.recent.splice(0, i + 1);
break;
}
}
}
function deliver(run, begin, bytes) {
if (S.dead || run !== S.run || !S.transport) return;
markHave(begin, begin + bytes.length);
try { S.transport.onDataRange(begin, bytes); } catch (e) {   }
}
function markHave(b, e) {
var h = S.have;
if (!h) return;
var last = e >= S.length ? h.length : Math.floor(e / CHUNK);
for (var c = Math.ceil(b / CHUNK); c < last; c++) h[c] = 1;
}
function pendingAt(pos) {
for (var i = 0; i < S.pend.length; i++) {
if (pos >= S.pend[i].b && pos < S.pend[i].e) return S.pend[i];
}
return null;
}
function makeTransport(lib, length, initial) {
var t = new lib.PDFDataRangeTransport(length, initial);
t.requestDataRange = function (begin, end) {
fetchRange({ begin: begin, end: end, tries: 0 });
};
t.abort = function () { killAll(); };
S.have = new Uint8Array(Math.ceil(length / CHUNK));
if (initial) markHave(0, initial.length);
if (S.tail) markHave(S.tail.start, length);
return t;
}
function startFetch(b, e, run) {
var t = S.tail;
var stop = t && b < t.start && e > t.start ? t.start : e;
var p = { b: b, e: e, promise: null };
S.pend.push(p);
S.stats.ranges++;
trace('range ' + b + '-' + stop + (stop !== e ? ' (+tail to ' + e + ')' : ''));
p.promise = getRange('bytes=' + b + '-' + (stop - 1)).then(function (x) {
drop(p);
if (S.dead || run !== S.run) throw kindErr('aborted');
trace('got ' + b + '-' + stop);
if (x.full) {
if (x.bytes.length < e) throw kindErr('net', 'short-full');
S.full = x.bytes;
return x.bytes.subarray(b, e);
}
if (x.bytes.length !== stop - b) throw kindErr('net', 'short');
if (stop === e) return x.bytes;
var out = new Uint8Array(e - b);
out.set(x.bytes, 0);
out.set(t.bytes.subarray(0, e - t.start), t.start - b);
return out;
}, function (err) {
drop(p);
throw err;
});
return p;
}
function drop(p) {
var i = S.pend.indexOf(p);
if (i >= 0) S.pend.splice(i, 1);
}
function inRecent(pos) {
var c = cacheAt(pos);
return !!c && c.bytes !== (S.tail && S.tail.bytes);
}
function haveAt(pos) {
return !!(S.have && S.have[Math.floor(pos / CHUNK)]);
}
function fetchRange(job) {
if (S.dead) return;
var run = S.run;
var hit = fromCache(job.begin, job.end);
if (hit) {
trace('cache ' + job.begin + '-' + job.end);
Promise.resolve().then(function () { deliver(run, job.begin, hit); });
return;
}
job.tries++;
var L = S.length;
var parts = [];
var waits = [];
var pos = job.begin;
while (pos < job.end) {
var c = cacheAt(pos);
if (c) {
var cf = Math.min(job.end, c.s + c.bytes.length);
parts.push({ s: pos, f: cf, p: null });
waits.push(c.bytes.subarray(pos - c.s, cf - c.s));
pos = cf;
continue;
}
var p = pendingAt(pos);
if (p) {
trace('join ' + pos + ' in ' + p.b + '-' + p.e);
} else {
var want = pos;
var limit = Math.min(L, Math.max(job.end, pos + S.fetchSize));
do {
want = Math.min(L, want + CHUNK);
} while (want < limit && !pendingAt(want) && (want < job.end ? !inRecent(want) : !haveAt(want)));
p = startFetch(pos, want, run);
}
parts.push({ s: pos, f: Math.min(job.end, p.e), p: p });
waits.push(p.promise);
pos = Math.min(job.end, p.e);
}
Promise.all(waits).then(function (arr) {
if (S.dead || run !== S.run) return;
var last = parts[parts.length - 1];
var end = last.p ? Math.max(job.end, last.p.e) : job.end;
var out = new Uint8Array(end - job.begin);
for (var i = 0; i < parts.length; i++) {
var pt = parts[i];
var src = arr[i];
if (pt.p) {
var f = i === parts.length - 1 ? pt.p.e : pt.f;
src = src.subarray(pt.s - pt.p.b, f - pt.p.b);
}
out.set(src, pt.s - job.begin);
}
remember(job.begin, out);
deliver(run, job.begin, new Uint8Array(out));
}).then(null, function (e) {
if (S.dead || run !== S.run || !e || e.kind === 'aborted') return;
rangeFailed(job, e, run);
});
}
function rangeFailed(job, e, run) {
if (e.kind === 'auth') {
resign(e.url).then(function () {
if (!S.dead && run === S.run) fetchRange(job);
}, function (e2) {
if (S.dead || run !== S.run) return;
if (e2 && e2.kind === 'net') park(job, e2);
else fatal(kindErr('denied', e2 && e2.detail));
});
return;
}
if (e.kind === 'net' && job.tries < 2) {
later(RETRY_MS, function () { if (run === S.run) fetchRange(job); });
return;
}
if (e.kind === 'net') { park(job, e); return; }
fatal(e);
}
function park(job, err) {
S.failed.push(job);
S.retryFn = retryParked;
if (S.failed.length === 1) showNetIssue(err);
}
function showNetIssue(err) {
if (!S.first) {
showNetError(err, retryParked);
return;
}
M.clear(banner);
var t = M.el('p', 'vp-net-t', M.errText(err, TXT.whatRest));
var b = M.el('button', 'vp-net-btn', TXT.retry);
b.type = 'button';
b.addEventListener('click', function () { if (!S.dead) retryParked(); });
M.add(banner, t, b);
banner.hidden = false;
}
function retryParked() {
if (S.dead) return;
var jobs = S.failed;
S.failed = [];
S.retryFn = null;
banner.hidden = true;
if (!S.first) showLoading();
for (var i = 0; i < jobs.length; i++) {
jobs[i].tries = 0;
fetchRange(jobs[i]);
}
}
function pdfErr(e) {
if (e && e.kind) return e;
var name = (e && e.name) || '';
var msg = String((e && e.message) || e || '');
if (name === 'PasswordException' || name === 'InvalidPDFException' || name === 'FormatError') return kindErr('broken', name);
if (name === 'MissingPDFException') return kindErr('missing', name);
if (name === 'UnexpectedResponseException') {
var k = statusKind(e.status | 0);
return kindErr(k === 'bad' ? 'broken' : k, 'http-' + e.status);
}
if (name === 'AbortException' || name === 'RenderingCancelledException' || /destroyed/i.test(msg)) return kindErr('aborted', msg);
if (/fake worker|Cannot load script/i.test(msg)) {
var we = kindErr('net', msg);
we.reload = true;
return we;
}
if (S.mode === 'url' && /fetch|network|load failed/i.test(msg)) return kindErr('net', msg);
return kindErr('broken', (name + ' ' + msg).replace(/^\s+/, ''));
}
function fatal(err) {
if (S.dead || !err || err.kind === 'aborted') return;
if (err.kind === 'net') {
hideChrome();
S.retryFn = err.reload ? null : restart;
showNetError(err, err.reload ? reloadPage : restart);
return;
}
teardownDoc();
S.final = true;
dropWorker();
if (err.kind === 'old') showMsg(TXT.oldBrowser, 'info');
else if (err.kind === 'broken') showMsg(TXT.broken, 'file');
else showMsg(TXT.unavailable, 'lock');
}
function reloadPage() {
try { window.location.reload(); } catch (e) {   }
}
function loadLib() {
var have = window.pdfjsLib && typeof window.pdfjsLib.getDocument === 'function';
var p = have ? Promise.resolve() : M.loadScript(LIB_DIR + 'pdf.min.js');
return p.then(function () {
var lib = window.pdfjsLib;
if (!lib || typeof lib.getDocument !== 'function' || typeof lib.PDFDataRangeTransport !== 'function') {
throw kindErr('old', 'pdfjs');
}
try {
lib.GlobalWorkerOptions.workerSrc = absUrl(LIB_DIR + 'pdf.worker.min.js');
} catch (e) {
throw kindErr('old', 'workerSrc');
}
return lib;
}, function (e) {
throw e && e.kind ? e : kindErr('net', e && e.message);
});
}
function dropWorker() {
killAll(true);
var pw = S.worker;
var raw = S.workerRaw;
S.worker = null;
S.workerRaw = null;
S.workerP = null;
if (!pw && !raw) return;
var done = false;
var kill = function () {
if (done) return;
done = true;
if (pw) { try { pw.destroy(); } catch (e) {   } }
if (raw) { try { raw.terminate(); } catch (e) {   } }
};
if (S.closing) {
S.closing.then(kill, kill);
setTimeout(kill, WORKER_KILL_MS);
} else {
kill();
}
}
function workerSource() {
if (workerUrl) return Promise.resolve(workerUrl);
var src = absUrl(LIB_DIR + 'pdf.worker.min.js');
return attempt(function () {
return req(src, { body: true, side: true }).then(function (x) {
if (!x.bytes || !x.bytes.length) throw kindErr('net', 'http-' + x.status);
return x.bytes;
});
}, 2).then(function (bytes) {
try {
return window.URL.createObjectURL(new window.Blob([bytes], { type: 'application/javascript' }));
} catch (e) {
return '';
}
});
}
function spawnWorker(src) {
if (!src) return Promise.resolve(null);
return new Promise(function (resolve, reject) {
var w = null;
try { w = new window.Worker(src); } catch (e) { w = null; }
if (!w) { resolve(null); return; }
var done = false;
var timer = setTimeout(function () { end(kindErr('net', 'timeout')); }, WORKER_READY_MS);
function end(err) {
if (done) return;
done = true;
clearTimeout(timer);
w.removeEventListener('message', onMsg, false);
w.removeEventListener('error', onErr, false);
if (!err) {
workerUrl = src;
resolve(w);
return;
}
try { w.terminate(); } catch (e) {   }
if (workerUrl === src) workerUrl = '';
try { window.URL.revokeObjectURL(src); } catch (e) {   }
reject(err);
}
function onMsg(e) {
var d = e && e.data;
if (d && d.action === 'ready' && d.targetName === 'main') end(null);
}
function onErr(e) {
if (e && e.preventDefault) e.preventDefault();
end(kindErr('net', 'worker'));
}
w.addEventListener('message', onMsg, false);
w.addEventListener('error', onErr, false);
});
}
function warmWorker(lib) {
if (S.workerP) return S.workerP;
var p = workerSource().then(function (src) {
if (S.dead || S.final || S.workerP !== p) {
if (src && src !== workerUrl) { try { window.URL.revokeObjectURL(src); } catch (e) {   } }
throw kindErr('aborted');
}
return spawnWorker(src);
}).then(function (w) {
if (S.dead || S.final || S.workerP !== p) {
if (w) { try { w.terminate(); } catch (e) {   } }
throw kindErr('aborted');
}
if (!w) return null;
try {
S.worker = new lib.PDFWorker({ name: 'mec-pdf', port: w, verbosity: 0 });
S.workerRaw = w;
} catch (e) {
try { w.terminate(); } catch (e2) {   }
S.worker = null;
}
trace('worker ready');
return S.worker;
});
S.workerP = p;
p.then(null, function () {
if (S.workerP === p) S.workerP = null;
});
return p;
}
function start() {
var run = S.run;
S.phase = 'prep';
hideChrome();
showLoading();
if (!supported()) { fatal(kindErr('old', 'features')); return; }
if (!String(lesson.url || '').replace(/\s+/g, '')) { fatal(kindErr('missing', 'no path')); return; }
var libP = loadLib().then(function (lib) {
trace('lib ready');
return warmWorker(lib).then(function () { return lib; });
});
var docP = sign().then(function () {
if (S.dead || run !== S.run) throw kindErr('aborted');
return probe(run);
});
Promise.all([libP, docP]).then(function (r) {
if (S.dead || run !== S.run) return;
openDoc(r[0], r[1], run);
}).then(null, function (e) {
if (S.dead || run !== S.run) return;
fatal(e && e.kind ? e : pdfErr(e));
});
}
function restart() {
if (S.dead) return;
teardownDoc();
start();
}
function openDoc(lib, info, run) {
S.phase = 'doc';
var params = {
isEvalSupported: false,
cMapUrl: absUrl(LIB_DIR + 'cmaps/'),
cMapPacked: true,
standardFontDataUrl: absUrl(LIB_DIR + 'standard_fonts/'),
disableStream: true,
disableAutoFetch: false,
verbosity: 0,
};
if (S.worker && !S.worker.destroyed) params.worker = S.worker;
if (info.data) {
S.mode = 'data';
params.data = info.data;
} else if (info.length) {
S.mode = 'range';
S.length = info.length;
S.transport = makeTransport(lib, info.length, info.initial);
params.range = S.transport;
params.length = info.length;
params.rangeChunkSize = CHUNK;
} else {
S.mode = 'url';
S.length = 0;
S.received = 0;
S.urlBusy = true;
progressed();
params.url = S.url;
params.disableRange = true;
}
S.stats.mode = S.mode;
uiTick();
var task;
try {
task = lib.getDocument(params);
} catch (e) {
fatal(pdfErr(e));
return;
}
S.task = task;
if (S.mode === 'url') {
var base = S.stats.bytes;
task.onProgress = function (p) {
if (S.dead || task !== S.task) return;
var loaded = (p && p.loaded) || 0;
S.received = loaded;
S.stats.bytes = base + loaded;
if (p && p.total > 0) S.length = p.total;
progressed();
uiTick();
};
}
trace('getDocument ' + S.mode);
task.promise.then(function (pdf) {
if (S.dead || task !== S.task) return null;
S.urlBusy = false;
S.pdf = pdf;
trace('doc ready, pages ' + pdf.numPages);
uiTick();
return pdf.getPage(1).then(function (page) {
if (S.dead || task !== S.task) return;
trace('page 1 ready');
buildPages(pdf.numPages, page);
});
}).then(null, function (e) {
if (S.dead || task !== S.task) return;
S.urlBusy = false;
var err = pdfErr(e);
if (err.kind === 'auth') {
if (!S.authRetried && new Date().getTime() - S.signedAt > RESIGN_MIN_AGE) {
S.authRetried = true;
restart();
return;
}
err = kindErr('denied', err.detail);
}
fatal(err);
});
}
function teardownDoc() {
S.run++;
killAll();
if (S.job) abandonJob();
if (S.io) {
try { S.io.disconnect(); } catch (e) {   }
S.io = null;
}
var task = S.task;
S.task = null;
if (task) {
try {
var d = task.destroy();
if (d && d.then) {
var c = d.then(noop, noop);
S.closing = c;
c.then(function () { if (S.closing === c) S.closing = null; });
}
} catch (e) {   }
}
for (var i = 0; i < S.pages.length; i++) zap(S.pages[i].canvas);
S.pages = [];
S.live = {};
M.clear(pagesEl);
S.pdf = null;
S.transport = null;
S.full = null;
S.tail = null;
S.have = null;
S.pend = [];
S.recent = [];
S.failed = [];
S.retryFn = null;
S.mode = '';
S.length = 0;
S.received = 0;
S.urlBusy = false;
S.first = false;
S.cur = -1;
S.vis = null;
hideChrome();
}
function buildPages(n, page1) {
var vp = page1.getViewport({ scale: 1 });
var ratio = vp.height / vp.width;
if (!(ratio > 0) || !isFinite(ratio)) ratio = 1.4142;
M.clear(pagesEl);
S.pages = [];
S.live = {};
var frag = document.createDocumentFragment();
for (var i = 0; i < n; i++) {
var el = M.el('div', 'vp-page');
var num = M.el('span', 'vp-pnum', String(i + 1));
el.appendChild(num);
frag.appendChild(el);
S.pages.push({
el: el, num: num, ratio: ratio, known: i === 0,
canvas: null, cz: 0, cw: 0, failed: false, proxy: i === 0 ? page1 : null,
});
}
pagesEl.appendChild(frag);
layoutAll();
scroller.scrollTop = 0;
scroller.scrollLeft = 0;
S.cur = -1;
if (window.IntersectionObserver) {
try {
S.io = new window.IntersectionObserver(function () { schedule(); }, {
root: scroller, threshold: [0, 0.5, 1],
});
for (var j = 0; j < S.pages.length; j++) S.io.observe(S.pages[j].el);
} catch (e) {
S.io = null;
}
}
update();
}
function sidePad() {
var v = 8;
try {
var l = parseFloat(window.getComputedStyle(pagesEl).paddingLeft);
if (l >= 0) v = l;
} catch (e) {   }
return v;
}
function layoutAll() {
var cw = scroller.clientWidth || window.innerWidth || 360;
S.lastCw = cw;
S.W = Math.floor(Math.min(MAX_W, Math.max(120, cw - 2 * sidePad())));
var w = Math.round(S.W * ZOOMS[S.zoomIdx]);
for (var i = 0; i < S.pages.length; i++) sizePage(S.pages[i], w);
}
function sizePage(p, w) {
p.el.style.width = w + 'px';
p.el.style.height = Math.round(w * p.ratio) + 'px';
}
function relayout() {
if (S.dead || !S.pages.length) return;
var cw = scroller.clientWidth;
if (cw === S.lastCw) { schedule(); return; }
var oldW = S.W;
withAnchor(layoutAll);
if (S.W !== oldW && S.job) abandonJob();
update();
}
function withAnchor(fn) {
var v = S.pages.length ? visibleRange() : null;
var a = null;
if (v) {
var el = S.pages[v.cur].el;
a = {
i: v.cur,
f: (scroller.scrollTop - (pagesEl.offsetTop + el.offsetTop)) / Math.max(1, el.offsetHeight),
cx: (scroller.scrollLeft + scroller.clientWidth / 2) / Math.max(1, scroller.scrollWidth),
};
}
fn();
if (!a || !S.pages[a.i]) return;
var e2 = S.pages[a.i].el;
scroller.scrollTop = Math.round(pagesEl.offsetTop + e2.offsetTop + a.f * e2.offsetHeight);
var sw = scroller.scrollWidth;
var cw = scroller.clientWidth;
scroller.scrollLeft = sw > cw ? Math.max(0, Math.round(a.cx * sw - cw / 2)) : 0;
}
function visibleRange() {
var n = S.pages.length;
if (!n) return null;
var st = scroller.scrollTop;
var h = scroller.clientHeight || 1;
var base = pagesEl.offsetTop;
var lo = 0, hi = n - 1, mid, el;
while (lo < hi) {
mid = (lo + hi) >> 1;
el = S.pages[mid].el;
if (base + el.offsetTop + el.offsetHeight <= st) lo = mid + 1; else hi = mid;
}
var first = lo, last = lo, best = lo, bestVis = -1;
for (var i = lo; i < n; i++) {
el = S.pages[i].el;
var top = base + el.offsetTop;
if (i > first && top >= st + h) break;
last = i;
var vis = Math.min(top + el.offsetHeight, st + h) - Math.max(top, st);
if (vis > bestVis + 0.5) { bestVis = vis; best = i; }
}
if (last === n - 1 && st + h >= scroller.scrollHeight - 2) best = last;
return { first: first, last: last, cur: best };
}
function schedule() {
if (S.raf || S.dead) return;
var raf = window.requestAnimationFrame;
if (raf) {
S.rafIsTimer = false;
S.raf = raf(function () { S.raf = 0; update(); });
} else {
S.rafIsTimer = true;
S.raf = setTimeout(function () { S.raf = 0; update(); }, 80);
}
}
function update() {
if (S.dead || !S.pdf || !S.pages.length) return;
var v = visibleRange();
if (!v) return;
S.vis = v;
if (v.cur !== S.cur) {
S.cur = v.cur;
setPill();
}
var lo = Math.max(0, v.first - 1);
var hi = Math.min(S.pages.length - 1, v.last + 1);
if (S.job && (S.job.i < lo || S.job.i > hi)) abandonJob();
freeFar(v);
pump();
}
function setPill() {
var n = S.pages.length;
pill.textContent = (S.cur + 1) + ' / ' + n;
pill.setAttribute('aria-label', TXT.pageOf(S.cur + 1, n));
}
function freeFar(v) {
var keep = S.zoomIdx > 0 ? 1 : 3;
for (var k in S.live) {
if (!Object.prototype.hasOwnProperty.call(S.live, k)) continue;
var i = +k;
if (i < v.first - keep || i > v.last + keep) freePage(i);
}
}
function freePage(i) {
delete S.live[i];
var p = S.pages[i];
if (!p) return;
zap(p.canvas);
p.canvas = null;
p.cz = 0;
p.cw = 0;
if (!p.failed) p.el.className = 'vp-page';
if (p.proxy && !(S.job && S.job.i === i)) {
try { p.proxy.cleanup(); } catch (e) {   }
}
}
function pump() {
if (S.dead || S.job || !S.pdf) return;
var i = pickNext();
if (i >= 0) renderPage(i);
}
function pickNext() {
var v = S.vis;
if (!v) return -1;
var z = ZOOMS[S.zoomIdx];
var lo = Math.max(0, v.first - 1);
var hi = Math.min(S.pages.length - 1, v.last + 1);
var best = -1, bestScore = 1e9;
for (var i = lo; i <= hi; i++) {
var p = S.pages[i];
if (p.failed) continue;
if (p.canvas && p.cz === z && p.cw === S.W) continue;
var score = Math.abs(i - v.cur) + (i < v.first || i > v.last ? 100 : 0);
if (score < bestScore) { bestScore = score; best = i; }
}
return best;
}
function abandonJob() {
var job = S.job;
if (!job) return;
S.job = null;
job.dead = true;
if (job.task) { try { job.task.cancel(); } catch (e) {   } }
zap(job.canvas);
var p = S.pages[job.i];
if (p && !p.canvas && !p.failed) p.el.className = 'vp-page';
}
function renderPage(i) {
var p = S.pages[i];
var job = { i: i, dead: false, task: null, canvas: null, z: ZOOMS[S.zoomIdx], W: S.W };
S.job = job;
if (!p.canvas) p.el.className = 'vp-page is-loading';
var pageP = p.proxy ? Promise.resolve(p.proxy) : S.pdf.getPage(i + 1);
pageP.then(function (page) {
if (job.dead || S.dead) return null;
p.proxy = page;
var vp1 = page.getViewport({ scale: 1 });
var ratio = vp1.height / vp1.width;
if (!p.known) {
p.known = true;
if (ratio > 0 && isFinite(ratio) && Math.abs(ratio - p.ratio) > 0.002) {
withAnchor(function () {
p.ratio = ratio;
sizePage(p, Math.round(S.W * ZOOMS[S.zoomIdx]));
});
}
}
var cssW = Math.round(job.W * job.z);
var cssH = Math.round(cssW * p.ratio);
var out = Math.min(window.devicePixelRatio || 1, MAX_DPR);
if (cssW * cssH * out * out > MAX_PIXELS) out = Math.sqrt(MAX_PIXELS / (cssW * cssH));
var vp = page.getViewport({ scale: (cssW / vp1.width) * out });
var canvas = document.createElement('canvas');
canvas.className = 'vp-canvas';
canvas.width = Math.max(1, Math.floor(vp.width));
canvas.height = Math.max(1, Math.floor(vp.height));
var c2d = canvas.getContext('2d', { alpha: false });
if (!c2d) throw kindErr('old', 'canvas');
job.canvas = canvas;
trace('render ' + (i + 1) + ' start');
job.task = page.render({ canvasContext: c2d, viewport: vp });
return job.task.promise.then(function () {
if (job.dead || S.dead) { zap(canvas); return; }
job.canvas = null;
if (p.canvas) zap(p.canvas);
p.el.appendChild(canvas);
p.canvas = canvas;
p.cz = job.z;
p.cw = job.W;
p.failed = false;
p.num.textContent = String(i + 1);
p.el.className = 'vp-page is-ready';
S.live[i] = true;
if (!S.first) firstPainted();
});
}).then(null, function (e) {
if (job.dead || S.dead) return;
var err = pdfErr(e);
if (err.kind === 'aborted') return;
zap(job.canvas);
job.canvas = null;
if (!S.first) {
S.job = null;
fatal(err);
return;
}
p.failed = true;
if (!p.canvas) {
p.num.textContent = TXT.pageFailed;
p.el.className = 'vp-page is-failed';
}
}).then(function () {
if (S.job === job) S.job = null;
if (!S.dead && !job.dead) pump();
});
}
function firstPainted() {
trace('first paint');
S.first = true;
S.stats.firstPageBytes = S.stats.bytes;
S.stats.firstPageMs = new Date().getTime() - S.stats.startedAt;
setState(null);
pill.hidden = false;
zoomBox.hidden = false;
syncZoomButtons();
if (S.failed.length) showNetIssue(kindErr('net', 'parked'));
try { scroller.focus({ preventScroll: true }); } catch (e) {   }
}
function syncZoomButtons() {
var atMax = S.zoomIdx >= ZOOMS.length - 1;
var atMin = S.zoomIdx <= 0;
zIn.setAttribute('aria-disabled', atMax ? 'true' : 'false');
zOut.setAttribute('aria-disabled', atMin ? 'true' : 'false');
zIn.className = 'vp-zbtn' + (atMax ? ' is-off' : '');
zOut.className = 'vp-zbtn' + (atMin ? ' is-off' : '');
}
function setZoom(idx) {
idx = Math.max(0, Math.min(ZOOMS.length - 1, idx));
if (idx === S.zoomIdx || !S.pages.length) return;
withAnchor(function () {
S.zoomIdx = idx;
layoutAll();
});
for (var i = 0; i < S.pages.length; i++) {
var p = S.pages[i];
if (p.failed) {
p.failed = false;
p.num.textContent = String(i + 1);
p.el.className = 'vp-page';
}
}
if (S.job) abandonJob();
syncZoomButtons();
update();
}
function destroy() {
if (S.dead) return;
teardownDoc();
S.dead = true;
scroller.removeEventListener('scroll', onScroll, scrollOpt);
pagesEl.removeEventListener('contextmenu', onCtx, false);
window.removeEventListener('resize', onResize, false);
window.removeEventListener('online', onOnline, false);
clearTimeout(S.resizeT);
stopSlowWatch();
if (S.raf) {
if (S.rafIsTimer || !window.cancelAnimationFrame) clearTimeout(S.raf);
else window.cancelAnimationFrame(S.raf);
S.raf = 0;
}
for (var i = 0; i < S.timers.length; i++) clearTimeout(S.timers[i]);
S.timers = [];
dropWorker();
S.load = null;
if (root.parentNode) root.parentNode.removeChild(root);
}
start();
return {
destroy: destroy,
stats: function () {
return {
mode: S.stats.mode,
requests: S.stats.requests,
ranges: S.stats.ranges,
bytes: S.stats.bytes,
length: S.length,
fetchSize: S.fetchSize,
latencyMs: Math.round(S.lat),
kbps: Math.round(S.bps * 1000 / 1024),
firstPageBytes: S.stats.firstPageBytes,
firstPageMs: S.stats.firstPageMs,
pages: S.pages.length,
current: S.cur + 1,
zoom: ZOOMS[S.zoomIdx],
liveCanvases: (function () { var c = 0; for (var k in S.live) if (Object.prototype.hasOwnProperty.call(S.live, k)) c++; return c; })(),
inflight: S.reqs.length,
destroyed: S.dead,
trace: S.trace.slice(),
};
},
};
}
window.MEC_VIEWERS = window.MEC_VIEWERS || {};
window.MEC_VIEWERS.pdf = { mount: mount };
})();
