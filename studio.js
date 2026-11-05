(function () {
'use strict';
var CFG = window.MEC_SHARE || {};
var ROOT = String(CFG.supabaseUrl || '').replace(/\/+$/, '');
var KEY = String(CFG.anonKey || '');
var GUARD = 'من الموقع الملفات بتننشر بلا حماية: بلا ختم وبدون قفل التحميل. لتكتمل حماية ملفاتك انشر على البرنامج.';
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var app = document.getElementById('app');
var nav = document.getElementById('nav');
var ICONS = {
cap: '<svg viewBox="0 0 24 24"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/></svg>',
login: '<svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>',
phone: '<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5 19c1.4-3 3.8-4.5 7-4.5S17.6 16 19 19"/></svg>',
pin: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
note: '<svg viewBox="0 0 24 24"><path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v6h6"/></svg>',
list: '<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>',
tag: '<svg viewBox="0 0 24 24"><path d="M20 13 11 4H4v7l9 9a2 2 0 0 0 3 0l4-4a2 2 0 0 0 0-3z"/><circle cx="7.5" cy="7.5" r="1"/></svg>',
file: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></svg>',
store: '<svg viewBox="0 0 24 24"><path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M3 10 5 4h14l2 6"/><path d="M9 20v-6h6v6"/></svg>',
back: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>'
};
function svg(name) {
var n = el('span', 'ico');
n.innerHTML = ICONS[name] || ICONS.edit;
return n;
}
var paintGen = 0;
var tick = 0;
var refreshing = null;
var KINDS = [
{ id: 'individual', label: 'ناشر حرّ', hint: 'أستاذ أو طالب ينشر ملخصاته ويبيعها' },
{ id: 'university', label: 'جامعة', hint: 'كلية أو جامعة تنشر مقرراتها وملخصاتها' },
{ id: 'school', label: 'مدرسة', hint: 'مدرسة أو معهد ينشر مواده لطلابه' },
{ id: 'team', label: 'فريق', hint: 'مجموعة تنشر معاً. اختياري، وحصة المنصّة أقل من البائع الفردي' }
];
var SCHOOLS = ['تاسع', 'بكلوريا علمي', 'بكلوريا أدبي'];
var TERMS = [
['مين الأطراف؟', 'هذا اتفاق بينك (الناشر) وبين منصّة «ماي اكزامس». موافقتك عليه إلكترونياً تُسجَّل بتاريخها وهوية حسابك، وتُعامل معاملة العقد الموقَّع.'],
['ملكية المحتوى الذي ترفعه', 'تقرّ أن كل ملف ترفعه من تأليفك أو تملك حق نشره. أي محتوى منقول بلا حق يتحمّل الناشر وحده مسؤوليته القانونية كاملة.'],
['النسخة المنسّقة ملك للمنصّة', 'الملف بعد تنسيقه بهوية المنصّة (الناتج) يُعرض داخل التطبيق فقط بقارئ محمي، وغير قابل للتحميل أو إعادة النشر خارج المنصّة — حتى من الناشر نفسه. مضمون علمك يبقى لك، أما النسخة المنسّقة فحصرية للمنصّة.'],
['الحماية خط أحمر', 'ممنوع محاولة تجاوز الحماية: تصوير الشاشة، تنزيل الملفات، مشاركة الحساب، أو استخراج المحتوى بأي طريقة. أي محاولة تعرّض الحساب للإيقاف الفوري.'],
['الأرباح والعمولة', 'النسبة الافتراضية 20٪ للمنصّة و80٪ للناشر، ما لم تحدّد الإدارة غير ذلك. إذا وقّعت عقداً ورقياً، بنوده هي المرجع.'],
['صرف المستحقات', 'المستحقات ما بتنصرف تلقائياً. بتطلب سحب من لوحتك بعد ما يصير عندك حساب شام كاش، والإدارة تحوّل بعد المراجعة.'],
['القانون الحاكم', 'هذا الاتفاق يخضع لقوانين الجمهورية العربية السورية، والمحاكم السورية هي المرجع إذا صار نزاع، ما لم ينص العقد الورقي على غير ذلك.'],
['الملخصات وكتب الوزارة', 'بيع ملخص أو كتاب وزارة مسموح فقط إذا كنت تملك حق بيعه. المنصّة ما بتمنحك ترخيصاً من الوزارة ولا من الجامعة.'],
['المحتوى الممنوع', 'يُمنع أي محتوى مخالف للقانون، أو مسيء، أو منتهك لحقوق الغير، أو خارج الغرض التعليمي للمنصّة.'],
['حق المراجعة والإزالة', 'للمنصّة الحق برفض أي ملف قبل نشره، وبإزالة أي محتوى أو إيقاف أي حساب عند المخالفة — مع إعلام الناشر بالسبب.'],
['مسؤوليتك عن الصحّة العلمية', 'الناشر مسؤول عن دقة محتواه. المنصّة تعرض وتبيع، ولا تتحمل مسؤولية الأخطاء العلمية.'],
['إنهاء الاتفاق', 'تقدر توقف النشر بأي وقت، وتبقى مستحقاتك المسجّلة بمحفظتك لك. المحتوى المباع سابقاً يبقى لمن اشتراه.'],
['تعديل الشروط', 'قد تُحدَّث هذه الشروط. عند أي تحديث جوهري رح نطلب موافقتك من جديد قبل متابعة النشر.']
];
function session() {
try { return JSON.parse(localStorage.getItem('mec_session') || 'null'); }
catch (e) { return null; }
}
function saveSession(s) {
if (!s) {
localStorage.removeItem('mec_session');
sessionStorage.removeItem('mec_session');
return;
}
var raw = JSON.stringify(s);
localStorage.setItem('mec_session', raw);
sessionStorage.setItem('mec_session', raw);
}
function token() {
var s = session();
return s && s.access_token ? s.access_token : '';
}
function uid() {
var s = session();
return s && s.user && s.user.id ? s.user.id : '';
}
function stash(key, val) {
if (val == null) sessionStorage.removeItem(key);
else sessionStorage.setItem(key, JSON.stringify(val));
}
function pull(key) {
try { return JSON.parse(sessionStorage.getItem(key) || 'null'); }
catch (e) { return null; }
}
function digits(raw) {
var buf = '';
var s = String(raw || '');
for (var i = 0; i < s.length; i++) {
var c = s.charCodeAt(i);
if (c >= 48 && c <= 57) buf += s.charAt(i);
else if (c >= 0x0660 && c <= 0x0669) buf += String(c - 0x0660);
else if (c >= 0x06F0 && c <= 0x06F9) buf += String(c - 0x06F0);
}
return buf;
}
function phoneE164(raw) {
var d = digits(raw);
var national = '';
if (d.indexOf('00963') === 0 && d.length === 14) national = d.slice(5);
else if (d.indexOf('963') === 0 && d.length === 12) national = d.slice(3);
else if (d.charAt(0) === '0' && d.length === 10) national = d.slice(1);
else if (d.length === 9) national = d;
else return '';
if (national.length !== 9 || national.charAt(0) !== '9') return '';
return '+963' + national;
}
function prettyPhone(raw) {
var e = phoneE164(raw);
if (!e) return String(raw || '').trim();
var n = e.slice(4);
return '0' + n.slice(0, 3) + ' ' + n.slice(3, 6) + ' ' + n.slice(6);
}
function readNum(raw, emptyZero) {
var s = String(raw || '').trim();
if (!s) return emptyZero ? 0 : null;
var norm = '';
var sawDot = false;
for (var i = 0; i < s.length; i++) {
var c = s.charCodeAt(i);
var ch = s.charAt(i);
if (c >= 48 && c <= 57) norm += ch;
else if (c >= 0x0660 && c <= 0x0669) norm += String(c - 0x0660);
else if (c >= 0x06F0 && c <= 0x06F9) norm += String(c - 0x06F0);
else if ((ch === '.' || ch === '٫') && !sawDot) { norm += '.'; sawDot = true; }
}
if (!norm || norm === '.') return emptyZero ? 0 : null;
var n = Number(norm);
return isFinite(n) ? n : null;
}
function el(tag, cls, text) {
var n = document.createElement(tag);
if (cls) n.className = cls;
if (text != null) n.textContent = text;
return n;
}
function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
function fieldIcon(label, node) {
if (!node) return 'edit';
if (node.type === 'tel') return 'phone';
if (node.type === 'email') return 'mail';
if (node.type === 'password') return 'lock';
if (node.type === 'file') return 'file';
if (node.tagName === 'SELECT') return 'list';
if (node.tagName === 'TEXTAREA') return 'note';
var lab = label || '';
if (lab.indexOf('اسم') >= 0) return 'user';
if (lab.indexOf('مدينة') >= 0 || lab.indexOf('جامعة') >= 0) return 'pin';
if (lab.indexOf('سعر') >= 0 || lab.indexOf('خصم') >= 0) return 'tag';
return 'edit';
}
function field(label, node) {
var w = el('label', 'fld');
w.appendChild(el('span', 'fld-lab', label));
var box = el('span', 'fld-box');
box.appendChild(svg(fieldIcon(label, node)));
box.appendChild(node);
w.appendChild(box);
return w;
}
function textIn(name, value, placeholder, type) {
var i = el('input');
i.name = name;
i.type = type || 'text';
i.value = value || '';
if (placeholder) i.placeholder = placeholder;
return i;
}
function area(name, value, placeholder) {
var i = el('textarea');
i.name = name;
i.value = value || '';
if (placeholder) i.placeholder = placeholder;
return i;
}
function btn(label, opts) {
var b = el('button', 'btn' + (opts && opts.soft ? ' soft' : '') + (opts && opts.ghost ? ' ghost' : ''), label);
b.type = (opts && opts.type) || 'button';
if (opts && opts.on) b.addEventListener('click', opts.on);
return b;
}
function note(text, kind) { return el('p', 'msg ' + (kind || ''), text); }
function toast(text, kind) {
var t = document.getElementById('toast');
t.textContent = text;
t.className = 'toast show ' + (kind || '');
clearTimeout(toast._t);
toast._t = setTimeout(function () { t.className = 'toast'; }, 4200);
}
function stale(g) { return g !== paintGen; }
function go(hash) {
if (location.hash === hash) draw();
else location.hash = hash;
}
function route() {
var h = (location.hash || '#/home').replace(/^#/, '');
var q = '';
var i = h.indexOf('?');
if (i >= 0) { q = h.slice(i + 1); h = h.slice(0, i); }
if (h.charAt(0) !== '/') h = '/' + h;
var parts = h.split('/').filter(Boolean);
return { name: parts[0] || 'home', id: parts[1] || '', q: new URLSearchParams(q) };
}
function authMsg(data, fallback) {
var m = String((data && (data.msg || data.message || data.error_description || data.error)) || '');
var low = m.toLowerCase();
if (low.indexOf('phone provider') >= 0 || low.indexOf('otp_disabled') >= 0 || low.indexOf('phone_provider') >= 0 || low.indexOf('signups are disabled') >= 0) {
return 'خدمة رمز التحقّق لسا ما انضبطت على السيرفر — المشكلة عنا مو عندك. تواصل مع الدعم الفني على واتساب.';
}
if (low.indexOf('expired') >= 0) return 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.';
if (low.indexOf('invalid') >= 0 || low.indexOf('otp') >= 0) return 'الرمز غير صحيح.';
if (low.indexOf('rate') >= 0 || low.indexOf('too many') >= 0 || low.indexOf('once every') >= 0) {
return 'استنيت شوي قبل ما تطلب رمزاً تاني.';
}
if (low.indexOf('already') >= 0) return 'هالرقم مسجّل. ادخل من شاشة الدخول.';
return m || fallback;
}
function missingRpc(err) {
var m = String((err && err.message) || '').toLowerCase();
var c = String((err && err.code) || '').toUpperCase();
return c === 'PGRST202' || m.indexOf('could not find the function') >= 0;
}
function refreshSession() {
var s = session();
if (!s || !s.refresh_token) return Promise.resolve(false);
if (refreshing) return refreshing;
refreshing = fetch(ROOT + '/auth/v1/token?grant_type=refresh_token', {
method: 'POST',
headers: { apikey: KEY, 'Content-Type': 'application/json' },
body: JSON.stringify({ refresh_token: s.refresh_token })
}).then(function (r) {
return r.text().then(function (t) {
var d = t ? JSON.parse(t) : {};
if (!r.ok || !d.access_token) { saveSession(null); return false; }
saveSession({
access_token: d.access_token,
refresh_token: d.refresh_token || s.refresh_token,
expires_at: Date.now() + (Number(d.expires_in) || 3600) * 1000,
user: d.user || s.user || {}
});
return true;
});
}).catch(function () { return false; }).then(function (ok) {
refreshing = null;
return ok;
});
return refreshing;
}
function ensureToken(auth) {
if (!auth) return Promise.resolve();
var s = session();
if (!s || !s.access_token) return Promise.resolve();
if (!s.expires_at || s.expires_at - Date.now() > 60000) return Promise.resolve();
return refreshSession().then(function () {});
}
function api(method, path, body, auth, extra) {
function once(retried) {
return ensureToken(!!auth).then(function () {
var headers = { apikey: KEY, 'Content-Type': 'application/json' };
if (auth && token()) headers.Authorization = 'Bearer ' + token();
if (extra) Object.keys(extra).forEach(function (k) { headers[k] = extra[k]; });
return fetch(ROOT + path, {
method: method,
headers: headers,
body: body == null ? undefined : JSON.stringify(body)
}).then(function (r) {
if (r.status === 401 && auth && !retried) {
return refreshSession().then(function (ok) {
if (!ok) throw new Error('انتهت جلستك — سجّل الدخول من جديد.');
return once(true);
});
}
return r.text().then(function (t) {
var data = null;
if (t) { try { data = JSON.parse(t); } catch (e) { data = { message: t }; } }
if (!r.ok) {
var msg = (data && (data.message || data.msg || data.error_description || data.error || data.hint)) || 'ما تم الطلب';
var err = new Error(typeof msg === 'string' ? msg : 'ما تم الطلب');
err.status = r.status;
err.data = data;
err.code = data && (data.code || data.error_code);
throw err;
}
return data;
});
});
});
}
return once(false);
}
function rpc(name, params) {
return api('POST', '/rest/v1/rpc/' + name, params || {}, true).then(function (d) {
if (d && d.success === false) {
var err = new Error(d.message || 'ما تم الطلب');
err.data = d;
throw err;
}
return d;
});
}
function screen(title, subtitle, nodes, back) {
clear(app);
var hdr = el('header', 'hdr');
if (back) {
var a = el('a', 'back');
a.href = back;
a.setAttribute('aria-label', 'رجوع');
a.appendChild(svg('back'));
hdr.appendChild(a);
}
if (token()) {
var out = el('button', 'hdr-out', 'خروج');
out.type = 'button';
out.addEventListener('click', function () { saveSession(null); go('#/login'); });
hdr.appendChild(out);
}
var mark = el('div', 'mark');
var icon = 'store';
if (title.indexOf('حساب') >= 0) icon = 'cap';
else if (title.indexOf('رمز') >= 0) icon = 'phone';
mark.appendChild(svg(icon));
hdr.appendChild(mark);
hdr.appendChild(el('h1', '', title));
if (subtitle) hdr.appendChild(el('p', '', subtitle));
app.appendChild(hdr);
var main = el('div', 'sheet');
(nodes || []).forEach(function (n) { if (n) main.appendChild(n); });
app.appendChild(main);
}
function guard() { return el('p', 'guard', GUARD); }
function paintNav() {
if (!nav) return;
clear(nav);
}
function link(text, href) {
var a = el('a', '', text);
a.href = href;
return a;
}
function sendOtp(phone, createUser) {
return fetch(ROOT + '/auth/v1/otp', {
method: 'POST',
headers: { apikey: KEY, 'Content-Type': 'application/json' },
body: JSON.stringify({ phone: phone, create_user: createUser })
}).then(function (r) {
return r.text().then(function (t) {
var d = {};
if (t) { try { d = JSON.parse(t); } catch (e) { d = { message: t }; } }
if (!r.ok) throw new Error(authMsg(d, 'ما قدرنا نبعت الرمز.'));
return d;
});
});
}
function verifyOtp(phone, code) {
return fetch(ROOT + '/auth/v1/verify', {
method: 'POST',
headers: { apikey: KEY, 'Content-Type': 'application/json' },
body: JSON.stringify({ type: 'sms', phone: phone, token: code })
}).then(function (r) {
return r.text().then(function (t) {
var d = {};
if (t) { try { d = JSON.parse(t); } catch (e) { d = { message: t }; } }
if (!r.ok || !d.access_token) throw new Error(authMsg(d, 'الرمز غير صحيح.'));
saveSession({
access_token: d.access_token,
refresh_token: d.refresh_token || '',
expires_at: Date.now() + (Number(d.expires_in) || 3600) * 1000,
user: d.user || {}
});
return d;
});
});
}
function otpBoxes() {
var wrap = el('div', 'otp');
var boxes = [];
function val() { return boxes.map(function (b) { return digits(b.value).slice(0, 1); }).join(''); }
for (var i = 0; i < 6; i++) {
(function (idx) {
var inp = el('input');
inp.inputMode = 'numeric';
inp.maxLength = 1;
inp.autocomplete = idx === 0 ? 'one-time-code' : 'off';
inp.setAttribute('aria-label', 'خانة الرمز ' + (idx + 1));
inp.addEventListener('input', function () {
inp.value = digits(inp.value).slice(-1);
if (inp.value && boxes[idx + 1]) boxes[idx + 1].focus();
});
inp.addEventListener('keydown', function (e) {
if (e.key === 'Backspace' && !inp.value && boxes[idx - 1]) boxes[idx - 1].focus();
});
inp.addEventListener('paste', function (e) {
var text = digits((e.clipboardData || window.clipboardData).getData('text')).slice(0, 6);
if (!text) return;
e.preventDefault();
for (var k = 0; k < 6; k++) boxes[k].value = text.charAt(k) || '';
(boxes[Math.min(text.length, 5)]).focus();
});
boxes.push(inp);
wrap.appendChild(inp);
})(i);
}
return { node: wrap, value: val, focus: function () { boxes[0].focus(); } };
}
function renderLogin(g) {
var qPhone = '';
try { qPhone = route().q.get('phone') || ''; } catch (e) { qPhone = ''; }
var emailMode = pull('mec_login_mode') === 'email';
clear(app);
app.appendChild(appBar());
var card = el('section', 'login-card');
var badge = el('div', 'login-badge');
badge.appendChild(svg(emailMode ? 'mail' : 'login'));
card.appendChild(badge);
card.appendChild(el('h1', '', 'مرحباً بعودتك'));
card.appendChild(el('p', 'login-sub', emailMode ? 'حساب قديم بالبريد' : 'سجّل دخولك للمتابعة'));
var err = note('', 'bad');
err.hidden = true;
var phone = textIn('phone', prettyPhone(qPhone), '0912345678', 'tel');
phone.className = 'ltr';
phone.autocomplete = 'tel';
var email = textIn('email', '', 'you@email.com', 'email');
email.autocomplete = 'username';
var pass = textIn('password', '', 'كلمة المرور', 'password');
pass.autocomplete = 'current-password';
pass.minLength = 6;
if (emailMode) {
card.appendChild(field('البريد', email));
card.appendChild(field('كلمة المرور', pass));
} else {
card.appendChild(field('رقم الموبايل', phone));
card.appendChild(el('p', 'fine', 'منبعتلك رمز تحقّق على الواتساب.'));
}
card.appendChild(err);
var submit = btn(emailMode ? 'تسجيل الدخول' : 'أرسل رمز التحقّق', { type: 'submit' });
card.appendChild(submit);
var form = el('form');
form.appendChild(card);
form.addEventListener('submit', function (e) {
e.preventDefault();
err.hidden = true;
submit.disabled = true;
var job;
if (emailMode) {
job = api('POST', '/auth/v1/token?grant_type=password', {
email: email.value.trim(), password: pass.value
}, false).then(function (d) {
if (!d.access_token) throw new Error('تأكّد من البريد وكلمة المرور.');
saveSession({
access_token: d.access_token,
refresh_token: d.refresh_token || '',
expires_at: Date.now() + (Number(d.expires_in) || 3600) * 1000,
user: d.user || {}
});
go('#/home');
});
} else {
var e164 = phoneE164(phone.value);
if (!e164) {
err.hidden = false;
err.textContent = 'رقم الموبايل غير صحيح — اكتبه هيك: 0912345678';
submit.disabled = false;
return;
}
job = sendOtp(e164, false).then(function () {
stash('mec_otp', { phone: e164, createUser: false, purpose: 'login', sentAt: Date.now() });
go('#/otp');
});
}
job.catch(function (ex) {
err.hidden = false;
err.textContent = ex.message || 'ما قدرنا نفتح الدخول.';
}).then(function () { submit.disabled = false; });
});
var swap = el('button', 'textlink', emailMode ? 'رجوع للدخول برقم الموبايل' : 'عندك حساب قديم بالبريد؟ سجّل دخول بالبريد');
swap.type = 'button';
swap.addEventListener('click', function () {
stash('mec_login_mode', emailMode ? 'phone' : 'email');
renderLogin(g);
});
card.appendChild(swap);
var guest = el('a', 'btn soft', 'متابعة كزائر');
guest.href = 'portal.html';
card.appendChild(guest);
var toSign = el('p', 'login-links');
toSign.appendChild(document.createTextNode('ليس لديك حساب؟ '));
var a = el('a', 'linkish', 'إنشاء حساب جديد');
a.href = '#/signup';
toSign.appendChild(a);
var wrap = el('div', 'auth-wrap');
wrap.appendChild(form);
wrap.appendChild(toSign);
app.appendChild(wrap);
}
function appBar() {
var bar = el('header', 'appbar');
var brand = el('div', 'appbar-brand');
var bubble = el('span', 'appbar-logo');
bubble.appendChild(svg('cap'));
brand.appendChild(bubble);
brand.appendChild(el('span', 'appbar-name', 'My Exams'));
bar.appendChild(brand);
return bar;
}
function renderOtp(g) {
var ctx = pull('mec_otp');
if (!ctx || !ctx.phone) { go(ctx && ctx.purpose === 'signup' ? '#/signup' : '#/login'); return; }
var card = el('section', 'card');
card.appendChild(el('h2', '', 'رمز التحقّق'));
card.appendChild(el('p', '', 'بعتنا الرمز على ' + prettyPhone(ctx.phone) + '. تفقّد الواتساب، وإذا ما وصل رح تجيك رسالة.'));
var boxes = otpBoxes();
var err = note('', 'bad');
err.hidden = true;
var wait = el('p', 'hint');
card.appendChild(boxes.node);
card.appendChild(err);
card.appendChild(wait);
var submit = btn('تأكيد', { type: 'submit' });
var form = el('form');
form.appendChild(card);
form.appendChild(submit);
function left() { return Math.max(0, 60 - Math.floor((Date.now() - (ctx.sentAt || 0)) / 1000)); }
function paintWait() {
var s = left();
wait.textContent = s > 0 ? 'تقدر تطلب رمزاً جديداً بعد ' + s + ' ث' : '';
}
paintWait();
tick = setInterval(function () { if (!stale(g)) paintWait(); }, 1000);
var resend = btn('إعادة إرسال الرمز', {
soft: true,
on: function () {
if (left() > 0) return;
resend.disabled = true;
sendOtp(ctx.phone, !!ctx.createUser).then(function () {
ctx.sentAt = Date.now();
stash('mec_otp', ctx);
toast('بعتنا رمز جديد.', 'ok');
paintWait();
}).catch(function (ex) {
err.hidden = false;
err.textContent = ex.message || 'ما قدرنا نعيد الإرسال.';
}).then(function () { resend.disabled = false; });
}
});
form.addEventListener('submit', function (e) {
e.preventDefault();
var code = boxes.value();
if (code.length < 6) {
err.hidden = false;
err.textContent = 'اكتب الرمز كامل — ٦ أرقام.';
return;
}
err.hidden = true;
submit.disabled = true;
verifyOtp(ctx.phone, code).then(function () {
if (ctx.purpose === 'signup') return finishSignup(g);
toast('تم الدخول.', 'ok');
go('#/home');
}).catch(function (ex) {
err.hidden = false;
err.textContent = ex.message || 'الرمز غير صحيح.';
submit.disabled = false;
});
});
var back = ctx.purpose === 'signup' ? '#/signup' : '#/login';
screen('رمز التحقّق', 'ست خانات متل التطبيق', [form, resend], back);
boxes.focus();
}
var signup = { edu: 'university', school: '', uni: '', fac: '', year: '', pendingUni: '', tried: false };
function renderSignup(g) {
if (!signup.tried) {
signup.tried = true;
screen('إنشاء حساب جديد', 'عم نجهّز الجامعات…', [el('p', 'hint', 'لحظة…')]);
api('GET', '/rest/v1/universities?select=id,name,is_listed&order=name', null, false).catch(function () {
return api('GET', '/rest/v1/universities?select=id,name&order=name', null, false);
}).then(function (rows) {
if (stale(g)) return;
signup.unis = (rows || []).filter(function (u) { return u.is_listed !== false; });
renderSignup(g);
}).catch(function () {
if (stale(g)) return;
signup.unis = [];
renderSignup(g);
});
return;
}
var welcome = el('section', 'card center');
welcome.appendChild(el('h2', '', 'بدنا شغلتين بس'));
welcome.appendChild(el('p', '', 'اسمك ورقم موبايلك — ومنبعتلك رمز تحقّق على الواتساب.'));
welcome.appendChild(el('p', 'pill', 'بلا كلمة سر — ولا شي بينحفظ إلا عندك'));
var card = el('section', 'card');
var name = textIn('name', signup.name || '', 'اسمك الثلاثي');
var phone = textIn('phone', signup.phone || '', '0912345678', 'tel');
phone.className = 'ltr';
card.appendChild(field('الاسم *', name));
card.appendChild(field('رقم الموبايل *', phone));
var eduRow = el('div', 'edu-row');
[['university', 'جامعة'], ['school', 'مدرسة'], ['general', 'عام']].forEach(function (pair) {
var b = el('button', 'edu' + (signup.edu === pair[0] ? ' on' : ''));
b.type = 'button';
b.appendChild(el('b', '', pair[1]));
b.addEventListener('click', function () {
signup.name = name.value;
signup.phone = phone.value;
signup.edu = pair[0];
renderSignup(g);
});
eduRow.appendChild(b);
});
card.appendChild(el('p', 'section-label', 'نوع التعليم *'));
card.appendChild(eduRow);
if (signup.edu === 'university') card.appendChild(uniBlock(g, name, phone));
else if (signup.edu === 'school') card.appendChild(schoolBlock(name, phone));
else card.appendChild(el('p', 'hint', 'حساب عام للكورسات العامة: بلا جامعة وبلا بكلوريا. بتقدر تغيّر النوع لاحقاً من التطبيق.'));
var pending = textIn('pendingUni', signup.pendingUni || '', 'إذا ما لقيت جامعتك اكتب اسمها');
if (signup.edu === 'university') card.appendChild(field('ما لقيت جامعتك؟ اقترحها', pending));
var accept = el('input');
accept.type = 'checkbox';
accept.checked = !!signup.accept;
var accLab = el('label', 'check');
accLab.appendChild(accept);
accLab.appendChild(el('span', '', 'أوافق على شروط الاستخدام: الحساب شخصي، والمحتوى للدراسة داخل المنصّة، وممنوع إعادة توزيعه. الشراء يفتح المحتوى حسب حالته وقت الدفع.'));
card.appendChild(accLab);
var err = note('', 'bad');
err.hidden = true;
card.appendChild(err);
var tips = el('section', 'card');
tips.appendChild(el('h2', '', 'كيف بيشتغل التحقّق؟'));
['منرسل رمز على الواتساب. إذا تأخر، جرّب الطلب مرة ثانية.',
'إذا الواتساب ما وصل، ممكن توصلك رسالة نصية على نفس الرقم.',
'الدخول بهالرقم ورمز جديد. ما في كلمة سر منفصلة.'
].forEach(function (t) { tips.appendChild(el('p', 'hint', '✓ ' + t)); });
var submit = btn('أرسل رمز التحقّق', { type: 'submit' });
var form = el('form');
form.appendChild(card);
form.appendChild(submit);
form.addEventListener('submit', function (e) {
e.preventDefault();
signup.name = name.value.trim();
signup.phone = phone.value.trim();
signup.pendingUni = pending.value.trim();
signup.accept = accept.checked;
err.hidden = true;
if (signup.name.length < 2) return show('اكتب اسمك.');
var e164 = phoneE164(signup.phone);
if (!e164) return show('رقم الموبايل غير صحيح — اكتبه هيك: 0912345678');
if (signup.edu === 'university' && !signup.uni && !signup.pendingUni) return show('اختار جامعتك، أو اكتب اسمها بالاقتراح.');
if (signup.edu === 'university' && signup.uni && !signup.fac) return show('اختار الكلية.');
if (signup.edu === 'university' && signup.uni && signup.fac && !signup.year) return show('اختار السنة.');
if (signup.edu === 'school' && !signup.school) return show('اختار قسم المدرسة.');
if (!accept.checked) return show('لازم توافق على شروط الاستخدام.');
function show(m) { err.hidden = false; err.textContent = m; }
submit.disabled = true;
api('POST', '/rest/v1/rpc/signup_phone_check', { p_phone: e164 }, false).then(function (d) {
var status = d && d.status ? d.status : (typeof d === 'string' ? d : '');
if (status === 'taken') {
show('هالرقم مسجّل من قبل.');
var jump = el('a', 'btn soft', 'ادخل بهالرقم');
jump.href = '#/login?phone=' + encodeURIComponent(e164);
card.appendChild(jump);
throw new Error('stop');
}
}).catch(function (ex) {
if (ex && ex.message === 'stop') throw ex;
}).then(function () {
return sendOtp(e164, true);
}).then(function () {
stash('mec_signup', {
name: signup.name, phone: e164, edu: signup.edu, uni: signup.uni, fac: signup.fac,
year: signup.year, school: signup.school, pendingUni: signup.pendingUni,
uniName: signup.uniName || '', facName: signup.facName || '', yearName: signup.yearName || ''
});
stash('mec_otp', { phone: e164, createUser: true, purpose: 'signup', sentAt: Date.now() });
go('#/otp');
}).catch(function (ex) {
if (ex && ex.message === 'stop') { submit.disabled = false; return; }
show(ex.message || 'ما قدرنا نبعت الرمز.');
submit.disabled = false;
});
});
var has = el('p', 'center hint');
has.appendChild(document.createTextNode('عندك حساب؟ '));
var loginA = el('a', 'linkish', 'سجّل دخول');
loginA.href = '#/login';
has.appendChild(loginA);
screen('إنشاء حساب جديد', 'انضم إلى My Exams', [welcome, form, tips, has], '#/login');
}
function rememberSignup(name, phone) {
signup.name = name.value;
signup.phone = phone.value;
}
function uniBlock(g, name, phone) {
var box = el('div');
var uni = el('select');
uni.appendChild(new Option('اختر الجامعة', ''));
(signup.unis || []).forEach(function (u) {
var o = new Option(u.name || 'جامعة', String(u.id));
if (String(u.id) === String(signup.uni)) o.selected = true;
uni.appendChild(o);
});
uni.addEventListener('change', function () {
rememberSignup(name, phone);
signup.uni = uni.value;
signup.uniName = uni.selectedOptions[0] ? uni.selectedOptions[0].textContent : '';
signup.fac = '';
signup.year = '';
signup.facs = [];
signup.years = [];
if (!signup.uni) { renderSignup(g); return; }
api('GET', '/rest/v1/faculties?select=id,name&university_id=eq.' + encodeURIComponent(signup.uni) + '&order=name', null, false)
.then(function (rows) {
if (stale(g)) return;
signup.facs = rows || [];
renderSignup(g);
}).catch(function () { if (!stale(g)) renderSignup(g); });
});
box.appendChild(field('الجامعة', uni));
if (!signup.unis || !signup.unis.length) box.appendChild(el('p', 'hint', 'ما لقينا جامعات حالياً. اكتب اسم جامعتك بخانة الاقتراح.'));
if (signup.uni) {
var fac = el('select');
fac.appendChild(new Option('اختر الكلية', ''));
(signup.facs || []).forEach(function (f) {
var o = new Option(f.name || 'كلية', String(f.id));
if (String(f.id) === String(signup.fac)) o.selected = true;
fac.appendChild(o);
});
fac.addEventListener('change', function () {
rememberSignup(name, phone);
signup.fac = fac.value;
signup.facName = fac.selectedOptions[0] ? fac.selectedOptions[0].textContent : '';
signup.year = '';
signup.years = [];
if (!signup.fac) { renderSignup(g); return; }
api('GET', '/rest/v1/years?select=id,name,year_number&faculty_id=eq.' + encodeURIComponent(signup.fac) + '&order=name', null, false)
.catch(function () {
return api('GET', '/rest/v1/years?select=id,name&faculty_id=eq.' + encodeURIComponent(signup.fac) + '&order=name', null, false);
}).then(function (rows) {
if (stale(g)) return;
signup.years = rows || [];
renderSignup(g);
}).catch(function () { if (!stale(g)) renderSignup(g); });
});
box.appendChild(field('الكلية', fac));
if (signup.facs && !signup.facs.length) box.appendChild(el('p', 'hint', 'ما في كليات مضافة لهالجامعة لسا.'));
}
if (signup.fac) {
var year = el('select');
year.appendChild(new Option('اختر السنة', ''));
(signup.years || []).forEach(function (y) {
var label = (y.name || '').trim() || (y.year_number ? 'السنة ' + y.year_number : 'سنة');
var o = new Option(label, String(y.id));
if (String(y.id) === String(signup.year)) o.selected = true;
year.appendChild(o);
});
year.addEventListener('change', function () {
rememberSignup(name, phone);
signup.year = year.value;
signup.yearName = year.selectedOptions[0] ? year.selectedOptions[0].textContent : '';
});
box.appendChild(field('السنة', year));
}
return box;
}
function schoolBlock(name, phone) {
var box = el('div');
box.appendChild(el('p', 'hint', 'اختر قسم المدرسة *'));
var chips = el('div', 'chips');
SCHOOLS.forEach(function (level) {
var b = el('button', 'chip' + (signup.school === level ? ' on' : ''), level);
b.type = 'button';
b.addEventListener('click', function () {
rememberSignup(name, phone);
signup.school = level;
renderSignup(paintGen);
});
chips.appendChild(b);
});
box.appendChild(chips);
return box;
}
function missingColumn(msg) {
var m = String(msg || '');
var a = m.match(/'([a-z_]+)' column/i);
if (a) return a[1];
var b = m.match(/column "([a-z_]+)"/i);
if (b) return b[1];
return '';
}
function finishSignup(g) {
var d = pull('mec_signup') || {};
var id = uid();
if (!id) { go('#/signup'); return Promise.resolve(); }
return api('GET', '/rest/v1/users?id=eq.' + id + '&select=*', null, true).catch(function () {
return [];
}).then(function (rows) {
var row = rows && rows[0];
var hasName = row && String(row.full_name || '').trim();
var hasEdu = row && String(row.education_type || '').trim();
if (hasName && hasEdu) {
toast('هالرقم مسجّل — دخلناك على حسابك.', 'ok');
go('#/home');
return;
}
var isUni = d.edu === 'university';
var isSchool = d.edu === 'school';
var payload = {
id: id,
full_name: d.name || '',
education_type: d.edu || 'general',
college: isUni ? (d.uniName || null) : null,
year: isUni ? (d.yearName || null) : null,
school_level: isSchool ? (d.school || null) : null,
phone: d.phone || null,
university_id: isUni && d.uni ? d.uni : null,
faculty_id: isUni && d.fac ? d.fac : null,
year_id: isUni && d.year ? d.year : null,
faculty_name: isUni ? (d.facName || null) : null
};
var legacyKeys = { id: 1, full_name: 1, education_type: 1, college: 1, year: 1, school_level: 1 };
function attempt(body, left) {
return api('POST', '/rest/v1/users?on_conflict=id', body, true, {
Prefer: 'resolution=merge-duplicates,return=minimal'
}).catch(function (ex) {
var col = missingColumn(ex.message);
if (left > 0 && col && body[col] !== undefined && !legacyKeys[col]) {
delete body[col];
return attempt(body, left - 1);
}
if (left > 0 && /schema cache|does not exist|42703|PGRST204/i.test(ex.message || '')) {
var slim = {};
Object.keys(legacyKeys).forEach(function (k) { slim[k] = body[k]; });
return attempt(slim, 0);
}
throw ex;
});
}
return attempt(payload, 8).then(function () {
if (d.pendingUni && d.pendingUni.length >= 2) {
return rpc('catalog_suggest', {
p_kind: 'university', p_name: d.pendingUni, p_note: 'اقتراح من الموقع'
}).catch(function () {});
}
}).then(function () {
toast('تم إنشاء حسابك.', 'ok');
go('#/home');
});
}).catch(function (ex) {
if (stale(g)) return;
toast(ex.message || 'تعذّر إكمال إنشاء الحساب.', 'bad');
});
}
function statusCopy(p) {
var name = (p && p.display_name) || '';
var s = (p && p.status) || '';
if (s === 'pending') return ['طلبك قيد المراجعة', 'بعتنا طلب «' + name + '» للإدارة — رح نرجعلك بأقرب وقت. بتقدر تجهّز دوراتك من هلق، وبتظهر للطلاب بعد الاعتماد.'];
if (s === 'approved') return ['حسابك معتمد', 'صرت ناشراً باسم «' + name + '». جهّز كورسك من هون، ولتكتمل حماية الملفات انشر النسخة المحمية من البرنامج.'];
if (s === 'suspended') return ['حسابك موقوف مؤقتاً', 'تواصل مع الإدارة لتعرف السبب وتفكّ الإيقاف.'];
if (s === 'rejected') return ['طلبك السابق مرفوض', (p.reject_reason ? 'تم رفض طلبك بسبب: "' + p.reject_reason + '". ' : '') + 'عدّل بياناتك وأرسل الطلب من جديد.'];
if (s === 'banned') return ['طلبك محظور', p.reject_reason ? 'تم حظر طلبك بسبب: "' + p.reject_reason + '". ما فينك تقدم طلب ناشر مرة تانية.' : 'ما فينك تقدم طلب ناشر مرة تانية.'];
return ['لوحة الناشر', ''];
}
function renderHome(g) {
if (!token()) { go('#/login'); return; }
screen('لوحة الناشر', 'عم نتأكد من حسابك…', [el('p', 'hint', 'لحظة…')]);
rpc('publisher_dashboard', {}).then(function (d) {
if (stale(g)) return;
if (!d || d.has_account !== true || !d.publisher) return renderBecome();
var p = d.publisher;
stash('mec_pub', { id: p.id, status: p.status, name: p.display_name || '' });
var copy = statusCopy(p);
var card = el('section', 'card');
card.appendChild(el('h2', '', copy[0]));
card.appendChild(el('p', '', copy[1]));
function stat(k, v) {
var row = el('div', 'stat');
row.appendChild(el('span', '', k));
row.appendChild(el('strong', '', String(v)));
card.appendChild(row);
}
stat('الدورات', d.courses || 0);
stat('المنشورة', d.published || 0);
stat('الدروس', d.lessons || 0);
if (d.wallet) stat('الرصيد', (d.wallet.balance || 0) + ' ل.س');
var nodes = [guard(), card];
if (p.status === 'banned') {
screen('انشر وبيع محتواك', p.display_name || '', nodes);
return;
}
if (p.status === 'rejected') {
nodes.push(btn('عدّل الطلب وأعد الإرسال', { on: function () { go('#/apply'); } }));
screen('انشر وبيع محتواك', p.display_name || '', nodes);
return;
}
if (p.status === 'suspended') {
screen('انشر وبيع محتواك', p.display_name || '', nodes);
return;
}
nodes.push(btn('دورة جديدة', { on: function () { go('#/course/new'); } }));
var list = el('div', 'list');
nodes.push(list);
screen('انشر وبيع محتواك', p.display_name || '', nodes);
api('GET', '/rest/v1/teacher_courses?select=id,title,is_published,review_status&publisher_id=eq.' + p.id + '&order=created_at.desc', null, true)
.then(function (courses) {
if (stale(g)) return;
var rows = courses || [];
if (!rows.length) {
list.appendChild(el('p', 'hint', 'لسا ما عندك دورات. ابدأ بدورة جديدة.'));
return;
}
rows.forEach(function (c) {
var a = el('a', 'tile');
a.href = '#/course/' + c.id;
a.appendChild(el('b', '', c.title || 'دورة'));
a.appendChild(el('span', '', (c.is_published ? 'معروضة بالمتجر' : 'مخفية') + ' — ' + reviewLabel(c.review_status)));
list.appendChild(a);
});
}).catch(function () {
if (!stale(g)) list.appendChild(el('p', 'hint', 'ما قدرنا نجيب الدورات.'));
});
}).catch(function (ex) {
if (stale(g)) return;
if (missingRpc(ex)) return renderBecome();
screen('لوحة الناشر', '', [note(ex.message || 'ما قدرنا نفتح اللوحة.', 'bad'), btn('إعادة المحاولة', { on: function () { draw(); } })]);
});
}
function reviewLabel(s) {
if (s === 'pending') return 'بانتظار المراجعة';
if (s === 'approved') return 'معتمد';
if (s === 'rejected') return 'مرفوض';
return 'مسودّة';
}
function renderBecome() {
var card = el('section', 'card');
card.appendChild(el('h2', '', 'انشر كورسك وبيعه'));
card.appendChild(el('p', '', 'لتنشئ كورس لازم يكون عندك حساب ناشر. قدّم طلبك مرّة وحدة، وبعد الاعتماد — أو وهو قيد المراجعة — بتقدر ترفع ملفاتك وفيديوهاتك واختباراتك.'));
[['١', 'ترفع ملفك كما هو'], ['٢', 'من الموقع بلا حماية، وعلى البرنامج بتنحمي'], ['٣', 'تبيعه بكود ويوصلك حصّتك']].forEach(function (p) {
var row = el('div', 'welcome-point');
row.appendChild(el('span', 'dot', p[0]));
row.appendChild(el('span', '', p[1]));
card.appendChild(row);
});
screen('انشر وبيع محتواك', 'ارفع ملفاتك وبيعها للطلاب', [
guard(), card, btn('قدّم طلب ناشر', { on: function () { go('#/apply'); } })
]);
}
function renderTerms(g) {
if (!token()) { go('#/login'); return; }
var agreed = el('input');
agreed.type = 'checkbox';
var lab = el('label', 'check');
lab.appendChild(agreed);
lab.appendChild(el('span', '', 'قرأت الشروط وبوافق عليها. موافقتي بتنسجّل كعقد رقمي.'));
var box = el('section', 'card');
box.appendChild(el('h2', '', 'اقرأها منيح'));
box.appendChild(guard());
TERMS.forEach(function (t) {
var block = el('div', 'term');
block.appendChild(el('b', '', t[0]));
block.appendChild(el('p', '', t[1]));
box.appendChild(block);
});
box.appendChild(lab);
var send = btn('أوافق وأكمل', {
on: function () {
if (!agreed.checked) { toast('علّم خانة الموافقة أولاً.', 'bad'); return; }
send.disabled = true;
rpc('publisher_accept_terms', { p_device: 'web' }).then(function () {
go('#/apply');
}).catch(function (ex) {
if (missingRpc(ex)) { go('#/apply'); return; }
toast(ex.message || 'ما انسجّلت الموافقة.', 'bad');
send.disabled = false;
});
}
});
screen('شروط النشر', 'موافقتك تنسجّل كعقد رقمي', [box, send], '#/home');
}
var apply = { kind: 'individual' };
function renderApply(g) {
if (!token()) { go('#/login'); return; }
screen('انشر وبيع محتواك', 'عم نتأكد من حالة حسابك…', [el('p', 'hint', 'لحظة…')]);
Promise.all([
rpc('publisher_dashboard', {}).catch(function (ex) {
if (missingRpc(ex)) return { has_account: false };
throw ex;
}),
api('POST', '/rest/v1/rpc/publisher_terms_accepted', {}, true).catch(function () { return true; }),
api('POST', '/rest/v1/rpc/publisher_my_ban', {}, true).catch(function () { return { banned: false }; })
]).then(function (all) {
if (stale(g)) return;
var dash = all[0] || {};
var termsOk = all[1] === true;
var ban = all[2] || {};
var p = dash.has_account ? dash.publisher : null;
if (!termsOk) { go('#/terms'); return; }
if (p && p.status === 'banned') { go('#/home'); return; }
if (ban.banned && (!p || p.status === 'rejected')) {
screen('انشر وبيع محتواك', '', [note(ban.reason ? 'تم حظر طلبك بسبب: "' + ban.reason + '". ما فينك تقدم طلب ناشر مرة تانية.' : 'ما فينك تقدم طلب ناشر مرة تانية.', 'bad')], '#/home');
return;
}
if (p && p.status !== 'rejected') { go('#/home'); return; }
paintApply(g, p);
}).catch(function (ex) {
if (stale(g)) return;
screen('انشر وبيع محتواك', '', [note(ex.message || 'ما قدرنا نفتح الاستمارة.', 'bad'), btn('إعادة المحاولة', { on: draw })], '#/home');
});
}
function paintApply(g, existing) {
var card = el('section', 'card');
card.appendChild(el('h2', '', 'صار عندك مكانك بالمنصّة'));
card.appendChild(el('p', '', 'ثلاث خطوات بس بينك وبين أول عملية بيع.'));
card.appendChild(guard());
var kinds = el('div', 'kinds');
KINDS.forEach(function (k) {
var b = el('button', 'kind' + (apply.kind === k.id ? ' on' : ''));
b.type = 'button';
b.appendChild(el('b', '', k.label));
b.appendChild(el('span', '', k.hint));
b.addEventListener('click', function () {
readApply(form);
apply.kind = k.id;
paintApply(g, existing);
});
kinds.appendChild(b);
});
var form = el('form');
var name = textIn('name', apply.name || (existing && existing.display_name) || '', 'الاسم اللي بيشوفه الطلاب');
var legal = textIn('legal', apply.legal || '', 'كما هو بالسجل الرسمي');
var phone = textIn('phone', apply.phone || '', '09xxxxxxxx', 'tel');
phone.className = 'ltr';
var city = textIn('city', apply.city || '', '');
var about = area('about', apply.about || '', 'شو المحتوى اللي بدك تنشره؟');
var buyers = textIn('buyers', apply.buyers || '', 'تقدير تقريبي');
var audience = textIn('audience', apply.audience || '', 'مثلاً: طلاب سنة أولى طب');
var plan = area('plan', apply.content || '', 'ملفات، فيديو، اختبارات…');
var photo = el('input');
photo.type = 'file';
photo.accept = 'image/jpeg,image/png,image/webp';
var err = note('', 'bad');
err.hidden = true;
form.appendChild(field('الاسم المعروض *', name));
if (apply.kind === 'university' || apply.kind === 'school') form.appendChild(field('الاسم الرسمي', legal));
form.appendChild(field('رقم الهاتف', phone));
form.appendChild(field('المدينة', city));
form.appendChild(field('نبذة عنك', about));
form.appendChild(field('كم تتوقع عدد المشترين؟', buyers));
form.appendChild(field('الفئة المستهدفة', audience));
form.appendChild(field('طبيعة المحتوى', plan));
form.appendChild(field('صورة شخصية (اختياري)', photo));
form.appendChild(err);
var send = btn(existing ? 'إعادة إرسال الطلب' : 'أرسل الطلب', { type: 'submit' });
form.addEventListener('submit', function (e) {
e.preventDefault();
readApply(form);
if (!apply.name.trim()) { err.hidden = false; err.textContent = 'لازم تكتب الاسم المعروض قبل الإرسال.'; return; }
err.hidden = true;
send.disabled = true;
var legalName = (apply.kind === 'university' || apply.kind === 'school') ? apply.legal : '';
rpc('publisher_apply', {
p_kind: apply.kind,
p_display_name: apply.name.trim(),
p_legal_name: legalName.trim(),
p_phone: apply.phone.trim(),
p_city: apply.city.trim(),
p_about: apply.about.trim()
}).then(function (d) {
if (d && d.banned) throw new Error(d.reason ? 'تم حظر طلبك بسبب: "' + d.reason + '".' : 'ما فينك تقدم طلب ناشر مرة تانية.');
if (d && d.existing && d.success !== false && !(existing && existing.status === 'rejected')) {
throw new Error(d.message || 'عندك طلب مسبقاً.');
}
var pubId = d && (d.publisher_id || d.id);
var jobs = [];
if (pubId) {
jobs.push(rpc('publisher_save_survey', {
p_id: pubId, p_buyers: apply.buyers || '', p_audience: apply.audience || '', p_content: apply.content || ''
}).catch(function () {}));
if (photo.files && photo.files[0]) jobs.push(uploadLogo(pubId, photo.files[0]));
}
return Promise.all(jobs);
}).then(function () {
var done = el('section', 'card center');
done.appendChild(el('div', 'icon-bubble', '⏳'));
done.appendChild(el('h2', '', 'وصل طلبك للإدارة'));
done.appendChild(el('p', '', 'طلبك قيد المراجعة — رح نرجعلك بأقرب وقت. بتقدر تجهّز الدورة من لوحتك.'));
screen('انشر وبيع محتواك', '', [done, btn('روح للوحة', { on: function () { go('#/home'); } })]);
}).catch(function (ex) {
err.hidden = false;
err.textContent = ex.message || 'ما زبط الإرسال.';
send.disabled = false;
});
});
var nodes = [card, el('p', 'hint', 'اختار نوعك'), kinds, form, send, el('p', 'hint center', 'بياناتك تبقى عندنا ولا تظهر للطلاب — يظهر الاسم المعروض فقط.')];
if (existing && existing.status === 'rejected') {
nodes.unshift(note(existing.reject_reason ? 'تم رفض طلبك بسبب: "' + existing.reject_reason + '". فينك تقدم طلبك مرة تانية بس ينحل السبب.' : 'عدّل بياناتك وأرسل الطلب من جديد.', 'bad'));
}
screen('انشر وبيع محتواك', 'ارفع ملفاتك — ولتكتمل حمايتها انشرها على البرنامج', nodes, '#/home');
}
function readApply(form) {
if (!form) return;
apply.name = form.name.value;
apply.legal = form.legal ? form.legal.value : '';
apply.phone = form.phone.value;
apply.city = form.city.value;
apply.about = form.about.value;
apply.buyers = form.buyers.value;
apply.audience = form.audience.value;
apply.content = form.plan.value;
}
function safeBase(name) {
var dot = name.lastIndexOf('.');
var base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
return base || 'file';
}
function uploadBinary(bucket, key, file) {
var path = key.split('/').map(encodeURIComponent).join('/');
return ensureToken(true).then(function () {
return fetch(ROOT + '/storage/v1/object/' + bucket + '/' + path, {
method: 'POST',
headers: {
apikey: KEY,
Authorization: 'Bearer ' + token(),
'Content-Type': file.type || 'application/octet-stream',
'x-upsert': 'false'
},
body: file
}).then(function (r) {
return r.text().then(function (t) {
var d = {};
if (t) { try { d = JSON.parse(t); } catch (e) { d = { message: t }; } }
if (!r.ok) {
var m = String(d.message || d.error || '').toLowerCase();
if (m.indexOf('invalidkey') >= 0 || m.indexOf('invalid key') >= 0) {
throw new Error('اسم الملف فيه رموز ما يقبلها المخزن — أعد تسميته بأحرف إنكليزية وأرقام وجرّب.');
}
if (r.status === 401) throw new Error('انتهت جلستك — سجّل الدخول من جديد وكرّر المحاولة.');
if (r.status === 403) throw new Error('السيرفر رفض رفع الملف. تواصل مع الدعم الفني.');
throw new Error(d.message || 'ما قدرنا نرفع الملف.');
}
return key;
});
});
});
}
function uploadLogo(pubId, file) {
if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('الصورة أكبر من 5 ميغا.'));
var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
if (['jpg', 'jpeg', 'png', 'webp'].indexOf(ext) < 0) ext = 'jpg';
var key = 'publishers/' + uid() + '/' + Date.now() + '.' + ext;
return uploadBinary('avatars', key, file).then(function () {
var url = ROOT + '/storage/v1/object/public/avatars/' + key.split('/').map(encodeURIComponent).join('/');
return rpc('publisher_set_logo', { p_publisher_id: pubId, p_url: url });
});
}
function writeRow(method, path, payload, dropped) {
function attempt(body) {
return api(method, path, body, true, { Prefer: 'return=representation' }).catch(function (ex) {
var col = missingColumn(ex.message);
if (col && Object.prototype.hasOwnProperty.call(body, col) && col !== 'title' && col !== 'publisher_id') {
if (dropped) dropped.push(col);
var next = Object.assign({}, body);
delete next[col];
return attempt(next);
}
throw ex;
});
}
return attempt(payload);
}
var courseUi = {};
function renderCourse(g) {
if (!token()) { go('#/login'); return; }
var id = route().id;
var pub = pull('mec_pub') || {};
if (!pub.id) { go('#/home'); return; }
if (id && id !== 'new' && !UUID.test(id)) {
screen('الدورة', '', [note('رابط الدورة غير صالح.', 'bad')], '#/home');
return;
}
if (!id || id === 'new') { paintCourse(g, null, pub); return; }
screen('الدورة', 'عم نجيبها…', [el('p', 'hint', 'لحظة…')], '#/home');
courseGet(id).then(function (row) {
if (stale(g)) return;
if (!row) { screen('الدورة', '', [note('ما لقينا الدورة.', 'bad')], '#/home'); return; }
return lessonsOf(id).then(function (lessons) {
if (stale(g)) return;
paintCourse(g, row, pub, lessons || []);
});
}).catch(function (ex) {
if (!stale(g)) screen('الدورة', '', [note(ex.message || 'ما قدرنا نجيب الدورة.', 'bad')], '#/home');
});
}
function courseGet(id) {
var cols = [
'id,title,description,subject_label,stage_label,price,is_published,review_status,contact_phone,cover_url,discount_percent,discount_until,discount_first_n,free_protection',
'id,title,description,subject_label,stage_label,price,is_published,review_status,contact_phone,cover_url,discount_percent,discount_until,discount_first_n',
'id,title,description,subject_label,stage_label,price,is_published,review_status,contact_phone,cover_url',
'id,title,description,price,is_published'
];
function tryAt(i) {
return api('GET', '/rest/v1/teacher_courses?id=eq.' + id + '&select=' + cols[i], null, true).then(function (rows) {
return (rows && rows[0]) || null;
}).catch(function (ex) {
if (i + 1 < cols.length) return tryAt(i + 1);
throw ex;
});
}
return tryAt(0);
}
function lessonsOf(id) {
var cols = [
'id,title,kind,content_type,is_free,price,review_status,order_index,free_protection',
'id,title,kind,content_type,is_free,price,review_status,order_index',
'id,title,kind,content_type,is_free,order_index'
];
function tryAt(i) {
return api('GET', '/rest/v1/teacher_lessons?course_id=eq.' + id + '&select=' + cols[i] + '&order=order_index', null, true)
.catch(function (ex) { if (i + 1 < cols.length) return tryAt(i + 1); throw ex; });
}
return tryAt(0);
}
function daysLeft(iso) {
if (!iso) return '';
var t = new Date(iso).getTime() - Date.now();
if (!isFinite(t) || t <= 0) return '';
return String(Math.ceil(t / 86400000));
}
function paintCourse(g, row, pub, lessons) {
lessons = lessons || [];
var f = {
title: row ? (row.title || '') : (courseUi.title || ''),
description: row ? (row.description || '') : (courseUi.description || ''),
subject: row ? (row.subject_label || '') : (courseUi.subject || ''),
stage: row ? (row.stage_label || '') : (courseUi.stage || ''),
price: row ? (Number(row.price) > 0 ? String(row.price) : '') : (courseUi.price || ''),
discount: row && row.discount_percent ? String(row.discount_percent) : (courseUi.discount || ''),
days: row ? daysLeft(row.discount_until) : (courseUi.days || ''),
first: row && row.discount_first_n ? String(row.discount_first_n) : (courseUi.first || ''),
phone: row ? (row.contact_phone || '') : (courseUi.phone || '')
};
var form = el('form');
form.id = 'course-form';
var title = textIn('title', f.title, 'مثال: رياضيات — البكلوريا العلمي');
var subject = textIn('subject', f.subject, 'المادة');
var stage = textIn('stage', f.stage, 'المرحلة أو السنة');
var price = textIn('price', f.price, 'مثال: 50000', 'text');
price.inputMode = 'decimal';
var discount = textIn('discount', f.discount, 'فاضي = بلا خصم، والحد 90');
discount.inputMode = 'numeric';
var days = textIn('days', f.days, 'فاضي = بلا نهاية');
days.inputMode = 'numeric';
var first = textIn('first', f.first, 'فاضي = لكل الناس خلال المدة');
first.inputMode = 'numeric';
var phone = textIn('phone', f.phone, 'اختياري', 'tel');
phone.className = 'ltr';
var description = area('description', f.description, 'شو بيلاقي الطالب بهالدورة؟');
form.appendChild(field('اسم الدورة', title));
form.appendChild(field('المادة', subject));
form.appendChild(field('المرحلة', stage));
form.appendChild(pricingBlock(row, price, [
field('سعر الدورة كاملة (ل.س جديدة)', price),
el('p', 'hint', 'لازم يكون أعلى من سعر أي درس لحالو — وإذا سعّرت كل الدروس لحالها، أقل من مجموع أسعارها.'),
field('نسبة الخصم', discount),
field('مدة الخصم بالأيام', days),
field('خصم لأول كم شخص', first)
]));
form.appendChild(field('هاتف للتواصل (اختياري)', phone));
form.appendChild(field('الوصف', description));
var err = note('', 'bad');
err.hidden = true;
form.appendChild(err);
var save = btn(row ? 'حفظ الدورة' : 'أنشئ الدورة', { type: 'submit' });
form.appendChild(save);
form.addEventListener('submit', function (e) {
e.preventDefault();
var body = courseBody(form, pub.id, row && row.free_protection === 'open' ? 'open' : 'protected');
if (body.error) { err.hidden = false; err.textContent = body.error; return; }
var issue = priceIssue(body.payload.price, lessons, row);
if (issue) { err.hidden = false; err.textContent = issue; return; }
err.hidden = true;
save.disabled = true;
var req;
var dropped = [];
var saved = function () {
if (dropped.indexOf('free_protection') >= 0 && body.payload.price <= 0) {
toast('انحفظت الدورة. خيار الحماية بيشتغل أول ما تنحدّث قاعدة البيانات.', '');
} else {
toast('انحفظت الدورة.', 'ok');
}
};
if (!row) {
req = writeRow('POST', '/rest/v1/teacher_courses', body.payload, dropped).then(function (rows) {
var created = Array.isArray(rows) ? rows[0] : rows;
if (!created || !created.id) throw new Error('ما انحفظت الدورة.');
saved();
go('#/course/' + created.id);
});
} else {
var patch = Object.assign({}, body.payload);
delete patch.publisher_id;
req = writeRow('PATCH', '/rest/v1/teacher_courses?id=eq.' + row.id, patch, dropped).then(function () {
saved();
draw();
});
}
req.catch(function (ex) {
err.hidden = false;
err.textContent = ex.message || 'ما انحفظت الدورة.';
save.disabled = false;
});
});
var nodes = [guard()];
if (pub.status && pub.status !== 'approved') {
nodes.push(note('حسابك لسا مو معتمد. الدورة بتضل عندك، وبتظهر للطلاب بعد اعتماد الحساب والمحتوى.', ''));
}
if (row && row.cover_url) {
var img = el('img', 'cover');
img.src = row.cover_url;
img.alt = '';
nodes.push(img);
}
nodes.push(form);
if (row) {
nodes.push(publishBar(row));
nodes.push(coverForm(row.id));
nodes.push(lessonList(g, row, lessons));
nodes.push(addFile(g, row.id));
nodes.push(addVideo(g, row.id));
nodes.push(addQuiz(g, row.id));
}
screen(row ? (row.title || 'الدورة') : 'دورة جديدة', reviewLabel(row && row.review_status), nodes, '#/home');
}
function courseBody(form, publisherId, keptProt) {
var mode = form.priceMode.value;
var paid = mode === 'paid';
if (!form.title.value.trim()) return { error: 'اسم الدورة مطلوب.' };
if (!paid && mode !== 'free') return { error: 'اختار إذا الدورة مجانية أو مدفوعة.' };
var payload = {
publisher_id: publisherId,
title: form.title.value.trim(),
description: form.description.value.trim(),
subject_label: form.subject.value.trim(),
stage_label: form.stage.value.trim(),
price: 0,
free_protection: paid ? (keptProt || 'protected') : (form.freeProt.value === 'open' ? 'open' : 'protected'),
contact_phone: form.phone.value.trim()
};
if (!paid) return { payload: payload };
var price = readNum(form.price.value, false);
var discount = readNum(form.discount.value, true);
var dayN = String(form.days.value || '').trim() ? readNum(form.days.value, false) : null;
var firstN = String(form.first.value || '').trim() ? readNum(form.first.value, false) : null;
if (price == null || price <= 0) return { error: 'الدورة المدفوعة بدها سعر أكبر من 0. الأرقام العربية مقبولة.' };
if (discount == null || discount < 0 || discount > 90) return { error: 'نسبة الخصم لازم تكون رقم بين 0 و 90.' };
if (String(form.days.value || '').trim() && (dayN == null || dayN < 1)) return { error: 'مدة الخصم لازم تكون رقم أيام.' };
if (String(form.first.value || '').trim() && (firstN == null || firstN < 1)) return { error: 'عدد المستفيدين من الخصم لازم يكون رقم.' };
var until = null;
if (dayN && dayN >= 1) until = new Date(Date.now() + dayN * 86400000).toISOString();
payload.price = price;
payload.discount_percent = discount;
payload.discount_until = until;
payload.discount_first_n = firstN;
return { payload: payload };
}
function pricingBlock(row, priceIn, paidNodes) {
var wrap = el('div');
var mode = textIn('priceMode', row ? (Number(row.price) > 0 ? 'paid' : 'free') : '', '', 'hidden');
var prot = textIn('freeProt', row && row.free_protection === 'open' ? 'open' : 'protected', '', 'hidden');
var modes = el('div', 'pmode');
var freeBox = el('div', 'pfree');
var paidBox = el('div');
var modeBtns = {};
var protBtns = {};
function sync() {
Object.keys(modeBtns).forEach(function (k) {
modeBtns[k].className = 'edu' + (mode.value === k ? ' on' : '');
modeBtns[k].setAttribute('aria-pressed', mode.value === k ? 'true' : 'false');
});
Object.keys(protBtns).forEach(function (k) {
protBtns[k].className = 'kind' + (prot.value === k ? ' on' : '');
protBtns[k].setAttribute('aria-pressed', prot.value === k ? 'true' : 'false');
});
freeBox.hidden = mode.value !== 'free';
paidBox.hidden = mode.value !== 'paid';
}
[['free', 'مجانية'], ['paid', 'مدفوعة']].forEach(function (p) {
var b = el('button', 'edu');
b.type = 'button';
b.appendChild(el('b', '', p[1]));
b.addEventListener('click', function () {
mode.value = p[0];
sync();
if (p[0] === 'paid' && !priceIn.value) priceIn.focus();
});
modeBtns[p[0]] = b;
modes.appendChild(b);
});
[
['protected', 'مجانية محمية', 'الطالب بيشوفها ببلاش بالتطبيق بس — بلا تنزيل ولا تصوير شاشة، وما بتنفتح بالموقع.'],
['open', 'مجانية غير محمية', 'ببلاش بالتطبيق والموقع، والطالب بيقدر ينزّل الملفات ويصوّر الشاشة.']
].forEach(function (p) {
var b = el('button', 'kind');
b.type = 'button';
b.appendChild(el('b', '', p[1]));
b.appendChild(el('span', '', p[2]));
b.addEventListener('click', function () { prot.value = p[0]; sync(); });
protBtns[p[0]] = b;
freeBox.appendChild(b);
});
paidNodes.forEach(function (n) { paidBox.appendChild(n); });
wrap.appendChild(el('p', 'section-label', 'سعر الدورة'));
wrap.appendChild(modes);
wrap.appendChild(freeBox);
wrap.appendChild(paidBox);
wrap.appendChild(mode);
wrap.appendChild(prot);
sync();
return wrap;
}
function priceIssue(price, lessons, row) {
if (row && Number(row.price) === Number(price)) return '';
var sum = 0;
var priced = 0;
var sellable = 0;
for (var i = 0; i < lessons.length; i++) {
var p = Number(lessons[i].price) || 0;
if (p > 0 && price > 0 && price <= p) {
return 'سعر الدورة كاملة لازم يكون أعلى من سعر «' + (lessons[i].title || 'درس') + '» لحالو.';
}
if (!lessons[i].is_free) {
sellable++;
if (p > 0) { priced++; sum += p; }
}
}
if (sellable > 0 && priced === sellable && sum > 0 && price >= sum) {
return 'كل الدروس يلي بتنباع مسعّرة لحالها ومجموعها ' + sum + ' — سعر الدورة كاملة لازم يكون أقل منه.';
}
return '';
}
function publishBar(row) {
var box = el('section', 'card');
var on = !!row.is_published;
box.appendChild(el('h2', '', on ? 'ظاهرة بالمتجر' : 'مخفية عن المتجر'));
box.appendChild(el('p', '', 'النشر رغبتك بالعرض. الظهور الفعلي للطالب بدّو اعتماد الإدارة كمان.'));
box.appendChild(btn(on ? 'إخفاء عن المتجر' : 'اعرضها بالمتجر', {
soft: on,
on: function () {
api('PATCH', '/rest/v1/teacher_courses?id=eq.' + row.id, {
is_published: !on,
hidden_reason: !on ? '' : undefined
}, true, { Prefer: 'return=representation' }).then(function (rows) {
var got = Array.isArray(rows) ? rows[0] : null;
if (!on) toast('انحفظ — بتظهر للطلاب بعد اعتماد الإدارة.', 'ok');
else if (got && got.is_published) toast('انبعت طلب الإخفاء للإدارة، وبتضل ظاهرة لحد الموافقة.', '');
else toast('انسحبت من العرض.', 'ok');
draw();
}).catch(function (ex) { toast(ex.message || 'ما تغيّر العرض.', 'bad'); });
}
}));
return box;
}
function coverForm(courseId) {
var box = el('section', 'card');
box.appendChild(el('h2', '', 'غلاف الدورة'));
var file = el('input');
file.type = 'file';
file.accept = 'image/jpeg,image/png,image/webp';
box.appendChild(field('صورة الغلاف', file));
box.appendChild(btn('حفظ الغلاف', {
soft: true,
on: function () {
var img = file.files && file.files[0];
if (!img) { toast('اختار صورة أولاً.', 'bad'); return; }
if (img.size > 5 * 1024 * 1024) { toast('الصورة أكبر من 5 ميغا.', 'bad'); return; }
var ext = (img.name.split('.').pop() || 'jpg').toLowerCase();
if (['jpg', 'jpeg', 'png', 'webp'].indexOf(ext) < 0) ext = 'jpg';
var key = 'publishers/' + uid() + '/cover_' + Date.now() + '.' + ext;
uploadBinary('avatars', key, img).then(function () {
var url = ROOT + '/storage/v1/object/public/avatars/' + key.split('/').map(encodeURIComponent).join('/');
return rpc('publisher_set_course_cover', { p_course_id: courseId, p_url: url });
}).then(function () {
toast('انحفظ الغلاف.', 'ok');
draw();
}).catch(function (ex) { toast(ex.message || 'ما انحفظ الغلاف.', 'bad'); });
}
}));
return box;
}
var ACCESS_LABEL = { paid: 'مدفوع', free_protected: 'مجاني · محمي', free_open: 'مجاني · غير محمي' };
function lessonAccess(course, l) {
var cp = Number(course.price) || 0;
if (!(l.is_free === true || ((Number(l.price) || 0) <= 0 && cp <= 0))) return 'paid';
var p = l.free_protection || (cp <= 0 ? course.free_protection : '') || 'protected';
return p === 'open' ? 'free_open' : 'free_protected';
}
function noProtColumn(ex) {
var m = String((ex && ex.message) || '');
var c = String((ex && ex.code) || '');
return m.indexOf('free_protection') >= 0 && (c === 'PGRST204' || c === '42703' || missingColumn(m) === 'free_protection');
}
function setLessonAccess(course, l, to) {
var cp = Number(course.price) || 0;
var lp = Number(l.price) || 0;
var body = {};
if (to === 'paid') {
if (cp <= 0 && lp <= 0) {
var raw = window.prompt('بالدورة المجانية الملف بيصير مدفوع بس إذا إلو سعر لحالو. حط سعر هالملف أول (ل.س جديدة):', '');
if (raw == null) return Promise.reject(new Error(''));
var n = readNum(raw, false);
if (n == null || n <= 0) return Promise.reject(new Error('سعر الملف لازم يكون رقم أكبر من 0. الأرقام العربية مقبولة.'));
body.price = n;
}
body.is_free = false;
} else {
body.free_protection = to === 'free_open' ? 'open' : 'protected';
if (cp > 0 || lp > 0) body.is_free = true;
}
function send(b) {
return api('PATCH', '/rest/v1/teacher_lessons?id=eq.' + l.id, b, true, { Prefer: 'return=representation' }).then(function (rows) {
var got = Array.isArray(rows) ? rows[0] : null;
if (!got) throw new Error('ما قدرنا نعدّل هالملف — حدّث الصفحة وجرّب.');
if ('is_free' in b && (got.is_free === true) !== b.is_free) {
return 'تم إرسال طلب التعديل للإدارة — رح يظهر للطلاب بعد الموافقة، ولحدّها بيضل القديم ظاهر.';
}
return 'انحفظت حالة الملف.';
});
}
return send(body).catch(function (ex) {
if (!('free_protection' in body) || !noProtColumn(ex)) throw ex;
var later = 'خيار الحماية بدّو تحديث قاعدة البيانات — لهلق ما تغيّرت الحماية.';
if (!('is_free' in body)) throw new Error(later);
delete body.free_protection;
return send(body).then(function (msg) { return msg + ' ' + later; });
});
}
function lessonList(g, course, lessons) {
var courseId = course.id;
var box = el('section', 'card');
box.appendChild(el('h2', '', 'محتوى الدورة'));
if (!lessons.length) box.appendChild(el('p', '', 'ما في دروس بعد. ضيف ملف أو فيديو أو اختبار تحت.'));
lessons.forEach(function (l) {
var row = el('div', 'lesson');
var info = el('div');
var kind = l.kind === 'video' || l.content_type === 'video' ? 'فيديو' : (l.kind === 'quiz' || l.content_type === 'quiz' ? 'اختبار' : 'ملف');
var acc = lessonAccess(course, l);
info.appendChild(el('b', '', l.title || 'درس'));
info.appendChild(el('p', 'hint', kind + ' · ' + reviewLabel(l.review_status)));
info.appendChild(el('span', 'lchip ' + acc, ACCESS_LABEL[acc]));
row.appendChild(info);
var actions = el('div', 'row-actions');
var pick = el('select', 'lstate');
pick.setAttribute('aria-label', 'غيّر حالة «' + (l.title || 'الدرس') + '»');
pick.appendChild(new Option('غيّر الحالة', ''));
['paid', 'free_protected', 'free_open'].forEach(function (a) {
var o = new Option(ACCESS_LABEL[a], a);
o.disabled = a === acc;
pick.appendChild(o);
});
pick.addEventListener('change', function () {
var to = pick.value;
if (!to || to === acc) { pick.value = ''; return; }
pick.disabled = true;
setLessonAccess(course, l, to).then(function (msg) {
toast(msg, 'ok');
draw();
}, function (ex) {
pick.value = '';
pick.disabled = false;
if (ex && ex.message) toast(ex.message, 'bad');
});
});
actions.appendChild(pick);
if (l.kind === 'quiz' || l.content_type === 'quiz') {
var open = el('a', 'btn slim', 'الأسئلة');
open.href = '#/quiz/' + encodeURIComponent(l.url || '') + '?course=' + courseId;
actions.appendChild(open);
}
var del = btn('حذف', {
soft: true,
on: function () {
if (!window.confirm('حذف «' + (l.title || 'الدرس') + '»؟')) return;
api('DELETE', '/rest/v1/teacher_lessons?id=eq.' + l.id, null, true, { Prefer: 'return=representation' })
.then(function (gone) {
if (Array.isArray(gone) && gone.length) toast('انحذف الدرس.', 'ok');
else toast('إذا كان الدرس واصل للطلاب، انبعت طلب الحذف للإدارة.', '');
draw();
}).catch(function (ex) { toast(ex.message || 'ما انحذف.', 'bad'); });
}
});
del.className = 'btn soft slim';
actions.appendChild(del);
row.appendChild(actions);
box.appendChild(row);
});
return box;
}
function addFile(g, courseId) {
var pub = pull('mec_pub') || {};
var box = el('section', 'card');
box.appendChild(el('h2', '', 'أضف ملف'));
box.appendChild(el('p', '', 'بي دي إف جاهز، بينحط متل ما هو بلا تنسيق وبلا حماية. ملف الوورد انشره من البرنامج حتى يتنسّق وينحمي.'));
box.appendChild(guard());
var title = textIn('fileTitle', '', 'عنوان الدرس');
var own = textIn('filePrice', '', 'فاضي = ينفتح مع الدورة');
own.inputMode = 'numeric';
var file = el('input');
file.type = 'file';
file.accept = 'application/pdf,.pdf';
var free = el('input');
free.type = 'checkbox';
var freeLab = el('label', 'check');
freeLab.appendChild(free);
freeLab.appendChild(el('span', '', 'درس مجاني للمعاينة'));
var understood = el('input');
understood.type = 'checkbox';
var undLab = el('label', 'check');
undLab.appendChild(understood);
undLab.appendChild(el('span', '', 'فهمت إن هالملف من الموقع بلا حماية، ولتكتمل حماية ملفاتي أنشر على البرنامج.'));
box.appendChild(field('عنوان الملف', title));
box.appendChild(field('سعر الدرس لحالو (اختياري)', own));
box.appendChild(field('ملف بي دي إف', file));
box.appendChild(freeLab);
box.appendChild(undLab);
box.appendChild(btn('أضف الملف بلا حماية', {
on: function () {
var pdf = file.files && file.files[0];
if (!title.value.trim()) { toast('اكتب عنوان الدرس.', 'bad'); return; }
if (!pdf) { toast('اختار ملف بي دي إف.', 'bad'); return; }
if (!/pdf$/i.test(pdf.name) && pdf.type !== 'application/pdf') {
toast('من الموقع بنقبل بي دي إف بس. ملف الوورد انشره من البرنامج.', 'bad');
return;
}
if (pdf.size > 100 * 1024 * 1024) { toast('الملف أكبر من 100 ميغا.', 'bad'); return; }
if (!understood.checked) { toast('علّم إنك فهمت إن الملف بلا حماية.', 'bad'); return; }
var key = 'publisher_ready/' + pub.id + '/' + Date.now() + '_' + safeBase(pdf.name) + '.pdf';
uploadBinary('pdfs', key, pdf).then(function () {
return rpc('publisher_add_ready_lesson', {
p_course_id: courseId,
p_title: title.value.trim(),
p_path: key,
p_page_count: 0,
p_is_free: free.checked
});
}).then(function (d) {
var lessonPrice = readNum(own.value, true) || 0;
if (lessonPrice > 0 && d && d.lesson_id) {
return api('PATCH', '/rest/v1/teacher_lessons?id=eq.' + d.lesson_id, { price: lessonPrice }, true)
.catch(function () {}).then(function () { return d; });
}
return d;
}).then(function (d) {
toast((d && d.message) || 'انضاف الملف كدرس.', 'ok');
draw();
}).catch(function (ex) { toast(ex.message || 'ما انضاف الملف.', 'bad'); });
}
}));
return box;
}
function addVideo(g, courseId) {
var box = el('section', 'card');
box.appendChild(el('h2', '', 'أضف فيديو'));
box.appendChild(el('p', '', 'حط رابط يوتيوب أو رابط الفيديو. رفع ملف فيديو كبير من الجهاز صار من البرنامج.'));
var title = textIn('videoTitle', '', 'عنوان الفيديو');
var url = textIn('videoUrl', '', 'https://', 'url');
url.className = 'ltr';
var free = el('input');
free.type = 'checkbox';
var lab = el('label', 'check');
lab.appendChild(free);
lab.appendChild(el('span', '', 'درس مجاني'));
box.appendChild(field('العنوان', title));
box.appendChild(field('الرابط', url));
box.appendChild(lab);
box.appendChild(btn('أضف الفيديو', {
soft: true,
on: function () {
if (!title.value.trim()) { toast('اكتب عنوان الفيديو.', 'bad'); return; }
if (!url.value.trim()) { toast('حط رابط الفيديو.', 'bad'); return; }
api('GET', '/rest/v1/teacher_lessons?course_id=eq.' + courseId + '&select=order_index&order=order_index.desc&limit=1', null, true)
.then(function (rows) {
var next = rows && rows[0] ? (Number(rows[0].order_index) || 0) + 1 : 1;
return api('POST', '/rest/v1/teacher_lessons', {
course_id: courseId,
title: title.value.trim(),
kind: 'video',
content_type: 'video',
url: url.value.trim(),
is_free: free.checked,
is_visible: true,
order_index: next
}, true, { Prefer: 'return=minimal' });
}).then(function () {
toast('انضاف الفيديو للدورة.', 'ok');
draw();
}).catch(function (ex) { toast(ex.message || 'ما انضاف الفيديو.', 'bad'); });
}
}));
return box;
}
function addQuiz(g, courseId) {
var box = el('section', 'card');
box.appendChild(el('h2', '', 'أضف اختباراً'));
var title = textIn('quizTitle', '', 'عنوان الاختبار');
var minutes = textIn('minutes', '20', '20');
minutes.inputMode = 'numeric';
var free = el('input');
free.type = 'checkbox';
var lab = el('label', 'check');
lab.appendChild(free);
lab.appendChild(el('span', '', 'اختبار مجاني'));
var agree = el('input');
agree.type = 'checkbox';
var ag = el('label', 'check');
ag.appendChild(agree);
ag.appendChild(el('span', '', 'أوافق على شروط إضافة الاختبار، وأنا مسؤول عن صحة الأسئلة.'));
box.appendChild(field('العنوان', title));
box.appendChild(field('المدة بالدقائق', minutes));
box.appendChild(lab);
box.appendChild(ag);
box.appendChild(btn('أنشئ الاختبار', {
soft: true,
on: function () {
if (!title.value.trim()) { toast('اكتب عنوان الاختبار.', 'bad'); return; }
if (!agree.checked) { toast('وافق على شروط إضافة الاختبار.', 'bad'); return; }
var mins = readNum(minutes.value, true) || 20;
rpc('publisher_quiz_create', {
p_course_id: courseId,
p_title: title.value.trim(),
p_minutes: mins,
p_is_free: free.checked
}).then(function (d) {
toast((d && d.message) || 'انشأ الاختبار.', 'ok');
if (d && d.quiz_id) go('#/quiz/' + d.quiz_id + '?course=' + courseId);
else draw();
}).catch(function (ex) { toast(ex.message || 'ما انشأ الاختبار.', 'bad'); });
}
}));
return box;
}
function renderQuiz(g) {
if (!token()) { go('#/login'); return; }
var id = route().id;
var course = '';
try { course = route().q.get('course') || ''; } catch (e) { course = ''; }
var back = course ? '#/course/' + course : '#/home';
if (!id) { screen('الاختبار', '', [note('رابط الاختبار غير صالح.', 'bad')], back); return; }
screen('الاختبار', 'عم نجيب الأسئلة…', [el('p', 'hint', 'لحظة…')], back);
rpc('publisher_quiz_get', { p_quiz_id: id }).then(function (data) {
if (stale(g)) return;
var quiz = (data && data.quiz) || data || {};
var questions = (data && data.questions) || [];
paintQuiz(id, quiz, questions, back);
}).catch(function (ex) {
if (!stale(g)) screen('الاختبار', '', [note(ex.message || 'ما قدرنا نفتح الاختبار.', 'bad')], back);
});
}
function paintQuiz(id, quiz, questions, back) {
var head = el('section', 'card');
head.appendChild(el('h2', '', quiz.title || 'اختبار'));
head.appendChild(el('p', '', (questions.length || 0) + ' سؤال · ' + (quiz.minutes || 20) + ' دقيقة'));
questions.forEach(function (q, i) {
var block = el('div', 'term');
block.appendChild(el('b', '', (i + 1) + '. ' + (q.question || '')));
var opts = q.options || [];
opts.forEach(function (o, idx) {
block.appendChild(el('p', 'hint', (idx === q.correct_index ? '✓ ' : '• ') + o));
});
head.appendChild(block);
});
var box = el('section', 'card');
box.appendChild(el('h2', '', 'سؤال جديد'));
var q = area('question', '', 'نص السؤال');
var opts = [0, 1, 2, 3].map(function (i) { return textIn('o' + i, '', 'الخيار ' + (i + 1)); });
var correct = el('select');
for (var i = 0; i < 4; i++) correct.appendChild(new Option('الصحيح هو الخيار ' + (i + 1), String(i)));
box.appendChild(field('السؤال', q));
opts.forEach(function (o, i) { box.appendChild(field('الخيار ' + (i + 1), o)); });
box.appendChild(field('الجواب الصحيح', correct));
box.appendChild(btn('حفظ السؤال', {
on: function () {
var options = opts.map(function (o) { return o.value.trim(); }).filter(Boolean);
if (!q.value.trim()) { toast('اكتب السؤال.', 'bad'); return; }
if (options.length < 2) { toast('لازم خيارين ع الأقل.', 'bad'); return; }
var idx = Number(correct.value);
if (idx >= options.length) idx = 0;
rpc('publisher_quiz_save_question', {
p_quiz_id: id,
p_question: q.value.trim(),
p_options: options,
p_correct: idx,
p_hint: '',
p_question_id: null
}).then(function (d) {
toast((d && d.message) || 'انحفظ السؤال.', 'ok');
draw();
}).catch(function (ex) { toast(ex.message || 'ما انحفظ السؤال.', 'bad'); });
}
}));
screen(quiz.title || 'الاختبار', 'نفس محرّر الاختبار بالتطبيق', [head, box], back);
}
function draw() {
clearInterval(tick);
paintGen += 1;
var g = paintGen;
paintNav();
if (!ROOT || !KEY) {
screen('ماي اكزامس', '', [note('إعدادات الاتصال ناقصة بملف config.js.', 'bad')]);
return;
}
var r = route();
if (r.name === 'login') return renderLogin(g);
if (r.name === 'signup') return renderSignup(g);
if (r.name === 'otp') return renderOtp(g);
if (r.name === 'terms') return renderTerms(g);
if (r.name === 'apply') return renderApply(g);
if (r.name === 'course') return renderCourse(g);
if (r.name === 'quiz') return renderQuiz(g);
renderHome(g);
}
window.addEventListener('hashchange', draw);
if (!location.hash) location.hash = '#/home';
else draw();
})();
