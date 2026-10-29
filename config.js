window.MEC_SHARE = {
supabaseUrl: 'https://nfqlfgiujcsccktqcpuh.supabase.co',
anonKey:
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcWxmZ2l1amNzY2NrdHFjcHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyOTQ0NDcsImV4cCI6MjA3NTg3MDQ0N30.IqrKyzEIqHCupk51wCRPcce_X4sQMo4tyBvyu0_pgzw',
scheme: 'myexams',
schemeHost: 'open',
androidPackage: 'com.mec.myexams',
appDownloadUrl: '',
iosStoreUrl: '',
brand: {
mark: 'My Exams',
nameAr: 'ماي اكزامس',
tagline: 'تعلّم · اختبر · تميّز',
},
track: true,
assetVersion: 'bcc0a01391',
};
(function () {
var done = false;
function mk(tag, cls, text) {
var n = document.createElement(tag);
n.className = cls;
if (text) n.textContent = text;
return n;
}
function stuck(failed) {
var app = document.getElementById('app');
if (done || window.MEC || !app || !app.querySelector('.skeleton')) return;
done = true;
var card = mk('section', 'card state-card');
var box = mk('div', 'mec-state mec-state-warn');
var b = mk('button', 'btn btn-primary mec-state-btn', 'إعادة المحاولة');
box.setAttribute('role', 'alert');
b.type = 'button';
b.addEventListener('click', function () { window.location.reload(); });
box.appendChild(mk('h2', 'mec-state-title', failed ? 'النت ضعيف أو مقطوع' : 'النت بطيء كتير'));
box.appendChild(mk('p', 'mec-state-text', failed ? 'ما قدرنا نكمّل تحميل الصفحة. جرّب مرّة تانية.'
: 'الصفحة لسا عم تتحمّل — استنّى شوي أو جرّب مرّة تانية.'));
box.appendChild(b);
card.appendChild(box);
while (app.firstChild) app.removeChild(app.firstChild);
app.appendChild(card);
app.setAttribute('aria-busy', 'false');
}
window.addEventListener('error', function (e) {
var t = e && e.target;
if (t && t.tagName === 'SCRIPT' && /\/app\.js/.test(t.src || '')) stuck(true);
}, true);
setTimeout(function () { stuck(false); }, 45000);
})();
