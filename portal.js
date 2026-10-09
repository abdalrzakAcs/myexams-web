(function () {
'use strict';
var CFG = window.MEC_SHARE || {};
var ROOT = String(CFG.supabaseUrl || '').replace(/\/+$/, '');
var KEY = String(CFG.anonKey || '');
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var app = document.getElementById('portal');
var nav = document.getElementById('nav');
function session() {
try { return JSON.parse(sessionStorage.getItem('mec_session') || 'null'); }
catch (e) { return null; }
}
function saveSession(s) {
if (!s) sessionStorage.removeItem('mec_session');
else sessionStorage.setItem('mec_session', JSON.stringify(s));
}
function token() {
var s = session();
return s && s.access_token ? s.access_token : '';
}
function uid() {
var s = session();
return s && s.user && s.user.id ? s.user.id : '';
}
function el(tag, cls, text) {
var n = document.createElement(tag);
if (cls) n.className = cls;
if (text != null) n.textContent = text;
return n;
}
function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
function route() {
var h = (location.hash || '#/').replace(/^#/, '');
var q = '';
var iq = h.indexOf('?');
if (iq >= 0) {
q = h.slice(iq + 1);
h = h.slice(0, iq);
}
if (h.charAt(0) !== '/') h = '/' + h;
var parts = h.split('/').filter(Boolean);
return { name: parts[0] || 'home', id: parts[1] || '', query: q };
}
function api(method, path, body, auth) {
var headers = { apikey: KEY, 'Content-Type': 'application/json' };
if (auth && token()) headers.Authorization = 'Bearer ' + token();
return fetch(ROOT + path, {
method: method,
headers: headers,
body: body == null ? undefined : JSON.stringify(body),
}).then(function (r) {
return r.text().then(function (t) {
var data = t ? JSON.parse(t) : null;
if (!r.ok) {
var msg = (data && (data.msg || data.message || data.error_description)) || 'ما تم الطلب';
throw new Error(typeof msg === 'string' ? msg : 'ما تم الطلب');
}
return data;
});
});
}
function paintNav() {
clear(nav);
nav.appendChild(link('الدورات', '#/'));
nav.appendChild(link('الجامعات', '#/unis'));
if (uid()) nav.appendChild(link('لوحتي', '#/publisher'));
nav.appendChild(link('مكتب طباعة', '#/shop'));
if (uid()) {
var out = el('button', '', 'خروج');
out.type = 'button';
out.addEventListener('click', function () { saveSession(null); go('#/'); });
nav.appendChild(out);
} else {
nav.appendChild(link('دخول', '#/login'));
nav.appendChild(link('حساب جديد', '#/signup'));
}
}
function link(text, href) {
var a = el('a', '', text);
a.href = href;
return a;
}
function go(hash) { location.hash = hash; }
function card(title, sub) {
var c = el('section', 'card');
c.appendChild(el('h1', '', title));
if (sub) c.appendChild(el('p', 'meta', sub));
return c;
}
function field(label, input) {
var w = el('label', 'form');
w.appendChild(el('span', '', label));
w.appendChild(input);
return w;
}
function input(type, name, placeholder) {
var i = el('input');
i.type = type;
i.name = name;
i.autocomplete = name;
if (placeholder) i.placeholder = placeholder;
i.required = true;
return i;
}
function note(text, kind) {
return el('p', 'msg' + (kind ? ' ' + kind : ''), text);
}
function renderHome() {
clear(app);
var hero = el('section', 'hero');
hero.appendChild(el('p', '', 'ماي اكزامس'));
hero.appendChild(el('h1', '', 'دوراتك وملخصاتك واختباراتك من المتصفح'));
hero.appendChild(el('p', '', 'نفس المنصة. الملف ما بينزل عندك، والطباعة عن طريق مكتب معتمد.'));
var actions = el('div', 'hero-actions');
var enter = el('a', 'btn btn-primary', 'حساب جديد');
enter.href = '#/signup';
var dl = el('a', 'btn', 'حمّل التطبيق');
dl.href = './';
actions.appendChild(enter);
actions.appendChild(dl);
hero.appendChild(actions);
app.appendChild(hero);
var grid = el('div', 'grid');
app.appendChild(grid);
grid.appendChild(el('p', 'meta', 'عم نجيب الدورات…'));
api('POST', '/rest/v1/rpc/store_browse_courses', {
p_search: '', p_university: null, p_faculty: null, p_year: null,
p_subject: null, p_kind: '', p_limit: 80,
}, false).then(function (rows) {
clear(grid);
var list = Array.isArray(rows) ? rows : [];
if (!list.length) {
grid.appendChild(el('p', 'meta', 'ما في دورات منشورة هلّق.'));
return;
}
list.forEach(function (raw) {
var c = raw && raw.id ? raw : (raw || {});
if (!c.id) return;
var a = el('a', 'course-tile');
a.href = '#/course/' + c.id;
a.appendChild(el('h3', '', c.title || 'دورة'));
a.appendChild(el('p', 'meta', c.publisher_name || c.subject_label || ''));
var price = Number(c.price_now != null ? c.price_now : c.price) || 0;
a.appendChild(el('p', 'price', price > 0 ? price + ' ل.س' : 'مجاني'));
grid.appendChild(a);
});
}).catch(function () {
clear(grid);
grid.appendChild(note('ما قدرنا نجيب الدورات. تأكّد من الإنترنت.', 'bad'));
});
}
function authForm(mode) {
clear(app);
var box = card(mode === 'signup' ? 'حساب جديد' : 'دخول', 'نفس حساب التطبيق: بريد وكلمة مرور.');
var form = el('form', 'form');
var email = input('email', 'email', 'you@email.com');
var pass = input('password', 'password', '6 أحرف على الأقل');
pass.minLength = 6;
form.appendChild(field('البريد', email));
form.appendChild(field('كلمة المرور', pass));
var err = el('p', 'msg bad');
err.hidden = true;
var btn = el('button', 'btn btn-primary', mode === 'signup' ? 'إنشاء الحساب' : 'دخول');
btn.type = 'submit';
form.appendChild(err);
form.appendChild(btn);
form.addEventListener('submit', function (e) {
e.preventDefault();
err.hidden = true;
btn.disabled = true;
var path = mode === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password';
api('POST', path, { email: email.value.trim(), password: pass.value }, false)
.then(function (data) {
var access = data.access_token || (data.session && data.session.access_token);
var user = data.user || (data.session && data.session.user);
if (!access) throw new Error('تأكّد من البريد إذا وصلتك رسالة تفعيل، وبعدين ادخل.');
saveSession({ access_token: access, user: user || {} });
go('#/');
})
.catch(function (ex) {
err.hidden = false;
err.textContent = ex.message || 'ما قدرنا نفتح الحساب.';
})
.then(function () { btn.disabled = false; paintNav(); });
});
box.appendChild(form);
app.appendChild(box);
}
function renderCourse(id) {
clear(app);
if (!UUID.test(id)) {
app.appendChild(note('رابط الدورة غير صالح.', 'bad'));
return;
}
app.appendChild(el('p', 'meta', 'عم نجيب الدورة…'));
api('POST', '/rest/v1/rpc/share_public_page', { p_course: id, p_publisher: null }, false)
.catch(function () {
return api('POST', '/rest/v1/rpc/store_browse_courses', {
p_search: '', p_university: null, p_faculty: null, p_year: null,
p_subject: null, p_kind: '', p_limit: 200,
}, false).then(function (rows) {
var list = Array.isArray(rows) ? rows : [];
var course = null;
for (var i = 0; i < list.length; i++) {
if (String(list[i] && list[i].id).toLowerCase() === id.toLowerCase()) course = list[i];
}
if (!course) return { found: false };
return {
found: true,
publisher: { display_name: course.publisher_name || '' },
courses: [course],
};
});
})
.then(function (page) {
clear(app);
var courses = page && page.courses;
var course = Array.isArray(courses) ? courses[0] : null;
if (!page || page.found === false || !course) {
app.appendChild(note('الدورة مو متاحة.', 'bad'));
return;
}
var box = card(course.title || 'دورة', (page.publisher && page.publisher.display_name) || '');
if (course.description) box.appendChild(el('p', '', course.description));
var price = Number(course.price) || 0;
box.appendChild(el('p', 'price', price > 0 ? price + ' ل.س' : 'مجاني'));
var pay = el('a', 'btn btn-primary', price > 0 ? 'ادفع بشام كاش' : 'ادخل للدروس');
pay.href = price > 0 ? '#/pay/' + id : '#/study/' + id;
box.appendChild(pay);
var study = el('a', 'btn', 'الدروس');
study.href = '#/study/' + id;
box.appendChild(study);
var back = el('a', '', 'كل الدورات');
back.href = '#/';
box.appendChild(back);
app.appendChild(box);
})
.catch(function () {
clear(app);
app.appendChild(note('ما قدرنا نفتح الدورة بسبب الاتصال.', 'bad'));
});
}
function renderPay(id) {
clear(app);
if (!uid()) {
var need = card('سجّل الدخول أولاً', 'الدفع بينربط بحسابك.');
var a = el('a', 'btn btn-primary', 'دخول');
a.href = '#/login';
need.appendChild(a);
app.appendChild(need);
return;
}
var box = card('الدفع بشام كاش', 'حوّل المبلغ وارفع صورة إشعار التحويل. الملف الدراسي ما بينزل من الموقع.');
var info = el('p', 'meta', 'عم نجيب رقم التحويل…');
var form = el('form', 'form');
var file = el('input');
file.type = 'file';
file.accept = 'image/jpeg,image/png,image/webp,application/pdf';
file.required = true;
var ref = input('text', 'ref', 'رقم العملية إن وجد');
ref.required = false;
var err = el('p', 'msg bad');
err.hidden = true;
var ok = el('p', 'msg ok');
ok.hidden = true;
var btn = el('button', 'btn btn-primary', 'إرسال الإيصال');
btn.type = 'submit';
form.appendChild(field('صورة الإشعار', file));
form.appendChild(field('رقم العملية (اختياري)', ref));
form.appendChild(err);
form.appendChild(ok);
form.appendChild(btn);
box.appendChild(info);
box.appendChild(form);
app.appendChild(box);
api('POST', '/rest/v1/rpc/public_pay_info', {}, true).then(function (d) {
var num = (d && d.sham_cash) || '';
info.textContent = num
? 'حوّل المبلغ إلى شام كاش: ' + num + (d.invoice_message ? ' — ' + d.invoice_message : '')
: 'رقم التحويل لسا ما انضاف. تواصل مع الدعم.';
}).catch(function () {
info.textContent = 'ما قدرنا نجيب رقم التحويل. تأكّد من الاتصال.';
});
form.addEventListener('submit', function (e) {
e.preventDefault();
err.hidden = true;
ok.hidden = true;
var f = file.files && file.files[0];
if (!f) return;
if (f.size > 10 * 1024 * 1024) {
err.hidden = false;
err.textContent = 'الصورة أكبر من ١٠ ميغا.';
return;
}
btn.disabled = true;
var ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
if (['jpg', 'jpeg', 'png', 'webp', 'pdf'].indexOf(ext) < 0) ext = 'jpg';
var path = uid() + '/' + Date.now() + '.' + ext;
fetch(ROOT + '/storage/v1/object/receipts/' + path, {
method: 'POST',
headers: {
apikey: KEY,
Authorization: 'Bearer ' + token(),
'Content-Type': f.type || 'image/jpeg',
'x-upsert': 'true',
},
body: f,
}).then(function (r) {
if (!r.ok) throw new Error('ما قدرنا نرفع الإيصال.');
return api('POST', '/rest/v1/rpc/purchase_request_submit', {
p_course_id: id,
p_receipt_path: path,
p_ref: ref.value.trim(),
p_lesson_id: null,
}, true);
}).then(function (res) {
if (res && res.success === false) throw new Error(res.message || 'ما انسجل الطلب.');
ok.hidden = false;
ok.textContent = (res && res.message) || 'وصل إشعارك وهو قيد المراجعة.';
}).catch(function (ex) {
err.hidden = false;
err.textContent = ex.message || 'ما تم الدفع.';
}).then(function () { btn.disabled = false; });
});
}
function renderShop() {
clear(app);
var box = card('مكتب طباعة', 'ادخل رمز المكتب. النسخة مؤقتة وما بتنعاد للطالب.');
var form = el('form', 'form');
var code = input('password', 'code', 'رمز المكتب');
code.minLength = 6;
var err = el('p', 'msg bad');
err.hidden = true;
var list = el('div', 'grid');
var btn = el('button', 'btn btn-primary', 'عرض الطلبات');
btn.type = 'submit';
form.appendChild(field('رمز المكتب', code));
form.appendChild(err);
form.appendChild(btn);
box.appendChild(form);
app.appendChild(box);
app.appendChild(list);
form.addEventListener('submit', function (e) {
e.preventDefault();
err.hidden = true;
clear(list);
btn.disabled = true;
api('POST', '/rest/v1/rpc/shop_print_jobs', { p_code: code.value.trim() }, false)
.then(function (d) {
if (!d || d.success === false) throw new Error((d && d.message) || 'رمز المكتب غير صحيح.');
var jobs = Array.isArray(d.jobs) ? d.jobs : [];
if (!jobs.length) {
list.appendChild(el('p', 'meta', 'ما في طلبات مسلّمة لهالمكتب.'));
return;
}
jobs.forEach(function (j) {
var tile = el('article', 'course-tile shop-job');
tile.appendChild(el('h3', '', j.title || 'ملف'));
if (j.note) tile.appendChild(el('p', 'meta', j.note));
if (j.file_url) {
var open = el('a', 'btn btn-primary', 'فتح النسخة المؤقتة');
open.href = j.file_url;
open.target = '_blank';
open.rel = 'noopener';
tile.appendChild(open);
if (j.until) tile.appendChild(el('p', 'meta', 'بينتهي: ' + j.until));
} else {
tile.appendChild(el('p', 'meta', 'انتهت صلاحية النسخة. اطلب من الإدارة رابطاً جديداً.'));
}
list.appendChild(tile);
});
})
.catch(function (ex) {
err.hidden = false;
err.textContent = ex.message || 'ما قدرنا نجيب الطلبات.';
})
.then(function () { btn.disabled = false; });
});
}
function rowsOf(data) { return Array.isArray(data) ? data : []; }
function signFile(path) {
var raw = String(path || '').trim();
if (/^https?:\/\//i.test(raw)) return Promise.resolve(raw);
var clean = raw.replace(/^\/+/, '').replace(/^pdfs\//, '');
var encoded = clean.split('/').map(encodeURIComponent).join('/');
return fetch(ROOT + '/storage/v1/object/sign/pdfs/' + encoded, {
method: 'POST',
headers: {
apikey: KEY,
Authorization: 'Bearer ' + token(),
'Content-Type': 'application/json',
},
body: JSON.stringify({ expiresIn: 600 }),
}).then(function (r) {
return r.json().then(function (d) {
if (!r.ok || !d.signedURL) throw new Error('ما قدرنا نفتح الملف.');
var rel = d.signedURL.charAt(0) === '/' ? d.signedURL : '/' + d.signedURL;
return ROOT + '/storage/v1' + rel;
});
});
}
function who() {
var s = session();
var u = s && s.user ? s.user : {};
return u.email || 'حسابك';
}
function renderList(title, items, hrefOf, labelOf) {
clear(app);
var box = card(title, '');
app.appendChild(box);
if (!items.length) {
app.appendChild(el('p', 'meta', 'ما في عناصر هون.'));
return;
}
var grid = el('div', 'grid');
items.forEach(function (item) {
var a = el('a', 'course-tile');
a.href = hrefOf(item);
a.appendChild(el('h3', '', labelOf(item)));
grid.appendChild(a);
});
app.appendChild(grid);
}
function renderUnis() {
clear(app);
app.appendChild(el('p', 'meta', 'عم نجيب الجامعات…'));
api('GET', '/rest/v1/universities?select=id,name,is_listed&order=name', null, false)
.catch(function () {
return api('GET', '/rest/v1/universities?select=id,name&order=name', null, false);
})
.then(function (data) {
var list = rowsOf(data).filter(function (u) { return u.is_listed !== false; });
renderList('الجامعات', list, function (u) { return '#/uni/' + u.id; }, function (u) { return u.name || 'جامعة'; });
})
.catch(function () {
clear(app);
app.appendChild(note('ما قدرنا نجيب الجامعات. تأكّد من الاتصال.', 'bad'));
});
}
function renderFaculties(id) {
clear(app);
app.appendChild(el('p', 'meta', 'عم نجيب الكليات…'));
api('GET', '/rest/v1/faculties?select=id,name&university_id=eq.' + encodeURIComponent(id) + '&order=name', null, false)
.then(function (data) {
renderList('الكليات', rowsOf(data), function (f) { return '#/fac/' + f.id; }, function (f) { return f.name || 'كلية'; });
})
.catch(function () {
clear(app);
app.appendChild(note('ما قدرنا نجيب الكليات.', 'bad'));
});
}
function renderYears(id) {
clear(app);
app.appendChild(el('p', 'meta', 'عم نجيب السنوات…'));
api('GET', '/rest/v1/years?select=id,name&faculty_id=eq.' + encodeURIComponent(id) + '&order=name', null, false)
.then(function (data) {
renderList('السنوات', rowsOf(data), function (y) { return '#/year/' + y.id; }, function (y) { return y.name || 'سنة'; });
})
.catch(function () {
clear(app);
app.appendChild(note('ما قدرنا نجيب السنوات.', 'bad'));
});
}
function renderYearCourses(id) {
clear(app);
app.appendChild(el('p', 'meta', 'عم نجيب دورات هالسنة…'));
api('POST', '/rest/v1/rpc/store_browse_courses', {
p_search: '', p_university: null, p_faculty: null, p_year: Number(id),
p_subject: null, p_kind: '', p_limit: 80,
}, !!token()).then(function (rows) {
var list = rowsOf(rows);
renderList('دورات السنة', list, function (c) { return '#/study/' + c.id; }, function (c) {
return (c.title || 'دورة') + (Number(c.price) > 0 ? ' — ' + c.price + ' ل.س' : '');
});
}).catch(function () {
clear(app);
app.appendChild(note('ما قدرنا نجيب الدورات.', 'bad'));
});
}
function renderStudy(id) {
clear(app);
if (!UUID.test(id)) {
app.appendChild(note('رابط الدورة غير صالح.', 'bad'));
return;
}
app.appendChild(el('p', 'meta', 'عم نجيب الدروس…'));
api('POST', '/rest/v1/rpc/store_course_lessons', { p_course_id: id }, !!token())
.then(function (rows) {
clear(app);
var lessons = rowsOf(rows);
var box = card('الدروس', 'الملف المقفل ما بينفتح من الموقع قبل الشراء.');
var pay = el('a', 'btn btn-primary', 'ادفع بشام كاش');
pay.href = '#/pay/' + id;
box.appendChild(pay);
app.appendChild(box);
if (!lessons.length) {
app.appendChild(el('p', 'meta', 'ما في دروس ظاهرة بهالدورة.'));
return;
}
var grid = el('div', 'grid');
lessons.forEach(function (l) {
var open = l.unlocked === true && l.url;
var tile = el(open ? 'a' : 'article', 'course-tile');
if (open) {
if (l.kind === 'quiz') tile.href = '#/quiz/' + encodeURIComponent(l.url);
else tile.href = '#/watch/' + encodeURIComponent(l.url) + '?t=' + encodeURIComponent(l.title || '');
}
tile.appendChild(el('h3', '', l.title || 'درس'));
tile.appendChild(el('p', 'meta', open ? (l.kind === 'quiz' ? 'اختبار' : l.kind === 'video' ? 'فيديو' : 'ملف') : 'مقفول'));
grid.appendChild(tile);
});
app.appendChild(grid);
})
.catch(function () {
clear(app);
app.appendChild(note('ما قدرنا نجيب الدروس. سجّل الدخول إذا الدورة لحسابك.', 'bad'));
});
}
function renderWatch(encoded) {
clear(app);
var path = decodeURIComponent(encoded);
var title = '';
try { title = decodeURIComponent(new URLSearchParams(route().query).get('t') || ''); } catch (e) { title = ''; }
var box = el('section', 'viewer');
var wm = el('div', 'wm', 'نسخة ' + who() + ' — يُمنع نشرها');
box.appendChild(wm);
app.appendChild(el('h1', '', title || 'المحتوى'));
app.appendChild(box);
var yt = path.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/);
if (yt) {
var frame = el('iframe');
frame.src = 'https://www.youtube.com/embed/' + yt[1];
frame.allowFullscreen = true;
box.appendChild(frame);
return;
}
if (!token()) {
box.appendChild(note('سجّل الدخول لفتح الملف.', 'bad'));
return;
}
signFile(path).then(function (url) {
if (/\.(mp4|webm|mov)(\?|$)/i.test(path) || /\.(mp4|webm|mov)(\?|$)/i.test(url)) {
var v = el('video');
v.controls = true;
v.src = url;
box.appendChild(v);
} else {
var frame = el('iframe');
frame.src = url;
box.appendChild(frame);
}
}).catch(function (ex) {
box.appendChild(note(ex.message || 'ما قدرنا نفتح الملف.', 'bad'));
});
}
function renderQuiz(encoded) {
clear(app);
var qid = decodeURIComponent(encoded);
if (!token()) {
app.appendChild(note('سجّل الدخول حتى تقدّم الاختبار.', 'bad'));
return;
}
app.appendChild(el('p', 'meta', 'عم نجيب الأسئلة…'));
api('POST', '/rest/v1/rpc/web_quiz_paper', { p_quiz_id: qid }, true).then(function (paper) {
clear(app);
if (!paper || paper.success === false) {
app.appendChild(note((paper && paper.message) || 'الاختبار مو متاح.', 'bad'));
return;
}
var questions = rowsOf(paper.questions);
var box = card(paper.title || 'اختبار', questions.length + ' سؤال. الجواب الصحيح ما بينعرض قبل التسليم.');
var form = el('form', 'form');
var chosen = {};
questions.forEach(function (q, i) {
var block = el('fieldset');
block.appendChild(el('legend', '', (i + 1) + '. ' + (q.question || '')));
rowsOf(q.options).forEach(function (opt, idx) {
var lab = el('label', 'q-opt');
var radio = el('input');
radio.type = 'radio';
radio.name = 'q' + q.id;
radio.addEventListener('change', function () { chosen[q.id] = idx; });
lab.appendChild(radio);
lab.appendChild(el('span', '', String(opt)));
block.appendChild(lab);
});
form.appendChild(block);
});
var result = el('p', 'msg');
result.hidden = true;
var btn = el('button', 'btn btn-primary', 'تسليم');
btn.type = 'submit';
form.appendChild(result);
form.appendChild(btn);
form.addEventListener('submit', function (e) {
e.preventDefault();
btn.disabled = true;
var answers = Object.keys(chosen).map(function (id) { return { id: id, index: chosen[id] }; });
api('POST', '/rest/v1/rpc/web_quiz_grade', { p_quiz_id: qid, p_answers: answers }, true)
.then(function (g) {
if (!g || g.success === false) throw new Error((g && g.message) || 'ما انحسبت النتيجة.');
result.hidden = false;
result.className = 'msg ok';
result.textContent = 'نتيجتك ' + g.score + ' من ' + g.total;
})
.catch(function (ex) {
result.hidden = false;
result.className = 'msg bad';
result.textContent = ex.message || 'ما انحسبت النتيجة.';
})
.then(function () { btn.disabled = false; });
});
box.appendChild(form);
app.appendChild(box);
}).catch(function () {
clear(app);
app.appendChild(note('الاختبار بيحتاج تشغيل تحديث القاعدة، أو الاتصال ضعيف.', 'bad'));
});
}
function renderPublisher() {
clear(app);
if (!token()) {
app.appendChild(note('سجّل الدخول بحساب الناشر.', 'bad'));
return;
}
app.appendChild(el('p', 'meta', 'عم نجيب اللوحة…'));
api('POST', '/rest/v1/rpc/publisher_dashboard', {}, true).then(function (d) {
clear(app);
if (!d || d.has_account !== true) {
var none = card('لوحة الناشر', 'هال حساب ما عنده صفحة ناشر بعد. قدّم الطلب من التطبيق.');
app.appendChild(none);
return;
}
var p = d.publisher || {};
var box = card(p.display_name || 'الناشر', 'الحالة: ' + (p.status || ''));
function stat(k, v) {
var row = el('div', 'stat');
row.appendChild(el('span', '', k));
row.appendChild(el('strong', '', String(v)));
box.appendChild(row);
}
stat('الدورات', d.courses || 0);
stat('المنشورة', d.published || 0);
stat('الدروس', d.lessons || 0);
if (d.wallet) stat('الرصيد', d.wallet.balance || 0);
var share = el('a', 'btn btn-primary', 'رابط صفحتك');
share.href = location.protocol + '//' + location.host +
location.pathname.replace(/[^\/]*$/, '') + '?p=' + encodeURIComponent(String(p.id || '')) + '&r=pub';
share.target = '_blank';
share.rel = 'noopener';
box.appendChild(share);
app.appendChild(box);
if (!p.id) return;
return api('GET', '/rest/v1/teacher_courses?select=id,title,is_published,review_status&publisher_id=eq.' + p.id + '&order=created_at.desc', null, true)
.then(function (courses) {
var grid = el('div', 'grid');
rowsOf(courses).forEach(function (c) {
var a = el('a', 'course-tile');
a.href = '#/study/' + c.id;
a.appendChild(el('h3', '', c.title || 'دورة'));
a.appendChild(el('p', 'meta', (c.is_published ? 'منشورة' : 'مسودة') + ' — ' + (c.review_status || '')));
grid.appendChild(a);
});
app.appendChild(grid);
});
}).catch(function () {
clear(app);
app.appendChild(note('ما قدرنا نفتح لوحة الناشر.', 'bad'));
});
}
function draw() {
paintNav();
var r = route();
if (r.name === 'login') return authForm('login');
if (r.name === 'signup') return authForm('signup');
if (r.name === 'course' && r.id) return renderCourse(r.id);
if (r.name === 'pay' && r.id) return renderPay(r.id);
if (r.name === 'shop') return renderShop();
if (r.name === 'unis') return renderUnis();
if (r.name === 'uni' && r.id) return renderFaculties(r.id);
if (r.name === 'fac' && r.id) return renderYears(r.id);
if (r.name === 'year' && r.id) return renderYearCourses(r.id);
if (r.name === 'study' && r.id) return renderStudy(r.id);
if (r.name === 'quiz' && r.id) return renderQuiz(r.id);
if (r.name === 'watch' && r.id) return renderWatch(r.id);
if (r.name === 'publisher') return renderPublisher();
renderHome();
}
window.addEventListener('hashchange', draw);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', draw);
else draw();
})();
