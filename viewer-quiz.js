(function () {
'use strict';
var VIEWERS = window.MEC_VIEWERS = window.MEC_VIEWERS || {};
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var HTTPS_RE = /^https:\/\/[^\s"'<>\\]+$/i;
var LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي'];
var DEFAULT_MIN = 20;
var MAX_MIN = 600;
var FIRST_BATCH = 12;
var BATCH = 20;
var TICK_MS = 500;
var SVG_NS = 'http://www.w3.org/2000/svg';
var RING_C = 56.549;
var rpcMissing = false;
var T = {
quizTitle: 'الامتحان',
quizSub: 'أسئلة هامة مجانية',
loading: 'عم نجيب الأسئلة…',
what: 'أسئلة الاختبار',
emptyTitle: 'لا توجد أسئلة',
emptyText: 'افتح الاختبار بالتطبيق لتشوف أسئلته.',
openApp: 'افتح بالتطبيق',
mcq: 'اختيار من متعدد',
qn: function (n) { return 'السؤال ' + n; },
hint: 'عرض التلميح',
answered: 'أُجيب',
answeredAria: 'الأسئلة المُجاب عليها',
timeLeft: 'الوقت المتبقي',
submit: 'إنهاء وإرسال الامتحان',
unTitle: 'أسئلة غير مُجاب عليها',
unMsg: 'هل تود الإرسال مع بقاء أسئلة بدون إجابة؟',
cancel: 'إلغاء',
send: 'إرسال',
timeUp: 'خلص الوقت — صحّحنالك الامتحان',
result: 'نتيجتك',
time: 'الوقت: ',
showAnswers: 'عرض الإجابات',
again: 'حلّ جديد',
continueApp: 'كمّل الدورة بالتطبيق',
leaveMsg: 'إذا طلعت رح تضيع إجاباتك.',
leave: 'طلوع',
stay: 'كمّل',
srCorrect: 'الإجابة الصحيحة',
srMine: 'إجابتك',
};
var BANDS = [
{ min: 85, cls: 'q-band-hi', title: 'ممتاز', msg: 'نتيجة رائعة!' },
{ min: 60, cls: 'q-band-mid', title: 'جيد', msg: 'يمكنك التحسين أكثر.' },
{ min: 0, cls: 'q-band-lo', title: 'أعد المحاولة', msg: 'حاول مجددًا لتحسين نتيجتك.' },
];
var P = {
bulb: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z',
send: 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z',
refresh: 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
quiz: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
};
var isArray = Array.isArray || function (v) {
return Object.prototype.toString.call(v) === '[object Array]';
};
function sv(v) {
if (v === null || v === undefined) return '';
var s = String(v);
return s === 'null' || s === 'undefined' ? '' : s;
}
function trim(s) { return sv(s).replace(/^\s+|\s+$/g, ''); }
function nowMs() {
var p = window.performance;
if (p && typeof p.now === 'function') return p.now();
return new Date().getTime();
}
function pad2(n) { return n < 10 ? '0' + n : String(n); }
function fmtTime(sec) {
sec = Math.max(0, Math.floor(sec));
var h = Math.floor(sec / 3600);
var m = Math.floor((sec % 3600) / 60);
var s = sec % 60;
return h > 0 ? h + ':' + pad2(m) + ':' + pad2(s) : pad2(m) + ':' + pad2(s);
}
function shuffle(a) {
for (var i = a.length - 1; i > 0; i--) {
var j = Math.floor(Math.random() * (i + 1));
var t = a[i]; a[i] = a[j]; a[j] = t;
}
return a;
}
function toIndex(v) {
if (typeof v === 'number') return isFinite(v) && Math.floor(v) === v ? v : -1;
if (typeof v === 'string' && /^\s*\d{1,4}\s*$/.test(v)) return parseInt(v, 10);
return -1;
}
function optText(v) {
if (typeof v === 'string') return trim(v);
if (typeof v === 'number' && isFinite(v)) return String(v);
return '';
}
function httpsUrl(v) {
var s = trim(v);
return HTTPS_RE.test(s) ? s : '';
}
function parseMaybe(v) {
if (typeof v !== 'string') return v;
try { return JSON.parse(v); } catch (e) { return null; }
}
function normalise(rows) {
var out = [];
if (!isArray(rows)) return out;
for (var i = 0; i < rows.length; i++) {
var r = rows[i];
if (!r || typeof r !== 'object') continue;
var opts = parseMaybe(r.options);
if (!isArray(opts) || opts.length < 2) continue;
var ci = toIndex(r.correct_index);
if (ci < 0 || ci >= opts.length) continue;
var list = [];
var keptCorrect = false;
for (var j = 0; j < opts.length; j++) {
var t = optText(opts[j]);
if (!t) continue;
list.push({ t: t, ok: j === ci });
if (j === ci) keptCorrect = true;
}
if (!keptCorrect || list.length < 2) continue;
var q = trim(r.question);
var img = httpsUrl(r.image);
if (!q && !img) continue;
out.push({ id: sv(r.id), q: q, img: img, hint: trim(r.hint), opts: list });
}
return out;
}
function extract(data) {
data = parseMaybe(data);
if (isArray(data)) return { rows: data, minutes: 0, title: '' };
if (!data || typeof data !== 'object' || data.found === false) {
return { rows: [], minutes: 0, title: '', notFound: true };
}
var qs = parseMaybe(data.questions);
return {
rows: isArray(qs) ? qs : [],
minutes: toIndex(data.minutes) > 0 ? toIndex(data.minutes) : 0,
title: trim(data.title),
};
}
function buildAttempt(base) {
var qs = [];
for (var i = 0; i < base.length; i++) {
var opts = shuffle(base[i].opts.slice(0));
var correct = -1;
for (var j = 0; j < opts.length; j++) if (opts[j].ok) { correct = j; break; }
qs.push({ src: base[i], opts: opts, correct: correct, sel: -1, hintOpen: false, els: null });
}
return shuffle(qs);
}
function bandOf(pct) {
for (var i = 0; i < BANDS.length; i++) if (pct >= BANDS[i].min) return BANDS[i];
return BANDS[BANDS.length - 1];
}
function svgIcon(path, cls) {
var s = document.createElementNS(SVG_NS, 'svg');
s.setAttribute('viewBox', '0 0 24 24');
s.setAttribute('aria-hidden', 'true');
s.setAttribute('focusable', 'false');
s.setAttribute('class', 'q-ic' + (cls ? ' ' + cls : ''));
var p = document.createElementNS(SVG_NS, 'path');
p.setAttribute('d', path);
s.appendChild(p);
return s;
}
function hasClass(n, c) { return (' ' + n.className + ' ').indexOf(' ' + c + ' ') >= 0; }
function setClass(n, c, on) {
var has = hasClass(n, c);
if (on && !has) n.className = n.className ? n.className + ' ' + c : c;
else if (!on && has) n.className = trim((' ' + n.className + ' ').replace(' ' + c + ' ', ' '));
}
function detach(n) { if (n && n.parentNode) n.parentNode.removeChild(n); }
function mount(host, lesson, ctx) {
var MEC = window.MEC;
var el = MEC.el;
var add = MEC.add;
lesson = lesson || {};
ctx = ctx || {};
var course = ctx.course || {};
var lessonId = trim(lesson.id);
var quizId = trim(lesson.url);
var uid = 'mq' + Math.floor(Math.random() * 1e9).toString(36);
var S = {
dead: false,
phase: 'loading',
base: null,
qs: [],
answered: 0,
durSec: minutesOf(0) * 60,
startedAt: 0,
deadline: 0,
shown: -1,
tick: null,
chunk: null,
popT: null,
rendered: 0,
result: null,
stripe: null,
submitBtn: null,
dialog: null,
unload: false,
loadSeq: 0,
};
function minutesOf(fromServer) {
var m = MEC.int(lesson.minutes);
if (!(m > 0)) m = fromServer > 0 ? fromServer : DEFAULT_MIN;
return Math.min(MAX_MIN, Math.max(1, m));
}
function ui(name) {
return !!(MEC.ui && typeof MEC.ui[name] === 'function');
}
function toast(text, kind) {
if (ui('toast')) { try { MEC.ui.toast(text, kind); } catch (e) {   } }
}
function scrollTop() {
try { window.scrollTo(0, 0); } catch (e) {   }
}
if (!hasClass(host, 'viewer-quiz')) setClass(host, 'viewer-quiz', true);
MEC.clear(host);
var root = el('div', 'q-root q-st-loading');
root.setAttribute('dir', 'rtl');
var head = el('div', 'q-head');
var headIn = el('div', 'q-head-in');
var row1 = el('div', 'q-row1');
var backBtn = ui('backButton') ? MEC.ui.backButton(onBack, 'frost') : null;
if (!backBtn) {
backBtn = el('button', 'q-back-fallback', '→');
backBtn.type = 'button';
backBtn.setAttribute('aria-label', 'رجوع');
backBtn.onclick = onBack;
}
var titles = el('div', 'q-titles');
var titleText = trim(lesson.displayTitle) || trim(lesson.title) || T.quizTitle;
var h1 = el('h1', 'q-title', titleText);
h1.setAttribute('dir', 'auto');
var sub = el('div', 'q-sub', trim(course.title) || T.quizSub);
sub.setAttribute('dir', 'auto');
add(titles, h1, sub);
var timeBox = el('div', 'q-time');
timeBox.setAttribute('role', 'timer');
timeBox.setAttribute('aria-label', T.timeLeft);
var ring = document.createElementNS(SVG_NS, 'svg');
ring.setAttribute('viewBox', '0 0 24 24');
ring.setAttribute('aria-hidden', 'true');
ring.setAttribute('focusable', 'false');
ring.setAttribute('class', 'q-ring');
var ringBg = document.createElementNS(SVG_NS, 'circle');
var ringFg = document.createElementNS(SVG_NS, 'circle');
var ci;
for (ci = 0; ci < 2; ci++) {
var c = ci ? ringFg : ringBg;
c.setAttribute('cx', '12');
c.setAttribute('cy', '12');
c.setAttribute('r', '9');
c.setAttribute('class', ci ? 'q-ring-fg' : 'q-ring-bg');
}
ringFg.setAttribute('stroke-dasharray', String(RING_C));
ringFg.setAttribute('stroke-dashoffset', String(RING_C));
ringFg.setAttribute('transform', 'rotate(-90 12 12)');
ring.appendChild(ringBg);
ring.appendChild(ringFg);
var timeTxt = el('span', 'q-time-txt', fmtTime(S.durSec));
timeTxt.setAttribute('dir', 'ltr');
add(timeBox, ring, timeTxt);
add(row1, backBtn, titles, timeBox);
var row2 = el('div', 'q-row2');
var bar = el('div', 'q-bar');
bar.setAttribute('role', 'progressbar');
bar.setAttribute('aria-label', T.answeredAria);
bar.setAttribute('aria-valuemin', '0');
var barFill = el('div', 'q-bar-fill');
bar.appendChild(barFill);
var count = el('div', 'q-count');
var countNum = el('span', 'q-count-n', '0/0');
countNum.setAttribute('dir', 'ltr');
add(count, countNum, document.createTextNode(' ' + T.answered));
add(row2, bar, count);
add(headIn, row1, row2);
head.appendChild(headIn);
var body = el('div', 'q-body');
var list = el('div', 'q-list');
body.appendChild(list);
var foot = el('div', 'q-foot');
var footIn = el('div', 'q-foot-in');
foot.appendChild(footIn);
add(root, head, body, foot);
host.appendChild(root);
list.addEventListener('click', onListClick, false);
list.addEventListener('keydown', onListKey, false);
document.addEventListener('keydown', onDocKey, true);
document.addEventListener('visibilitychange', onVisible, false);
load();
function setPhase(p) {
S.phase = p;
var keep = root.className.replace(/(^|\s)q-st-[a-z]+/g, ' ');
root.className = trim(keep.replace(/\s+/g, ' ')) + ' q-st-' + p;
}
function fetchQuiz() {
var okLesson = UUID_RE.test(lessonId);
var okQuiz = UUID_RE.test(quizId);
function viaTable() {
if (!okQuiz) return Promise.resolve({ rows: [], minutes: 0, title: '' });
return MEC.api.select(
'quiz_questions',
'select=id,question,options,correct_index,hint,image&quiz_id=eq.' +
encodeURIComponent(quizId) + '&order=id'
).then(function (rows) {
return { rows: isArray(rows) ? rows : [], minutes: 0, title: '' };
});
}
if (!okLesson || rpcMissing) return viaTable();
return MEC.api.rpcGet('share_free_quiz', { p_lesson: lessonId }).then(extract, function (err) {
if (err && err.kind === 'missing') {
rpcMissing = true;
return viaTable();
}
throw err;
});
}
function load() {
var seq = ++S.loadSeq;
stopTimer();
stopChunks();
closeDialog(false);
setPhase('loading');
renderFooter();
MEC.clear(list);
var wait = el('div', 'q-wait');
var ld = ui('loading') ? MEC.ui.loading(T.loading) : el('div', '', T.loading);
if (ld) wait.appendChild(ld);
list.appendChild(wait);
var p;
try { p = fetchQuiz(); } catch (e) { p = Promise.reject(e); }
p.then(function (res) {
if (S.dead || seq !== S.loadSeq) return;
onData(res);
}).then(null, function (err) {
if (S.dead || seq !== S.loadSeq) return;
showError(err);
});
}
function onData(res) {
var base = res && !res.notFound ? normalise(res.rows) : [];
if (!base.length) { showEmpty(); return; }
if (!trim(lesson.displayTitle) && !trim(lesson.title) && res.title) h1.textContent = res.title;
S.base = base;
S.durSec = minutesOf(res.minutes) * 60;
startAttempt();
}
function showError(err) {
setPhase('error');
renderFooter();
MEC.clear(list);
var node = null;
if (ui('errorState')) {
try { node = MEC.ui.errorState(err, T.what, load); } catch (e) { node = null; }
}
if (!node) {
node = el('div', 'q-state');
var msg = typeof MEC.errText === 'function' ? MEC.errText(err, T.what) : T.what;
var b = el('button', 'q-btn-fill', 'إعادة المحاولة');
b.type = 'button';
b.onclick = load;
add(node, el('div', 'q-state-m', msg), b);
}
list.appendChild(node);
}
function showEmpty() {
setPhase('empty');
renderFooter();
MEC.clear(list);
var box = el('div', 'q-state');
add(box,
svgIcon(P.quiz, 'q-state-ic'),
el('div', 'q-state-t', T.emptyTitle),
el('div', 'q-state-m', T.emptyText));
var b = ui('openInAppButton') ? MEC.ui.openInAppButton(T.openApp, 'q-state-btn') : null;
if (b) box.appendChild(b);
list.appendChild(box);
}
function startAttempt() {
closeDialog(false);
removeUnload();
S.qs = buildAttempt(S.base);
S.answered = 0;
S.result = null;
setPhase('quiz');
bar.setAttribute('aria-valuemax', String(S.qs.length));
renderQuestions();
renderFooter();
updateProgress();
startTimer();
}
function restart() {
if (!S.base) return;
startAttempt();
try { list.focus(); } catch (e) {   }
scrollTop();
}
function renderQuestions() {
stopChunks();
MEC.clear(list);
list.setAttribute('tabindex', '-1');
S.rendered = 0;
renderBatch(FIRST_BATCH);
scheduleChunks();
}
function renderBatch(n) {
var end = Math.min(S.qs.length, S.rendered + n);
var frag = document.createDocumentFragment();
for (var i = S.rendered; i < end; i++) frag.appendChild(buildCard(i));
list.appendChild(frag);
S.rendered = end;
}
function scheduleChunks() {
if (S.dead || S.rendered >= S.qs.length) return;
S.chunk = setTimeout(function () {
S.chunk = null;
if (S.dead) return;
renderBatch(BATCH);
scheduleChunks();
}, 16);
}
function stopChunks() {
if (S.chunk) { clearTimeout(S.chunk); S.chunk = null; }
}
function flushRender() {
stopChunks();
if (S.rendered < S.qs.length) renderBatch(S.qs.length - S.rendered);
}
function buildCard(i) {
var q = S.qs[i];
var src = q.src;
var n = i + 1;
var card = el('div', 'q-card');
card.setAttribute('role', 'group');
card.setAttribute('aria-label', T.qn(n));
var hd = el('div', 'q-card-hd');
var num = el('div', 'q-num', String(n));
num.setAttribute('aria-hidden', 'true');
var kind = el('div', 'q-kind', T.mcq);
add(hd, num, kind);
var hintBtn = null;
var hintBox = null;
if (src.hint) {
var hid = uid + '-h' + i;
hintBtn = el('button', 'q-hint-btn');
hintBtn.type = 'button';
hintBtn.setAttribute('aria-label', T.hint);
hintBtn.setAttribute('aria-expanded', 'false');
hintBtn.setAttribute('aria-controls', hid);
hintBtn.setAttribute('data-act', 'hint');
hintBtn.setAttribute('data-q', String(i));
hintBtn.appendChild(svgIcon(P.bulb));
hd.appendChild(hintBtn);
hintBox = el('div', 'q-hintbox');
hintBox.id = hid;
var ht = el('div', 'q-hint-txt', src.hint);
ht.setAttribute('dir', 'auto');
add(hintBox, svgIcon(P.bulb), ht);
}
card.appendChild(hd);
if (src.img) {
var wrap = el('div', 'q-img');
var img = document.createElement('img');
img.alt = '';
img.setAttribute('loading', 'lazy');
img.setAttribute('decoding', 'async');
img.setAttribute('referrerpolicy', 'no-referrer');
img.onerror = function () { wrap.style.display = 'none'; };
img.onload = function () { setClass(wrap, 'is-loaded', true); };
img.src = src.img;
wrap.appendChild(img);
card.appendChild(wrap);
}
var tid = '';
if (src.q) {
var qt = el('div', 'q-text', src.q);
tid = uid + '-t' + i;
qt.id = tid;
qt.setAttribute('dir', 'auto');
card.appendChild(qt);
}
if (hintBox) card.appendChild(hintBox);
var group = el('div', 'q-opts');
group.setAttribute('role', 'radiogroup');
if (tid) group.setAttribute('aria-labelledby', tid);
else group.setAttribute('aria-label', T.qn(n));
var optEls = [];
for (var j = 0; j < q.opts.length; j++) {
var b = el('button', 'q-opt');
b.type = 'button';
b.setAttribute('role', 'radio');
b.setAttribute('aria-checked', 'false');
b.setAttribute('data-act', 'opt');
b.setAttribute('data-q', String(i));
b.setAttribute('data-o', String(j));
var radio = el('span', 'q-radio');
radio.appendChild(el('span', 'q-dot'));
var letter = el('span', 'q-letter', j < LETTERS.length ? LETTERS[j] : String(j + 1));
letter.setAttribute('aria-hidden', 'true');
var txt = el('span', 'q-otext', q.opts[j].t);
txt.setAttribute('dir', 'auto');
var sr = el('span', 'q-sr');
add(b, radio, letter, txt, sr);
group.appendChild(b);
optEls.push(b);
}
card.appendChild(group);
q.els = { card: card, group: group, opts: optEls, hintBtn: hintBtn, hintBox: hintBox };
if (q.sel >= 0) markOpt(q, q.sel, true);
if (S.phase === 'review') reviewCard(q);
return card;
}
function markOpt(q, oi, on) {
var b = q.els && q.els.opts[oi];
if (!b) return;
setClass(b, 'is-sel', on);
b.setAttribute('aria-checked', on ? 'true' : 'false');
}
function findAct(t) {
while (t && t !== list && t.nodeType === 1) {
if (t.getAttribute('data-act')) return t;
t = t.parentNode;
}
return null;
}
function onListClick(e) {
var t = findAct(e.target);
if (!t) return;
var act = t.getAttribute('data-act');
var qi = parseInt(t.getAttribute('data-q'), 10);
if (act === 'opt') select(qi, parseInt(t.getAttribute('data-o'), 10));
else if (act === 'hint') toggleHint(qi);
}
function onListKey(e) {
var k = e.key || '';
var code = e.keyCode;
var next = k === 'ArrowDown' || k === 'Down' || k === 'ArrowLeft' || k === 'Left' || code === 40 || code === 37;
var prev = k === 'ArrowUp' || k === 'Up' || k === 'ArrowRight' || k === 'Right' || code === 38 || code === 39;
if (!next && !prev) return;
var t = findAct(e.target);
if (!t || t.getAttribute('data-act') !== 'opt') return;
var q = S.qs[parseInt(t.getAttribute('data-q'), 10)];
if (!q || !q.els) return;
var oi = parseInt(t.getAttribute('data-o'), 10);
var to = next ? oi + 1 : oi - 1;
if (to < 0) to = q.els.opts.length - 1;
if (to >= q.els.opts.length) to = 0;
e.preventDefault();
try { q.els.opts[to].focus(); } catch (er) {   }
}
function select(qi, oi) {
if (S.phase !== 'quiz') return;
var q = S.qs[qi];
if (!q || !(oi >= 0) || oi >= q.opts.length || q.sel === oi) return;
if (q.sel >= 0) markOpt(q, q.sel, false);
else S.answered++;
q.sel = oi;
markOpt(q, oi, true);
updateProgress();
if (S.answered > 0) addUnload();
popSubmit();
}
function toggleHint(qi) {
var q = S.qs[qi];
if (!q || !q.els || !q.els.hintBox) return;
setHint(q, !q.hintOpen);
}
function setHint(q, open) {
q.hintOpen = open;
setClass(q.els.hintBox, 'is-open', open);
q.els.hintBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function updateProgress() {
var total = S.qs.length;
var ratio = total ? S.answered / total : 0;
countNum.textContent = S.answered + '/' + total;
barFill.style.width = Math.round(ratio * 1000) / 10 + '%';
bar.setAttribute('aria-valuenow', String(S.answered));
ringFg.setAttribute('stroke-dashoffset', String(Math.round(RING_C * (1 - ratio) * 100) / 100));
}
function popSubmit() {
var b = S.submitBtn;
if (!b) return;
setClass(b, 'is-pop', false);
void b.offsetWidth;
setClass(b, 'is-pop', true);
if (S.popT) clearTimeout(S.popT);
S.popT = setTimeout(function () {
S.popT = null;
setClass(b, 'is-pop', false);
}, 260);
}
function startTimer() {
stopTimer();
S.startedAt = nowMs();
S.deadline = S.startedAt + S.durSec * 1000;
S.shown = -1;
renderTime(S.durSec);
S.tick = setInterval(tick, TICK_MS);
}
function stopTimer() {
if (S.tick) { clearInterval(S.tick); S.tick = null; }
}
function tick() {
if (S.dead || S.phase !== 'quiz') { stopTimer(); return; }
var left = Math.ceil((S.deadline - nowMs()) / 1000);
if (left <= 0) {
renderTime(0);
stopTimer();
submit(true);
return;
}
if (left !== S.shown) renderTime(left);
}
function renderTime(sec) {
S.shown = sec;
timeTxt.textContent = fmtTime(sec);
var low = S.phase === 'quiz' && sec <= Math.min(60, Math.floor(S.durSec / 4));
setClass(timeBox, 'is-low', low);
}
function onVisible() {
if (!document.hidden && S.phase === 'quiz') tick();
}
function onSubmitClick() {
if (S.phase !== 'quiz') return;
if (S.answered < S.qs.length) {
openDialog({
title: T.unTitle,
msg: T.unMsg,
buttons: [
{ label: T.cancel, cls: 'q-btn-text', cancel: true },
{ label: T.send, cls: 'q-btn-fill', focus: true, onClick: function () { submit(false); } },
],
});
} else {
submit(false);
}
}
function submit(auto) {
if (S.phase !== 'quiz') return;
flushRender();
closeDialog(false);
stopTimer();
var taken = auto ? S.durSec : Math.round((nowMs() - S.startedAt) / 1000);
taken = Math.max(0, Math.min(S.durSec, taken));
var c = 0;
var total = S.qs.length;
for (var i = 0; i < total; i++) if (S.qs[i].sel >= 0 && S.qs[i].sel === S.qs[i].correct) c++;
var pct = total ? Math.round((c / total) * 100) : 0;
S.result = { score: c, total: total, pct: pct, taken: taken };
setPhase('review');
setClass(timeBox, 'is-low', false);
removeUnload();
for (i = 0; i < total; i++) reviewCard(S.qs[i]);
list.insertBefore(buildStripe(), list.firstChild);
renderFooter();
if (lessonId) {
MEC.lsSet('mec_quiz_' + lessonId, JSON.stringify({
score: c, total: total, pct: pct, at: new Date().getTime(),
}));
}
showResult();
if (auto) toast(T.timeUp, 'ok');
}
function reviewCard(q) {
var els = q.els;
if (!els) return;
var right = q.sel >= 0 && q.sel === q.correct;
setClass(els.card, 'is-ok', right);
setClass(els.card, 'is-bad', !right);
for (var j = 0; j < els.opts.length; j++) {
var b = els.opts[j];
var isCorrect = j === q.correct;
var mine = j === q.sel;
setClass(b, 'is-sel', false);
setClass(b, 'is-right', isCorrect);
setClass(b, 'is-wrong', mine && !isCorrect);
setClass(b, 'is-mine', mine);
b.setAttribute('aria-disabled', 'true');
var sr = b.lastChild;
var parts = [];
if (mine) parts.push(T.srMine);
if (isCorrect) parts.push(T.srCorrect);
sr.textContent = parts.length ? ' — ' + parts.join('، ') : '';
}
if (els.hintBox) {
els.card.appendChild(els.hintBox);
setHint(q, !right);
}
}
function buildStripe() {
var r = S.result;
var band = bandOf(r.pct);
var box = el('div', 'q-stripe ' + band.cls);
box.setAttribute('tabindex', '-1');
var score = el('div', 'q-stripe-s');
var sn = el('span', '', r.score + '/' + r.total + ' • ' + r.pct + '%');
sn.setAttribute('dir', 'ltr');
score.appendChild(sn);
add(box,
el('div', 'q-stripe-t', band.title),
el('div', 'q-stripe-m', band.msg),
score);
S.stripe = box;
return box;
}
function showResult() {
var r = S.result;
var band = bandOf(r.pct);
var card = el('div', 'q-res ' + band.cls);
var hid = uid + '-rt';
var did = uid + '-rs';
var h = el('div', 'q-res-h', T.result);
h.id = hid;
var score = el('div', 'q-res-score');
score.id = did;
var sn = el('span', '', r.score + ' / ' + r.total + ' • ' + r.pct + '%');
sn.setAttribute('dir', 'ltr');
score.appendChild(sn);
var time = el('div', 'q-res-time');
var tn = el('span', '', fmtTime(r.taken));
tn.setAttribute('dir', 'ltr');
add(time, document.createTextNode(T.time), tn);
add(card,
h,
el('div', 'q-res-band', band.title),
el('div', 'q-res-msg', band.msg),
score,
time);
var acts = el('div', 'q-res-acts');
var bShow = el('button', 'q-res-show', T.showAnswers);
bShow.type = 'button';
var bAgain = el('button', 'q-res-again', T.again);
bAgain.type = 'button';
add(acts, bShow, bAgain);
card.appendChild(acts);
function showAnswers() {
closeDialog(false);
if (S.stripe) { try { S.stripe.focus(); } catch (e) {   } }
scrollTop();
}
bShow.onclick = showAnswers;
bAgain.onclick = function () { closeDialog(false); restart(); };
openDialog({ node: card, labelledBy: hid, describedBy: did, onCancel: showAnswers, initial: bShow });
}
function renderFooter() {
MEC.clear(footIn);
S.submitBtn = null;
if (S.phase !== 'quiz' && S.phase !== 'review') return;
footIn.appendChild(el('div', 'q-grab'));
if (S.phase === 'quiz') {
var b = el('button', 'q-submit');
b.type = 'button';
add(b, svgIcon(P.send, 'q-send-ic'), el('span', '', T.submit));
b.onclick = onSubmitClick;
S.submitBtn = b;
footIn.appendChild(b);
return;
}
var row = el('div', 'q-foot-row');
var again = el('button', 'q-again');
again.type = 'button';
add(again, svgIcon(P.refresh), el('span', '', T.again));
again.onclick = restart;
row.appendChild(again);
var app = ui('openInAppButton') ? MEC.ui.openInAppButton(T.continueApp, 'q-app-btn') : null;
if (app) {
var cell = el('div', 'q-app');
cell.appendChild(app);
row.appendChild(cell);
} else {
setClass(again, 'is-wide', true);
}
footIn.appendChild(row);
}
function onBack() {
if (S.dead) return;
if (S.phase === 'quiz' && S.answered > 0) {
openDialog({
msg: T.leaveMsg,
buttons: [
{ label: T.leave, cls: 'q-btn-text q-btn-danger', onClick: goBack },
{ label: T.stay, cls: 'q-btn-fill', focus: true, cancel: true },
],
});
return;
}
goBack();
}
function goBack() {
closeDialog(false);
removeUnload();
if (typeof ctx.back === 'function') ctx.back();
}
function onBeforeUnload(e) {
if (S.phase === 'quiz' && S.answered > 0) {
e.preventDefault();
e.returnValue = '';
return '';
}
return undefined;
}
function addUnload() {
if (S.unload || S.dead) return;
S.unload = true;
window.addEventListener('beforeunload', onBeforeUnload, false);
}
function removeUnload() {
if (!S.unload) return;
S.unload = false;
window.removeEventListener('beforeunload', onBeforeUnload, false);
}
function openDialog(opts) {
closeDialog(false);
var prevFocus = document.activeElement;
var ov = el('div', 'q-ov');
var card;
var initial = opts.initial || null;
var onCancel = opts.onCancel || null;
if (opts.node) {
card = opts.node;
if (opts.labelledBy) card.setAttribute('aria-labelledby', opts.labelledBy);
if (opts.describedBy) card.setAttribute('aria-describedby', opts.describedBy);
} else {
card = el('div', 'q-dlg');
var mid = uid + '-dm';
if (opts.title) {
var tid = uid + '-dt';
var t = el('div', 'q-dlg-t', opts.title);
t.id = tid;
card.appendChild(t);
card.setAttribute('aria-labelledby', tid);
card.setAttribute('aria-describedby', mid);
} else {
card.setAttribute('aria-labelledby', mid);
}
var m = el('div', opts.title ? 'q-dlg-m' : 'q-dlg-m is-lead', opts.msg);
m.id = mid;
card.appendChild(m);
var acts = el('div', 'q-dlg-acts');
for (var i = 0; i < opts.buttons.length; i++) {
(function (spec) {
var b = el('button', spec.cls, spec.label);
b.type = 'button';
b.onclick = function () {
closeDialog(!spec.onClick);
if (spec.onClick) spec.onClick();
};
if (spec.focus) initial = b;
if (spec.cancel) onCancel = function () { closeDialog(true); };
acts.appendChild(b);
})(opts.buttons[i]);
}
card.appendChild(acts);
}
card.setAttribute('role', 'dialog');
card.setAttribute('aria-modal', 'true');
ov.appendChild(card);
ov.onclick = function (e) {
if (e.target === ov && S.dialog && S.dialog.cancel) S.dialog.cancel();
};
root.appendChild(ov);
S.dialog = {
node: ov,
card: card,
prev: prevFocus,
cancel: onCancel || function () { closeDialog(true); },
};
var f = initial || card.querySelector('button');
if (f) { try { f.focus(); } catch (e) {   } }
}
function closeDialog(restoreFocus) {
var d = S.dialog;
if (!d) return;
S.dialog = null;
detach(d.node);
if (restoreFocus && d.prev && d.prev.focus && document.body.contains(d.prev)) {
try { d.prev.focus(); } catch (e) {   }
}
}
function onDocKey(e) {
var d = S.dialog;
if (!d) return;
var k = e.key || '';
var code = e.keyCode;
if (k === 'Escape' || k === 'Esc' || code === 27) {
e.preventDefault();
e.stopPropagation();
d.cancel();
return;
}
if (k === 'Tab' || code === 9) {
var items = d.card.querySelectorAll('button, a[href]');
if (!items.length) { e.preventDefault(); return; }
var first = items[0];
var last = items[items.length - 1];
var a = document.activeElement;
var inside = d.card.contains(a);
if (e.shiftKey && (a === first || !inside)) { e.preventDefault(); last.focus(); }
else if (!e.shiftKey && (a === last || !inside)) { e.preventDefault(); first.focus(); }
}
}
function destroy() {
if (S.dead) return;
S.dead = true;
S.loadSeq++;
stopTimer();
stopChunks();
if (S.popT) { clearTimeout(S.popT); S.popT = null; }
if (S.dialog) { detach(S.dialog.node); S.dialog = null; }
removeUnload();
list.removeEventListener('click', onListClick, false);
list.removeEventListener('keydown', onListKey, false);
document.removeEventListener('keydown', onDocKey, true);
document.removeEventListener('visibilitychange', onVisible, false);
S.qs = [];
S.base = null;
try { MEC.clear(host); } catch (e) {   }
}
return {
destroy: destroy,
isDirty: function () { return !S.dead && S.phase === 'quiz' && S.answered > 0; },
};
}
VIEWERS.quiz = { mount: mount };
})();
