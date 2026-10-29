(function () {
'use strict';
var CFG = window.MEC_SHARE || {};
var SUPA = String(CFG.supabaseUrl || '').replace(/\/+$/, '');
var API = SUPA + '/rest/v1/';
var KEY = String(CFG.anonKey || '');
var VERSION = String(CFG.assetVersion || 'dev');
var SCHEME = String(CFG.scheme || 'myexams');
var SCHEME_HOST = String(CFG.schemeHost || 'open');
var PKG = String(CFG.androidPackage || 'com.mec.myexams');
var BRAND_AR = (CFG.brand && CFG.brand.nameAr) || 'ماي اكزامس';
var BRAND_TAG = (CFG.brand && CFG.brand.tagline) || 'تعلّم · اختبر · تميّز';
var TIMEOUT_MS = 25000;
var RETRY_DELAYS = [1500, 4000];
var SLOW_HINT_MS = 7000;
var SCRIPT_TIMEOUT_MS = 60000;
var CSS_WAIT_MS = 20000;
var CACHE_MAX = 8;
var CACHE_RE = /^mec_[cp]1_/;
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var REF_RE = /^[A-Za-z0-9_-]{1,32}$/;
var DL_KEY = 'mec_dl_at';
var VID_KEY = 'mec_vid';
var APP_KEY = 'mec_app1';
var DL_WINDOW_MS = 2 * 24 * 3600 * 1000;
var KINDS = ['file', 'video', 'quiz'];
var HAS_PUSH = !!(window.history && typeof window.history.pushState === 'function' &&
typeof window.history.replaceState === 'function');
function plural(n, one, many) {
var v = int(n);
var m = v % 100;
return v + ' ' + (v === 2 || (m >= 3 && m <= 10) ? many : one);
}
var T = {
titleDefault: 'دورات على ' + BRAND_AR,
titlePublisher: function (n) { return n + ' على ' + BRAND_AR; },
titleCourse: function (c, p) { return p ? c + ' — ' + p : c; },
open: 'افتح بالتطبيق',
openCourse: 'افتح الدورة بالتطبيق',
continueInApp: 'كمّل الدورة بالتطبيق',
download: 'حمّل التطبيق',
downloadNotFound: 'حمّل التطبيق وشوف باقي الدورات',
retry: 'إعادة المحاولة',
refresh: 'حدّث',
refreshing: 'عم نحدّث…',
loading: 'عم نجيب التفاصيل…',
preparing: 'جارٍ التحضير…',
slow: 'النت بطيء — عم نكمّل المحاولة…',
stale: 'عم نعرض آخر نسخة محفوظة — ما قدرنا نحدّث لأن النت ضعيف.',
notFound: 'هالرابط ما عاد شغّال — يمكن الدورة انخفت أو انشالت.',
notFoundPublisher: 'هالرابط ما عاد شغّال — يمكن صفحة الناشر انخفت أو انشالت.',
notFoundTitle: 'ما لقينا شي على هالرابط',
landing: BRAND_AR + ' — كل ملخصاتك واختباراتك ودوراتك بتطبيق واحد.',
feat1: 'ملخصات ومحاضرات مرتّبة لكل مادة',
feat2: 'اختبارات بتصحيح فوري',
feat3: 'دورات من أساتذة وجامعات ومدارس',
portal: 'ادخل من الموقع',
kinds: { university: 'جامعة', school: 'مدرسة', individual: 'ناشر حرّ', team: 'فريق' },
courses: function (n) { return plural(n, 'دورة', 'دورات'); },
followers: function (n) { return plural(n, 'متابع', 'متابعين'); },
lessons: function (n) { return plural(n, 'درس', 'دروس'); },
readMore: 'اقرأ المزيد',
readLess: 'عرض أقل',
hisCourses: 'دوراته',
emptyPublisher: 'ما نزّل دورات لهلق.',
aboutCourse: 'عن الدورة',
courseContent: 'محتوى الدورة',
kindVideo: 'فيديو',
kindFile: 'ملفات',
kindQuiz: 'اختبارات',
free: 'مجاني',
freeCourse: 'دورة مجانية',
currency: 'ل.س جديدة',
payShamCash: 'الدفع بشام كاش',
discount: function (n) { return 'خصم ' + n + '٪'; },
discountUntil: function (d, m) { return 'الخصم لحدّ ' + d + ' ' + m; },
noDesc: 'الناشر ما كتب وصف لهالدورة لسا.',
allCourses: function (n) { return 'شوف كل دورات ' + n; },
publisherFallback: 'ناشر',
untitled: 'دورة بلا عنوان',
share: 'شارك الدورة',
shareSub: 'ابعت الرابط لرفقاتك',
by: 'الناشر',
options: 'خياراتك',
fullPrice: 'سعر الدورة كاملة',
allOpen: 'كل دروسها مفتوحة',
tryFree: 'جرّب مجاناً',
startFirst: 'ابدأ أول درس',
tryFreeTail: '» بينفتح هون مباشرة، بلا تسجيل',
buyCourse: 'اشتري الدورة كاملة',
buySub: 'بشام كاش أو بكود تفعيل — من التطبيق',
openSub: 'وكمّل كل دروسها من هناك',
factLesson: 'درس',
factLessons: 'دروس',
factPages: 'صفحة',
factFree: 'مجاني',
factStudents: 'طالب',
factRating: function (n) { return plural(n, 'تقييم', 'تقييمات'); },
all: 'الكل',
tabsLabel: 'أنواع الدروس',
tabs: { file: 'الملفات', video: 'الفيديو', quiz: 'الاختبارات' },
emptyTab: {
file: 'ما في ملفات بهالدورة بعد',
video: 'ما في فيديوهات بهالدورة بعد',
quiz: 'ما في اختبارات بهالدورة بعد',
},
noLessons: 'ما في دروس بهالدورة لهلق',
noLessonsHint: 'أوّل ما يضيف الناشر دروسه رح تطلعلك هون.',
freeStrip: function (n, all) {
return 'فيك تفتح ' + (n === 1 ? 'درس مجاني واحد' : n === 2 ? 'درسين مجانيين' : plural(n, 'درس مجاني', 'دروس مجانية')) +
' من هون مباشرة' + (all ? '.' : ' — الباقي بالتطبيق.');
},
type: { file: 'ملف', video: 'فيديو', quiz: 'اختبار' },
lessonN: function (n) { return 'درس ' + n; },
lockedTitle: 'محتوى مقفول',
lockedText: 'افتحه بعد ما تشتري الدورة بشام كاش أو تفعّلها بكود — من التطبيق.',
unavailable: 'هذا الدرس غير متاح حالياً — جرّب بعدين.',
lockedSr: 'مقفول',
back: 'رجوع',
leaveConfirm: 'إذا طلعت رح تضيع إجاباتك.',
outlineNote: 'افتح الدورة بالتطبيق لتشوف الدروس',
lessonNotHere: 'هالدرس مو متاح من هون — افتحه بالتطبيق.',
whatCourse: 'الدورة',
whatPublisher: 'صفحة الناشر',
whatLessons: 'دروس الدورة',
whatLesson: 'الدرس',
videoOnYoutube: 'هالفيديو متاح للمشاهدة على يوتيوب',
openYoutube: 'افتح على يوتيوب',
playVideo: 'شغّل الفيديو',
videoAppOnly: 'هالفيديو بينفتح بالتطبيق بس',
videoAppOnlyHint: 'افتح الدورة بالتطبيق لتتفرّج عليه.',
backFromDownloadCourse: 'نزّلت التطبيق؟ اكبس «افتح بالتطبيق» لتنفتح الدورة فيه مباشرة.',
backFromDownloadPublisher: 'نزّلت التطبيق؟ اكبس «افتح بالتطبيق» لتنفتح صفحة الناشر فيه مباشرة.',
notOpened: 'ما انفتح التطبيق؟ يمكن مو منزّل عندك أو نسخته قديمة —',
notOpenedDl: 'حمّل آخر نسخة',
notOpenedNoDl: 'ما انفتح التطبيق؟ يمكن مو منزّل عندك أو نسخته قديمة — اطلب رابط التنزيل من الناشر أو من يلي بعتلك هالرابط.',
inApp: 'إذا ما انفتح التطبيق، افتح الرابط بمتصفح كروم.',
copyLink: 'انسخ الرابط',
copied: 'انسخنا الرابط ✅',
copyFailed: 'انسخ الرابط من هون:',
installHelp: 'التطبيق متوفر للأندرويد. بعد التنزيل افتح الملف واسمح بالتثبيت.',
iphone: 'نسخة الآيفون لسا مو متوفرة من هون.',
desktop: 'افتح هالرابط من موبايلك لتنزّل التطبيق.',
desktopNoDl: 'التطبيق للموبايل — إذا مو منزّل عندك اطلب رابط التنزيل من الناشر أو من يلي بعتلك هالرابط.',
oldBrowser: 'متصفحك قديم وما بيقدر يفتح هالصفحة — جرّب كروم، أو حمّل التطبيق مباشرة.',
months: ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'],
};
var NET_COPY = {
offline: {
title: 'النت ضعيف أو مقطوع',
body: 'ما قدرنا نوصل للسيرفر. تأكّد من الاتصال وجرّب مرّة تانية.',
reason: 'النت ضعيف أو مقطوع. جرّب مرّة تانية.',
icon: 'wifiOff',
tone: 'err',
},
timeout: {
title: 'النت بطيء كتير',
body: 'الرد تأخّر وما لحق يوصل. جرّب مرّة تانية.',
reason: 'النت بطيء كتير وما لحق الرد يوصل. جرّب مرّة تانية.',
icon: 'wifiOff',
tone: 'warn',
},
server: {
title: 'السيرفر مضغوط هلّق',
body: 'المشكلة مو عندك، جرّب بعد شوي.',
reason: 'السيرفر مضغوط هلّق والمشكلة مو عندك. جرّب بعد شوي.',
icon: 'cloudOff',
tone: 'warn',
},
missing: {
title: 'في تحديث ناقص عند السيرفر',
body: 'هالميزة لسا عم تتجهّز — خبّر الدعم الفني ليشغّلوا التحديث.',
reason: 'في تحديث ناقص عند السيرفر. خبّر الدعم الفني.',
icon: 'update',
tone: 'err',
},
other: {
title: 'صار خطأ غير متوقّع',
body: 'جرّب مرّة تانية، وإذا تكرّر خبّر الدعم الفني.',
reason: 'صار خطأ غير متوقّع. جرّب مرّة تانية، وإذا تكرّر خبّر الدعم الفني.',
icon: 'error',
tone: 'err',
},
};
var ICONS = {
download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
open: 'M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
book: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z',
menuBook: 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z',
stories: 'M19 1l-5 5v11l5-4.5V1zM1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5V6c-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6zm22 13.5V6c-.6-.45-1.25-.75-2-1v13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5v2c1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5v-1.1z',
tree: 'M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z',
lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
lockOpen: 'M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z',
video: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z',
play: 'M8 5v14l11-7z',
file: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
pdf: 'M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z',
quiz: 'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5.99 13c-.59 0-1.05-.47-1.05-1.05 0-.59.47-1.04 1.05-1.04.59 0 1.04.45 1.04 1.04-.01.58-.45 1.05-1.04 1.05zm2.5-6.17c-.63.93-1.23 1.21-1.56 1.81-.13.24-.18.4-.18 1.18h-1.52c0-.41-.06-1.08.26-1.65.41-.73 1.18-1.16 1.63-1.8.48-.68.21-1.94-1.14-1.94-.88 0-1.32.67-1.5 1.23l-1.37-.57C11.51 5.96 12.52 5 13.99 5c1.23 0 2.08.56 2.51 1.26.37.61.58 1.73.01 2.57z',
star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
people: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
refresh: 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
cloudOff: 'M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 6.23 11.08 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 18.16 24 16.68 24 15c0-2.64-2.05-4.78-4.65-4.96zM3 5.27l2.75 2.74C2.56 8.15 0 10.77 0 14c0 3.31 2.69 6 6 6h11.73l2 2L21 20.73 4.27 4 3 5.27zM7.73 10l8 8H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h1.73z',
wifiOff: 'M22.99 9C19.15 5.16 13.8 3.76 8.84 4.78l2.52 2.52c3.47-.17 6.99 1.05 9.63 3.7l2-2zm-4 4c-1.29-1.29-2.84-2.13-4.49-2.56l3.53 3.53.96-.97zM2 3.05L5.07 6.1C3.6 6.82 2.22 7.78 1 9l1.99 2c1.24-1.24 2.67-2.16 4.2-2.77l2.24 2.24C7.81 10.89 6.27 11.73 5 13v.01L6.99 15c1.36-1.36 3.14-2.04 4.92-2.06L18.98 20l1.27-1.26L3.29 1.79 2 3.05zM9 17l3 3 3-3c-1.65-1.66-4.34-1.66-6 0z',
error: 'M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
update: 'M12 16.5l4-4h-3v-9h-2v9H8l4 4zm9-13h-6v1.99h6v14.03H3V5.49h6V3.5H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2v-14c0-1.1-.9-2-2-2z',
info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
infoOutline: 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
place: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
university: 'M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z',
school: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
chevron: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
arrowBack: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
share: 'M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z',
verified: 'M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z',
phone: 'M16 1H8C6.34 1 5 2.34 5 4v16c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3V4c0-1.66-1.34-3-3-3zm-2 20h-4v-1h4v1zm3.25-3H6.75V4h10.5v14z',
check: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
minus: 'M19 13H5v-2h14v2z',
lightbulb: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
send: 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z',
timer: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
zoomIn: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm2.5-4h-2v2H9v-2H7V9h2V7h1v2h2v1z',
zoomOut: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z',
};
var SVG_NS = 'http://www.w3.org/2000/svg';
function icon(name, cls) {
var svg = document.createElementNS(SVG_NS, 'svg');
svg.setAttribute('viewBox', '0 0 24 24');
svg.setAttribute('aria-hidden', 'true');
svg.setAttribute('focusable', 'false');
svg.setAttribute('class', 'ic' + (cls ? ' ' + cls : ''));
var p = document.createElementNS(SVG_NS, 'path');
p.setAttribute('d', ICONS[name] || ICONS.info);
svg.appendChild(p);
return svg;
}
function str(v) {
if (v === null || v === undefined) return '';
var s = String(v);
return s === 'null' || s === 'undefined' ? '' : s;
}
function num(v) {
var n = typeof v === 'number' ? v : parseFloat(str(v));
return isFinite(n) ? n : 0;
}
function int(v) {
return Math.max(0, Math.round(num(v)));
}
function httpsUrl(v) {
var s = str(v).trim();
return /^https:\/\/[^\s]+$/i.test(s) ? s : '';
}
function hasOwn(o, k) {
return Object.prototype.hasOwnProperty.call(o, k);
}
function chars(s) {
var t = String(s);
var out = [];
for (var i = 0; i < t.length; i++) {
var c = t.charCodeAt(i);
if (c >= 0xD800 && c <= 0xDBFF && i + 1 < t.length) {
var d = t.charCodeAt(i + 1);
if (d >= 0xDC00 && d <= 0xDFFF) {
out.push(t.charAt(i) + t.charAt(i + 1));
i++;
continue;
}
}
out.push(t.charAt(i));
}
return out;
}
function money(v) {
var c = Math.round(Math.abs(num(v)) * 100);
var s = String(Math.floor(c / 100));
var f = c % 100;
var out = '';
for (var i = 0; i < s.length; i++) {
if (i > 0 && (s.length - i) % 3 === 0) out += '٬';
out += s.charAt(i);
}
if (f) out += '.' + (f < 10 ? '0' + f : String(f % 10 ? f : f / 10));
return (num(v) < 0 && c ? '-' : '') + out;
}
function wait(ms) {
return new Promise(function (r) { setTimeout(r, ms); });
}
function fail(kind, detail) {
var e = new Error(kind + (detail ? ': ' + detail : ''));
e.kind = kind;
e.detail = str(detail);
return e;
}
function logErr(where, e) {
try {
if (window.console && window.console.error) window.console.error('[MEC] ' + where, e);
} catch (x) {   }
}
function el(tag, cls, text) {
var n = document.createElement(tag);
if (cls) n.className = cls;
if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
return n;
}
function elAuto(tag, cls, text) {
var n = el(tag, cls, text);
n.setAttribute('dir', 'auto');
return n;
}
function add(parent) {
for (var i = 1; i < arguments.length; i++) {
var c = arguments[i];
if (!c) continue;
if (Array.isArray(c)) {
for (var j = 0; j < c.length; j++) if (c[j]) parent.appendChild(c[j]);
} else {
parent.appendChild(c);
}
}
return parent;
}
function clear(node) {
while (node && node.firstChild) node.removeChild(node.firstChild);
}
function detach(node) {
if (node && node.parentNode) node.parentNode.removeChild(node);
}
function focusNoScroll(node) {
if (!node || !node.focus) return;
try {
node.focus({ preventScroll: true });
} catch (e) {
try { node.focus(); } catch (x) {   }
}
}
function pageY() {
return window.pageYOffset || document.documentElement.scrollTop || 0;
}
function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {   } }
function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) {   } }
function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {   } }
function parseQuery(search) {
var out = {};
var q = String(search || '');
var at = q.indexOf('?');
if (at >= 0) q = q.slice(at + 1);
q = q.split('#')[0];
if (!q) return out;
var pairs = q.split('&');
for (var i = 0; i < pairs.length; i++) {
var pair = pairs[i];
if (!pair) continue;
var eq = pair.indexOf('=');
var k = eq < 0 ? pair : pair.slice(0, eq);
var v = eq < 0 ? '' : pair.slice(eq + 1);
try {
k = decodeURIComponent(k.replace(/\+/g, ' '));
v = decodeURIComponent(v.replace(/\+/g, ' '));
} catch (e) {
continue;
}
if (!hasOwn(out, k)) out[k] = v.trim();
}
return out;
}
function parseRoute(search) {
var q = parseQuery(search);
if (q.c) {
if (!UUID_RE.test(q.c)) return { kind: 'bad' };
var lesson = '';
if (q.l) lesson = UUID_RE.test(q.l) ? q.l.toLowerCase() : 'bad';
return { kind: 'course', id: q.c.toLowerCase(), lesson: lesson };
}
if (q.p) {
if (!UUID_RE.test(q.p)) return { kind: 'bad', pub: true };
return { kind: 'publisher', id: q.p.toLowerCase() };
}
return { kind: 'landing' };
}
var Q0 = parseQuery(window.location.search);
var REF = Q0.r || Q0.s || '';
REF = REF_RE.test(REF) ? REF : '';
var CAME_BACK = Q0.dl === '1';
var UA = navigator.userAgent || '';
var IS_ANDROID = /Android/i.test(UA);
var IS_IOS = /iPhone|iPad|iPod/i.test(UA) ||
(/Macintosh/i.test(UA) && (navigator.maxTouchPoints || 0) > 1);
var IS_DESKTOP = !IS_ANDROID && !IS_IOS && !/Mobi|Tablet/i.test(UA);
var IN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Telegram|Snapchat|Line\/|MicroMessenger|; wv\)/i.test(UA);
var IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost|.+\.test)$/i.test(window.location.hostname);
var TRACK = CFG.track !== false && !IS_LOCAL;
function refQuery(ref) {
var r = ref === undefined ? REF : ref;
return r ? '&r=' + encodeURIComponent(r) : '';
}
function localHref(kind, id, ref) {
return '?' + (kind === 'course' ? 'c=' : 'p=') + encodeURIComponent(id) + refQuery(ref);
}
function lessonHref(courseId, lessonId) {
return '?c=' + encodeURIComponent(courseId) + '&l=' + encodeURIComponent(lessonId) + refQuery();
}
function absolutePage(t, extra, ref) {
var loc = window.location;
var base = (loc.origin || (loc.protocol + '//' + loc.host)) + loc.pathname;
return base + localHref(t.kind, t.id, ref) + (extra || '');
}
function deepQuery(t) {
return (t.kind === 'course' ? 'c=' : 'p=') + encodeURIComponent(t.id) +
'&r=' + encodeURIComponent(REF || 'web');
}
function authHeaders(json) {
var h = { apikey: KEY, Authorization: 'Bearer ' + KEY };
if (json) h['Content-Type'] = 'application/json';
return h;
}
function httpError(status, data, storage) {
var code = data && data.code ? String(data.code) : '';
if (status === 408 || status === 429 || status >= 500) return fail('net', 'http-' + status);
if (storage) {
var sc = data && (data.statusCode || data.status) ? String(data.statusCode || data.status) : '';
if (status === 404 || sc === '404') return fail('gone', 'storage-' + status);
if (status === 400 || status === 401 || status === 403) return fail('denied', 'storage-' + status);
return fail('bad', 'storage-' + status);
}
if (code === 'PGRST202' || code === '42883' || code === 'PGRST205' || code === '42P01' ||
status === 404) {
return fail('missing', code || String(status));
}
if (status === 401 || status === 403) return fail('denied', code || String(status));
return fail('bad', code || String(status));
}
function send(url, o) {
o = o || {};
return new Promise(function (resolve, reject) {
var ctrl = typeof window.AbortController === 'function' ? new window.AbortController() : null;
var done = false;
var finish = function (err, data) {
if (done) return;
done = true;
clearTimeout(timer);
if (err) reject(err);
else resolve(data);
};
var timer = setTimeout(function () {
if (ctrl) {
try { ctrl.abort(); } catch (e) {   }
}
finish(fail('net', 'timeout'));
}, o.timeout || TIMEOUT_MS);
var init = { method: o.method || 'GET', credentials: 'omit', cache: 'no-store' };
if (o.headers) init.headers = o.headers;
if (o.body !== undefined) init.body = JSON.stringify(o.body);
if (ctrl) init.signal = ctrl.signal;
var p;
try {
p = window.fetch(url, init);
} catch (e) {
finish(fail('net', 'offline'));
return;
}
p.then(function (res) {
return res.text().then(function (txt) {
var data = null;
var parsed = !txt;
if (txt) {
try {
data = JSON.parse(txt);
parsed = true;
} catch (e) {
parsed = false;
}
}
if (res.ok) {
if (!parsed) finish(fail('net', 'garbled'));
else finish(null, data);
return;
}
finish(httpError(res.status, data, o.storage));
});
}).then(null, function (e) {
finish(e && e.kind ? e : fail('net', navigator.onLine === false ? 'offline' : 'fetch'));
});
});
}
function withRetry(fn, retries) {
var left = typeof retries === 'number' ? retries : RETRY_DELAYS.length;
var attempt = 0;
var run = function () {
return fn().then(null, function (e) {
if (!e || e.kind !== 'net' || attempt >= left) throw e;
var d = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
attempt++;
return wait(d).then(run);
});
};
return run();
}
function qs(params) {
var out = [];
if (params) {
for (var k in params) {
if (!hasOwn(params, k)) continue;
var v = params[k];
if (v === undefined || v === null) continue;
out.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
}
}
return out.join('&');
}
function withKey(base, q) {
return base + '?' + (q ? q + '&' : '') + 'apikey=' + encodeURIComponent(KEY);
}
function rpcGet(name, params, opts) {
var url = withKey(API + 'rpc/' + encodeURIComponent(name), qs(params));
return withRetry(function () {
return send(url, { timeout: opts && opts.timeout });
}, opts && opts.retries);
}
function select(table, query, opts) {
var q = str(query).replace(/^[?&]+/, '');
var url = withKey(API + encodeURIComponent(table), q);
return withRetry(function () {
return send(url, { timeout: opts && opts.timeout });
}, opts && opts.retries);
}
function rpcPost(name, params) {
return withRetry(function () {
return send(API + 'rpc/' + name, { method: 'POST', headers: authHeaders(true), body: params || {}, timeout: 45000 });
});
}
function signPdf(path, expiresIn) {
var raw = str(path).trim();
if (/^https:\/\//i.test(raw)) {
return raw.indexOf(SUPA + '/storage/v1/') === 0 ? Promise.resolve(raw)
: Promise.reject(fail('bad', 'foreign-url'));
}
raw = raw.replace(/^\/+/, '').replace(/^pdfs\//, '');
if (!raw || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.split('/').some(function (s) { return s === '' || s === '.' || s === '..'; })) {
return Promise.reject(fail('bad', 'path'));
}
var enc = raw.split('/').map(function (s) { return encodeURIComponent(s); }).join('/');
var secs = int(expiresIn) || 3600;
return withRetry(function () {
return send(SUPA + '/storage/v1/object/sign/pdfs/' + enc, {
method: 'POST',
headers: authHeaders(true),
body: { expiresIn: secs },
storage: true,
timeout: 45000,
});
}).then(function (d) {
var s = str(d && (d.signedURL || d.signedUrl));
if (!s) throw fail('bad', 'no-signed-url');
if (/^https:\/\//i.test(s)) return s;
if (s.charAt(0) !== '/') s = '/' + s;
return SUPA + '/storage/v1' + s;
});
}
var scripts = {};
var styles = {};
function loadScript(src) {
if (scripts[src]) return scripts[src];
var p = new Promise(function (resolve, reject) {
var s = document.createElement('script');
var done = false;
var timer = 0;
var finish = function (err) {
if (done) return;
done = true;
clearTimeout(timer);
s.onload = null;
s.onerror = null;
if (err) {
delete scripts[src];
detach(s);
reject(err);
} else {
resolve();
}
};
timer = setTimeout(function () { finish(fail('net', 'timeout')); }, SCRIPT_TIMEOUT_MS);
s.onload = function () { finish(null); };
s.onerror = function () { finish(fail('net', navigator.onLine === false ? 'offline' : 'script')); };
s.async = true;
s.src = src;
(document.head || document.documentElement).appendChild(s);
});
scripts[src] = p;
return p;
}
function loadCss(href) {
if (styles[href]) return styles[href];
var p = new Promise(function (resolve) {
var l = document.createElement('link');
var done = false;
var finish = function (ok) {
if (done) return;
done = true;
l.onload = null;
l.onerror = null;
if (!ok) {
delete styles[href];
detach(l);
}
resolve(ok);
};
l.rel = 'stylesheet';
l.onload = function () { finish(true); };
l.onerror = function () { finish(false); };
setTimeout(function () { finish(true); }, CSS_WAIT_MS);
l.href = href;
(document.head || document.documentElement).appendChild(l);
});
styles[href] = p;
return p;
}
function errInfo(err) {
var k = err && err.kind;
var d = str(err && err.detail);
if (k === 'missing') return NET_COPY.missing;
if (k === 'net') {
if (d === 'timeout' || d === 'http-408') return NET_COPY.timeout;
if (d.indexOf('http-') === 0) return NET_COPY.server;
return NET_COPY.offline;
}
return NET_COPY.other;
}
function errText(err, what) {
var c = errInfo(err);
var w = str(what).trim();
return w ? 'ما قدرنا نجيب ' + w + ' — ' + c.reason : c.title + ' — ' + c.body;
}
function backButton(onClick, variant) {
var v = variant === 'frost' || variant === 'dark' ? variant : 'plain';
var b = el('button', 'mec-back mec-back-' + v);
b.type = 'button';
b.setAttribute('aria-label', T.back);
b.setAttribute('title', T.back);
b.appendChild(icon('arrowBack'));
if (typeof onClick === 'function') {
b.addEventListener('click', function (ev) { onClick(ev); });
if (viewer) viewer.backFn = onClick;
}
return b;
}
function errorState(err, what, onRetry) {
var info = errInfo(err);
var w = str(what).trim();
var box = el('div', 'mec-state mec-state-' + info.tone);
box.setAttribute('role', 'alert');
var ic = el('div', 'mec-state-icon');
ic.appendChild(icon(info.icon));
add(box, ic,
el('h2', 'mec-state-title', w ? 'ما قدرنا نجيب ' + w : info.title),
el('p', 'mec-state-text', w ? info.reason : info.body));
if (typeof onRetry === 'function') {
var b = el('button', 'btn btn-primary mec-state-btn');
b.type = 'button';
add(b, icon('refresh'), el('span', '', T.retry));
var used = false;
var onOnline = function () {
if (document.body.contains(b)) fire();
else window.removeEventListener('online', onOnline);
};
var fire = function () {
if (used) return;
used = true;
window.removeEventListener('online', onOnline);
b.disabled = true;
onRetry();
};
b.addEventListener('click', fire);
window.addEventListener('online', onOnline);
box.appendChild(b);
}
return box;
}
function loading(text) {
var w = el('div', 'mec-loading');
w.setAttribute('role', 'status');
var sp = el('span', 'mec-spin');
sp.setAttribute('aria-hidden', 'true');
var t = el('p', 'mec-loading-text', text || T.preparing);
add(w, sp, t);
w.setText = function (s) { t.textContent = str(s); };
return w;
}
function btnClass(cls, variant) {
var c = str(cls).trim();
return /(^|\s)btn-(primary|outline|soft)(\s|$)/.test(c) ? c : variant + (c ? ' ' + c : '');
}
var toastEl = null;
var toastTimer = 0;
function toast(text, kind) {
if (!document.body) return;
if (!toastEl) {
toastEl = el('div', 'mec-toast');
toastEl.setAttribute('role', 'status');
toastEl.setAttribute('aria-live', 'polite');
document.body.appendChild(toastEl);
}
var err = kind === 'err';
toastEl.className = 'mec-toast ' + (err ? 'mec-toast-err' : 'mec-toast-ok') + (viewer ? ' at-top' : '');
clear(toastEl);
add(toastEl, icon(err ? 'error' : 'check'), el('span', '', str(text)));
var cta = document.getElementById('cta');
toastEl.style.bottom = !viewer && cta && !cta.hidden ? (cta.offsetHeight + 12) + 'px' : '';
void toastEl.offsetWidth;
toastEl.className += ' show';
clearTimeout(toastTimer);
toastTimer = setTimeout(function () {
if (toastEl) toastEl.className = toastEl.className.replace(/\s*show\b/, '');
}, 2800);
}
window.MEC = {
version: VERSION,
cfg: CFG,
T: T,
icons: ICONS,
el: el,
add: add,
clear: clear,
icon: icon,
str: str,
int: int,
num: num,
lsGet: lsGet,
lsSet: lsSet,
plural: plural,
loadScript: loadScript,
loadCss: loadCss,
api: {
rpcGet: rpcGet,
select: select,
signPdf: signPdf,
},
errText: errText,
ui: {
backButton: backButton,
errorState: errorState,
loading: loading,
openInAppButton: function (label, cls) {
return openButton(currentTarget(), label || T.open, btnClass(cls, 'btn-primary'));
},
downloadButton: function (label, cls) {
return canOfferDownload() ? downloadButton(label || T.download, btnClass(cls, 'btn-outline')) : null;
},
toast: toast,
},
};
window.MEC_VIEWERS = window.MEC_VIEWERS || {};
function normKind(k) {
var s = str(k).toLowerCase();
if (s === 'university' || s === 'school' || s === 'team') return s;
return 'individual';
}
function normPublisher(m) {
m = m || {};
return {
id: str(m.id).toLowerCase(),
name: str(m.display_name || m.name).trim(),
kind: normKind(m.kind),
about: str(m.about).trim(),
city: str(m.city).trim(),
logo: str(m.logo_url || m.logo).trim(),
courses: m.courses === undefined || m.courses === null ? null : int(m.courses),
followers: m.followers === undefined || m.followers === null ? null : int(m.followers),
};
}
function lessonKindOf(kind, contentType) {
var k = str(kind).toLowerCase();
var c = str(contentType).toLowerCase();
if (k === 'video' || c === 'video') return 'video';
if (k === 'quiz' || c === 'quiz') return 'quiz';
return 'file';
}
function looseKind(k) {
var s = str(k).toLowerCase();
if (s.indexOf('quiz') >= 0) return 'quiz';
if (s.indexOf('video') >= 0) return 'video';
return 'file';
}
function normKinds(list) {
var seen = {};
(Array.isArray(list) ? list : []).forEach(function (k) {
if (str(k).trim()) seen[looseKind(k)] = true;
});
return ['video', 'file', 'quiz'].filter(function (k) { return seen[k]; });
}
function normOutline(list) {
if (!Array.isArray(list)) return null;
return list.map(function (l) {
l = l || {};
return {
title: str(l.title).trim(),
kind: looseKind(l.kind),
free: l.is_free === true,
pages: int(l.pages),
};
});
}
function normLessons(list) {
if (!Array.isArray(list)) return null;
var out = [];
for (var i = 0; i < list.length; i++) {
var r = list[i] || {};
var id = str(r.id).toLowerCase();
var url = str(r.url).trim();
var status = str(r.review_status).trim().toLowerCase();
var avail = r.withdrawn !== true && (!status || status === 'approved');
var okId = UUID_RE.test(id);
out.push({
id: okId ? id : '',
title: str(r.title).trim(),
kind: lessonKindOf(r.kind, r.content_type),
url: url,
free: r.is_free === true,
avail: avail,
openable: avail && okId && r.unlocked === true && url !== '',
pages: int(r.page_count),
minutes: int(r.minutes),
questions: int(r.questions),
n: 0,
});
}
return out;
}
function normCourse(m) {
m = m || {};
var price = num(m.price);
var priceNow = m.price_now === undefined || m.price_now === null ? price : num(m.price_now);
var until = str(m.discount_until) ? new Date(str(m.discount_until)) : null;
return {
id: str(m.id).toLowerCase(),
title: str(m.title).trim(),
description: str(m.description).trim(),
subjectLabel: str(m.subject_label).trim(),
stageLabel: str(m.stage_label).trim(),
price: price,
priceNow: priceNow,
discountPercent: int(m.discount_percent),
discountUntil: until && !isNaN(until.getTime()) ? until : null,
cover: httpsUrl(m.cover_url),
lessons: int(m.lessons),
kinds: normKinds(m.kinds),
publisherId: str(m.publisher_id).toLowerCase(),
publisherName: str(m.publisher_name).trim(),
publisherKind: normKind(m.publisher_kind),
publisherLogo: str(m.publisher_logo).trim(),
university: str(m.university).trim(),
faculty: str(m.faculty).trim(),
year: str(m.year).trim(),
subject: str(m.subject).trim(),
rating: m.rating === undefined || m.rating === null ? null : num(m.rating),
ratings: int(m.ratings),
students: m.students === undefined || m.students === null ? null : int(m.students),
outline: normOutline(m.outline),
};
}
function normApp(m) {
m = m || {};
return {
downloadUrl: liveDownload(m.download_url || m.downloadUrl),
versionName: str(m.version_name || m.versionName).trim(),
};
}
function publisherFromCourse(c) {
return {
id: c.publisherId,
name: c.publisherName,
kind: c.publisherKind,
about: '',
city: '',
logo: c.publisherLogo,
courses: null,
followers: null,
};
}
function fromSharePage(d, t) {
if (!d || d.found !== true) return { found: false, app: d && d.app ? normApp(d.app) : null };
var courses = (Array.isArray(d.courses) ? d.courses : [])
.map(normCourse)
.filter(function (c) { return c.id; });
if (t.kind === 'course') {
courses = courses.filter(function (c) { return c.id === t.id; });
if (!courses.length) return { found: false };
}
var pub = normPublisher(d.publisher);
if (!pub.id && courses.length) pub = publisherFromCourse(courses[0]);
if (!pub.id) return { found: false };
return { found: true, mode: 'rpc', publisher: pub, courses: courses, app: d.app ? normApp(d.app) : null };
}
function loadApp() {
return select('app_version', 'select=download_url,version_name&order=id.desc&limit=5', { retries: 1 })
.then(function (rows) {
var list = Array.isArray(rows) ? rows : [];
for (var i = 0; i < list.length; i++) {
var a = normApp(list[i]);
if (a.downloadUrl) return a;
}
return normApp({});
});
}
function loadFallback(t) {
var coursesP = rpcPost('store_browse_courses', { p_limit: 300 });
var pubsP = rpcPost('publishers_directory', { p_search: '' })
.then(null, function (e) {
if (e && e.kind === 'net') throw e;
return [];
});
var appP = loadApp().then(null, function () { return null; });
return Promise.all([coursesP, pubsP, appP]).then(function (r) {
var all = (Array.isArray(r[0]) ? r[0] : []).map(normCourse).filter(function (c) { return c.id; });
var pubs = Array.isArray(r[1]) ? r[1] : [];
var pid = t.kind === 'publisher' ? t.id : '';
var focus = null;
if (t.kind === 'course') {
for (var i = 0; i < all.length; i++) if (all[i].id === t.id) { focus = all[i]; break; }
if (!focus) return { found: false, app: r[2] };
pid = focus.publisherId;
}
var row = null;
for (var j = 0; j < pubs.length; j++) {
if (str(pubs[j] && pubs[j].id).toLowerCase() === pid) { row = pubs[j]; break; }
}
if (!row && t.kind === 'publisher') return { found: false, app: r[2] };
var mine = all.filter(function (c) { return c.publisherId === pid; });
var pub = row ? normPublisher(row) : publisherFromCourse(focus);
pub.courses = mine.length;
return {
found: true,
mode: 'fallback',
publisher: pub,
courses: t.kind === 'course' ? [focus] : mine,
app: r[2],
};
});
}
function fetchCourseRaw(id, onEarlyPage) {
var lessonsDone = false;
var lessonsP = rpcGet('store_course_lessons', { p_course_id: id }).then(function (v) {
lessonsDone = true;
return Array.isArray(v) ? { list: v, err: null } : { list: null, err: fail('bad', 'lessons-shape') };
}, function (e) {
lessonsDone = true;
return { list: null, err: e };
});
return rpcGet('share_public_page', { p_course: id }).then(function (page) {
if (!lessonsDone && typeof onEarlyPage === 'function') {
try { onEarlyPage(page); } catch (e) { logErr('early page', e); }
}
return lessonsP.then(function (L) {
return { page: page, lessons: L.list, lessonsErr: L.err };
});
}, function (e) {
if (e && (e.kind === 'missing' || e.kind === 'denied')) {
return loadFallback({ kind: 'course', id: id }).then(function (d) {
return lessonsP.then(function (L) {
return { fallback: d, lessons: L.list, lessonsErr: L.err };
});
});
}
throw e;
});
}
function fetchPublisherRaw(id) {
return rpcGet('share_public_page', { p_publisher: id }).then(function (page) {
return { page: page };
}, function (e) {
if (e && (e.kind === 'missing' || e.kind === 'denied')) {
return loadFallback({ kind: 'publisher', id: id }).then(function (d) {
return { fallback: d };
});
}
throw e;
});
}
function buildModel(kind, raw, id) {
raw = raw || {};
var d = raw.fallback || fromSharePage(Array.isArray(raw.page) ? raw.page[0] : raw.page, { kind: kind, id: id });
if (!d || !d.found) return { found: false, app: d ? d.app : null };
var m = { found: true, mode: d.mode, publisher: d.publisher, courses: d.courses, app: d.app || null };
if (kind === 'course') {
m.course = d.courses[0];
m.lessons = normLessons(raw.lessons);
m.lessonsErr = m.lessons ? null : (raw.lessonsErr || null);
}
return m;
}
function cacheKey(kind, id) {
return (kind === 'course' ? 'mec_c1_' : 'mec_p1_') + id;
}
function cacheRead(kind, id) {
var s = lsGet(cacheKey(kind, id));
if (!s) return null;
try {
var o = JSON.parse(s);
if (o && typeof o.at === 'number' && o.d && typeof o.d === 'object') return o;
} catch (e) {   }
lsDel(cacheKey(kind, id));
return null;
}
function cachePrune(max) {
try {
var ls = window.localStorage;
var items = [];
for (var i = 0; i < ls.length; i++) {
var k = ls.key(i);
if (!k || !CACHE_RE.test(k)) continue;
var at = 0;
try { at = num(JSON.parse(ls.getItem(k)).at); } catch (e) { at = 0; }
items.push({ k: k, at: at });
}
items.sort(function (a, b) { return a.at - b.at; });
while (items.length > max) ls.removeItem(items.shift().k);
} catch (e) {   }
}
function cacheWrite(kind, id, d) {
var key = cacheKey(kind, id);
var rec;
try {
rec = JSON.stringify({ at: Date.now(), d: d });
} catch (e) {
return;
}
lsSet(key, rec);
if (lsGet(key) !== rec) {
cachePrune(Math.floor(CACHE_MAX / 2));
lsSet(key, rec);
}
cachePrune(CACHE_MAX);
}
var store = { course: {}, publisher: {} };
function getEntry(kind, id) {
var map = store[kind];
if (map[id]) return map[id];
var ent = {
kind: kind,
id: id,
model: null,
raw: null,
json: '',
fresh: false,
busy: false,
err: null,
stale: false,
notFound: false,
pending: false,
force: false,
tracked: false,
};
map[id] = ent;
var cached = cacheRead(kind, id);
if (cached) {
var m = null;
try { m = buildModel(kind, cached.d, id); } catch (e) { m = null; }
if (m && m.found) {
ent.model = m;
ent.raw = cached.d;
ent.json = JSON.stringify(cached.d);
}
}
return ent;
}
function isShown(ent) {
return !!(R && R.kind === ent.kind && R.id === ent.id);
}
function refreshEntry(ent) {
if (ent.busy) return;
ent.busy = true;
if (isShown(ent)) updateStale(ent);
var p = ent.kind === 'course' ?
fetchCourseRaw(ent.id, function (page) { earlyCourse(ent, page); }) :
fetchPublisherRaw(ent.id);
p.then(function (raw) {
ent.busy = false;
ent.err = null;
var m = buildModel(ent.kind, raw, ent.id);
var appChanged = m.app ? setApp(m.app) : false;
if (!m.found) {
var was = !ent.notFound;
ent.model = null;
ent.raw = null;
ent.json = '';
ent.notFound = true;
ent.fresh = true;
ent.stale = false;
lsDel(cacheKey(ent.kind, ent.id));
changed(ent, was || ent.force || appChanged);
ent.force = false;
if (!m.app && !canOfferDownload()) refreshAppLink();
return;
}
var keep = !raw.fallback;
var d = keep ? (ent.kind === 'course' ? { page: raw.page, lessons: raw.lessons } : { page: raw.page }) : null;
var lessonsStale = false;
if (ent.kind === 'course' && m.lessons === null && ent.model && ent.model.lessons) {
m.lessons = ent.model.lessons;
m.lessonsErr = null;
lessonsStale = true;
if (d) d.lessons = ent.raw && ent.raw.lessons ? ent.raw.lessons : null;
}
var json = '';
try {
json = JSON.stringify(d || { f: raw.fallback, l: raw.lessons || null });
} catch (e) {
json = String(Date.now());
}
var dataChanged = !ent.model || ent.notFound || json !== ent.json;
var staleChanged = ent.stale !== lessonsStale;
if (ent.kind === 'course' && lessonsErrKey(ent.model) !== lessonsErrKey(m)) dataChanged = true;
ent.model = m;
ent.raw = d;
ent.json = json;
ent.notFound = false;
ent.fresh = true;
ent.stale = lessonsStale;
if (d) cacheWrite(ent.kind, ent.id, d);
if (m.mode === 'rpc' && !ent.tracked) {
ent.tracked = true;
trackVisit({ kind: ent.kind, id: ent.id });
}
var full = dataChanged || appChanged || ent.force;
ent.force = false;
if (full || staleChanged) changed(ent, full);
else if (isShown(ent)) updateStale(ent);
settleLesson(ent);
}, function (e) {
ent.busy = false;
ent.err = e;
if (e && e.kind !== 'net') logErr('load ' + ent.kind, e);
var full = !ent.model || ent.force;
ent.force = false;
if (ent.model) ent.stale = true;
changed(ent, full);
settleLesson(ent);
});
}
function lessonsErrKey(m) {
if (!m || m.lessons) return '';
if (m.lessonsPending) return 'pending';
return m.lessonsErr ? str(m.lessonsErr.kind) || 'err' : '';
}
function earlyCourse(ent, page) {
if (ent.model || !ent.busy) return;
var m = buildModel('course', { page: page, lessons: null }, ent.id);
if (!m.found) return;
m.lessonsErr = null;
m.lessonsPending = true;
if (m.app) setApp(m.app);
ent.model = m;
ent.raw = null;
ent.json = '';
changed(ent, true);
}
function settleLesson(ent) {
if (!viewer && isShown(ent) && R.kind === 'course' && R.lesson && !R.lessonDone &&
page.kind === 'course' && page.id === ent.id) {
handleLesson(ent, R);
}
}
function changed(ent, full) {
if (!isShown(ent)) return;
if (viewer || sheet) {
if (full) ent.pending = true;
else updateStale(ent);
return;
}
if (full) {
var y = pageY();
renderRoute();
if (ent.model && !viewer) window.scrollTo(0, y);
} else {
updateStale(ent);
}
}
function applyPending(focusLid) {
if (viewer || sheet || !R || (R.kind !== 'course' && R.kind !== 'publisher')) return;
var ent = store[R.kind][R.id];
if (!ent || !ent.pending) return;
ent.pending = false;
var y = pageY();
renderRoute();
if (viewer) return;
window.scrollTo(0, y);
if (focusLid) {
var card = root.querySelector('[data-lid="' + focusLid + '"]');
if (card) focusNoScroll(card);
}
}
function retryEntry(ent) {
ent.err = null;
ent.force = true;
refreshEntry(ent);
if (!ent.model) renderRoute();
}
function uuid4() {
var c = window.crypto || window.msCrypto;
var b = [];
var i;
if (c && c.getRandomValues) {
var arr = new Uint8Array(16);
c.getRandomValues(arr);
for (i = 0; i < 16; i++) b.push(arr[i]);
} else {
for (i = 0; i < 16; i++) b.push(Math.floor(Math.random() * 256));
}
b[6] = (b[6] & 15) | 64;
b[8] = (b[8] & 63) | 128;
var h = b.map(function (x) { return (x + 256).toString(16).slice(1); }).join('');
return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' +
h.slice(16, 20) + '-' + h.slice(20);
}
function visitorId() {
var v = lsGet(VID_KEY);
if (v && /^[A-Za-z0-9-]{8,64}$/.test(v)) return v;
v = uuid4();
lsSet(VID_KEY, v);
return lsGet(VID_KEY) === v ? v : '';
}
function trackVisit(t) {
if (!TRACK || !window.fetch) return;
var seenKey = 'mec_seen_' + t.kind.charAt(0) + '_' + t.id;
if (ssGet(seenKey)) return;
ssSet(seenKey, '1');
var body = {
p_kind: 'visit',
p_course: t.kind === 'course' ? t.id : null,
p_publisher: t.kind === 'publisher' ? t.id : null,
p_src: REF,
p_visitor: visitorId(),
};
try {
window.fetch(API + 'rpc/share_track', {
method: 'POST',
credentials: 'omit',
headers: authHeaders(true),
body: JSON.stringify(body),
}).then(null, function () {   });
} catch (e) {   }
}
var AVATAR_COLORS = ['#F97316', '#7C3AED', '#0EA5E9', '#10B981', '#EF4444', '#F59E0B',
'#EC4899', '#14B8A6', '#6366F1', '#84CC16', '#F43F5E', '#64748B'];
var AVATAR_STYLES = 4;
var KIND_COLORS = { university: '#7C3AED', school: '#3B82F6', individual: '#F97316', team: '#0F766E' };
var KIND_ICONS = { university: 'university', school: 'school', individual: 'person', team: 'people' };
var HONORIFICS = ['د', 'أ', 'م', 'ا', 'دكتور', 'دكتورة', 'الدكتور', 'الدكتورة',
'أستاذ', 'أستاذة', 'الأستاذ', 'الأستاذة', 'استاذ', 'الاستاذ',
'مهندس', 'مهندسة', 'المهندس', 'المهندسة'];
var ENTITY_WORDS = ['جامعة', 'مدرسة', 'ثانوية', 'معهد', 'كلية', 'أكاديمية', 'مركز'];
var MARKS_RE = /[̀-ًͯ-ٰٟ‍️]/;
function isIn(list, w) {
return list.indexOf(w) >= 0;
}
function wrapIdx(v, n) {
return ((v % n) + n) % n;
}
function stableHash(s) {
var h = 7;
for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 2147483648;
return h;
}
function firstGrapheme(s) {
var cs = chars(s);
if (!cs.length) return '';
var out = cs[0];
for (var i = 1; i < cs.length && MARKS_RE.test(cs[i]); i++) out += cs[i];
return out;
}
function initialsOf(name) {
var trimmed = str(name).trim();
if (!trimmed) return '';
var letters = [];
var afterEntity = false;
var words = trimmed.split(/[\s.]+/);
for (var i = 0; i < words.length; i++) {
var w = words[i].replace(/[،,()\[\]«»"]+/g, '').trim();
if (!w) continue;
var bare = w.indexOf('ال') === 0 && w.length > 3 ? w.slice(2) : w;
if (isIn(HONORIFICS, w) || isIn(HONORIFICS, bare) ||
isIn(ENTITY_WORDS, w) || isIn(ENTITY_WORDS, bare)) {
afterEntity = isIn(ENTITY_WORDS, w) || isIn(ENTITY_WORDS, bare);
continue;
}
if (letters.length || afterEntity) w = bare;
afterEntity = false;
letters.push(firstGrapheme(w).toUpperCase());
if (letters.length === 2) break;
}
if (!letters.length) return firstGrapheme(trimmed).toUpperCase();
return letters.join('');
}
function parseSpec(raw) {
var s = str(raw).trim();
if (s.indexOf('avatar:') !== 0) return null;
var style = 0;
var color = 0;
var text = '';
s.split(';').slice(1).forEach(function (part) {
var eq = part.indexOf('=');
if (eq <= 0) return;
var key = part.slice(0, eq).trim();
var val = part.slice(eq + 1).trim();
if (key === 'style') style = /^-?\d+$/.test(val) ? parseInt(val, 10) : 0;
else if (key === 'color') color = /^-?\d+$/.test(val) ? parseInt(val, 10) : 0;
else if (key === 'text') text = val;
});
return {
style: wrapIdx(style, AVATAR_STYLES),
color: wrapIdx(color, AVATAR_COLORS.length),
text: text,
};
}
function autoSpec(name) {
var h = stableHash(str(name).trim());
return {
style: wrapIdx(Math.floor(h / AVATAR_COLORS.length), AVATAR_STYLES),
color: wrapIdx(h, AVATAR_COLORS.length),
text: initialsOf(name),
};
}
function hexRgb(hex) {
var h = hex.replace('#', '');
return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function mix(hex, to, t) {
var a = hexRgb(hex);
return 'rgb(' + a.map(function (v, i) { return Math.round(v + (to[i] - v) * t); }).join(',') + ')';
}
function spaced(t) {
var cs = chars(t);
return cs.length === 2 && !/\s/.test(t) ? cs[0] + ' ' + cs[1] : t;
}
function sizeBox(node, size) {
node.style.width = size + 'px';
node.style.height = size + 'px';
}
function generatedAvatar(spec, size, name, kind) {
var c = AVATAR_COLORS[spec.color];
var text = str(spec.text).trim() || initialsOf(name);
var box = el('span', 'avatar');
sizeBox(box, size);
box.setAttribute('role', 'img');
box.setAttribute('aria-label', name || T.publisherFallback);
box.style.backgroundColor = c;
if (spec.style === 1) {
box.style.backgroundImage = 'linear-gradient(to bottom left, ' +
mix(c, [255, 255, 255], 0.18) + ', ' + mix(c, [0, 0, 0], 0.25) + ')';
} else if (spec.style === 3) {
box.style.borderRadius = Math.round(size * 0.3) + 'px';
box.style.backgroundImage = 'linear-gradient(to bottom right, ' + c + ' 0%, ' + c +
' 42%, rgba(255,255,255,0.2) 42%, rgba(255,255,255,0.2) 60%, ' + c + ' 60%, ' + c + ' 100%)';
} else if (spec.style === 2) {
var ring = el('span', 'avatar-ring');
ring.style.borderWidth = Math.max(1, Math.round(size * 0.05)) + 'px';
box.appendChild(ring);
}
if (text) {
var face = el('span', 'avatar-text', spaced(text));
var len = chars(text).length;
face.style.fontSize = Math.round(size * 0.42 * Math.min(1, 2.4 / Math.max(len, 1))) + 'px';
box.appendChild(face);
} else {
box.appendChild(icon(KIND_ICONS[kind] || 'person'));
}
return box;
}
function kindAvatar(kind, size) {
var box = el('span', 'avatar');
sizeBox(box, size);
var color = KIND_COLORS[kind] || KIND_COLORS.individual;
box.style.borderRadius = Math.round(size * 0.3) + 'px';
box.style.backgroundColor = mix(color, [255, 255, 255], 0.88);
box.style.color = color;
box.appendChild(icon(KIND_ICONS[kind] || 'person'));
return box;
}
function avatar(logo, name, kind, size) {
var spec = parseSpec(logo);
if (spec) return generatedAvatar(spec, size, name, kind);
var url = httpsUrl(logo);
var fallback = function () {
return str(name).trim() ? generatedAvatar(autoSpec(name), size, name, kind) : kindAvatar(kind, size);
};
if (!url) return fallback();
var box = el('span', 'avatar');
sizeBox(box, size);
box.style.borderRadius = Math.round(size * 0.3) + 'px';
var img = el('img');
img.alt = name || T.publisherFallback;
img.setAttribute('loading', 'lazy');
img.setAttribute('decoding', 'async');
img.setAttribute('referrerpolicy', 'no-referrer');
img.addEventListener('error', function () {
if (box.parentNode) box.parentNode.replaceChild(fallback(), box);
});
img.src = url;
box.appendChild(img);
return box;
}
var KIND_CHIP = { university: 'chip-violet', school: 'chip-blue', individual: '', team: 'chip-teal' };
function kindChip(kind) {
return el('span', 'chip ' + (KIND_CHIP[kind] || ''), T.kinds[kind] || T.kinds.individual);
}
function chip(text, cls, ic) {
var c = el('span', 'chip' + (cls ? ' ' + cls : ''));
if (ic) c.appendChild(icon(ic));
c.appendChild(document.createTextNode(text));
return c;
}
function kindChips(c) {
var out = [];
if (c.lessons > 0) out.push(chip(T.lessons(c.lessons), 'chip-grey', 'book'));
c.kinds.forEach(function (k) {
if (k === 'video') out.push(chip(T.kindVideo, '', 'video'));
else if (k === 'file') out.push(chip(T.kindFile, 'chip-blue', 'file'));
else if (k === 'quiz') out.push(chip(T.kindQuiz, 'chip-violet', 'quiz'));
});
return out.length ? add(el('div', 'chips'), out) : null;
}
function metaParts(c) {
var tree = [c.university, c.faculty, c.year, c.subject].filter(Boolean);
return tree.length ? tree : [c.subjectLabel, c.stageLabel].filter(Boolean);
}
function metaNode(tag, cls, parts) {
var n = el(tag, cls);
n.setAttribute('dir', 'rtl');
parts.forEach(function (t, i) {
if (i) n.appendChild(document.createTextNode(' · '));
n.appendChild(elAuto('bdi', '', t));
});
return n;
}
function cardCover(c, href) {
var node = el(href ? 'a' : 'div', 'cover');
if (href) {
node.href = href;
node.setAttribute('data-nav', '1');
node.setAttribute('tabindex', '-1');
node.setAttribute('aria-hidden', 'true');
}
node.style.backgroundColor = coverTone(c);
var mono = el('span', 'cover-mono', firstGrapheme(c.subject || c.subjectLabel || c.title || ''));
mono.setAttribute('aria-hidden', 'true');
node.appendChild(mono);
if (c.cover) {
var img = el('img');
img.alt = '';
img.setAttribute('loading', 'lazy');
img.setAttribute('decoding', 'async');
img.setAttribute('referrerpolicy', 'no-referrer');
img.addEventListener('error', function () { detach(img); });
img.src = c.cover;
node.appendChild(img);
}
return node;
}
function discounted(c) {
return c.price > 0 && c.priceNow > 0 && c.priceNow < c.price;
}
function priceEl(c, big) {
var w = el('div', 'price' + (big ? ' price-big' : ''));
if (c.price <= 0) {
w.appendChild(el('span', 'price-free', T.free));
return w;
}
var now = el('span', 'price-now', money(discounted(c) ? c.priceNow : c.price));
now.appendChild(document.createTextNode(' '));
now.appendChild(el('span', 'price-cur', T.currency));
w.appendChild(now);
if (discounted(c)) {
w.appendChild(el('s', 'price-old', money(c.price)));
var pct = c.discountPercent > 0 ? c.discountPercent
: Math.round((1 - c.priceNow / c.price) * 100);
w.appendChild(chip(T.discount(pct), 'chip-red'));
if (big && c.discountUntil) {
w.appendChild(el('span', 'price-until',
T.discountUntil(c.discountUntil.getDate(), T.months[c.discountUntil.getMonth()])));
}
}
return w;
}
function clampText(text, cls) {
var wrap = el('div');
var p = elAuto('p', cls + ' clamp', text);
var btn = el('button', 'more', T.readMore);
var expanded = false;
btn.type = 'button';
btn.hidden = true;
btn.setAttribute('aria-expanded', 'false');
btn.addEventListener('click', function () {
expanded = !expanded;
p.classList.toggle('clamp', !expanded);
btn.textContent = expanded ? T.readLess : T.readMore;
btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
updateCtaSpace();
});
add(wrap, p, btn);
var measure = function () {
if (expanded) return;
if (viewer && !p.offsetHeight) {
if (layoutQueue.indexOf(measure) < 0) afterLayout(measure);
return;
}
p.classList.add('clamp');
var over = p.scrollHeight > p.clientHeight + 2;
btn.hidden = !over;
if (!over) p.classList.remove('clamp');
};
afterLayout(measure);
return wrap;
}
var layoutQueue = [];
function afterLayout(fn) {
layoutQueue.push(fn);
}
function flushLayout() {
var q = layoutQueue;
layoutQueue = [];
var run = function () {
q.forEach(function (fn) {
try { fn(); } catch (e) {   }
});
updateCtaSpace();
};
setTimeout(run, 0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(run, function () {});
}
function openButton(t, label, cls) {
var b = el('button', 'btn ' + (cls || 'btn-primary'));
b.type = 'button';
add(b, icon('open'), el('span', '', label));
b.addEventListener('click', function () { openInApp(t); });
return b;
}
function publisherCard(pub) {
var card = el('section', 'card pub');
var top = el('div', 'pub-top');
var info = el('div', 'pub-info');
var name = elAuto('h1', 'pub-name', pub.name || T.publisherFallback);
var meta = el('div', 'pub-meta');
meta.appendChild(kindChip(pub.kind));
if (pub.city) add(meta, add(el('span', 'city'), icon('place'), elAuto('span', '', pub.city)));
var stats = [];
if (pub.courses !== null) stats.push(T.courses(pub.courses));
if (pub.followers !== null) stats.push(T.followers(pub.followers));
if (stats.length) meta.appendChild(el('span', '', stats.join(' · ')));
add(info, name, meta);
add(top, avatar(pub.logo, pub.name, pub.kind, 68), info);
card.appendChild(top);
if (pub.about) card.appendChild(clampText(pub.about, 'pub-about'));
return card;
}
function courseCard(c) {
var card = el('article', 'card course');
var href = localHref('course', c.id);
card.appendChild(cardCover(c, href));
var body = el('div', 'course-body');
var h = el('h3', 'course-title');
var a = elAuto('a', '', c.title || T.untitled);
a.href = href;
a.setAttribute('data-nav', '1');
h.appendChild(a);
body.appendChild(h);
var meta = metaParts(c);
if (meta.length) body.appendChild(metaNode('p', 'course-meta', meta));
add(body, kindChips(c));
var foot = el('div', 'course-foot');
add(foot, priceEl(c, false), openButton({ kind: 'course', id: c.id }, T.open, 'btn-sm btn-primary'));
body.appendChild(foot);
card.appendChild(body);
return card;
}
function allCoursesLink(pub) {
var a = el('a', 'card all-link');
a.href = localHref('publisher', pub.id);
a.setAttribute('data-nav', '1');
var av = avatar(pub.logo, pub.name, pub.kind, 36);
av.removeAttribute('role');
av.setAttribute('aria-hidden', 'true');
add(a, av, el('span', 'all-text', T.allCourses(pub.name || T.publisherFallback)), icon('chevron'));
return a;
}
var app = { downloadUrl: '', versionName: '' };
var ctaEl = null;
var notesEl = null;
var buttonsEl = null;
var notes = {};
function liveDownload(url) {
var u = httpsUrl(url);
if (!u || /mysyrianexams\.netlify\.app/i.test(u)) return '';
return u;
}
function downloadHref() {
if (IS_IOS) return httpsUrl(CFG.iosStoreUrl);
return liveDownload(app.downloadUrl) || liveDownload(CFG.appDownloadUrl);
}
function canOfferDownload() {
return !!downloadHref();
}
function setApp(a) {
if (!a) return false;
var before = downloadHref();
app = { downloadUrl: liveDownload(a.downloadUrl), versionName: str(a.versionName) };
if (app.downloadUrl) lsSet(APP_KEY, app.downloadUrl);
else lsDel(APP_KEY);
setupTopDownload();
var diff = before !== downloadHref();
if (diff) {
['notOpened', 'desktop'].forEach(function (k) {
var o = notes[k];
if (!o || !o.parentNode) return;
notes[k] = noteNode(k);
o.parentNode.replaceChild(notes[k], o);
});
}
return diff;
}
function wireDownload(a) {
a.href = downloadHref() || '#';
a.rel = 'noopener';
a.addEventListener('click', function (ev) {
var href = downloadHref();
if (!href) {
ev.preventDefault();
return;
}
if (a.getAttribute('href') !== href) a.href = href;
lsSet(DL_KEY, String(Date.now()));
if (IS_ANDROID) showNote('installHelp');
});
return a;
}
function downloadButton(label, cls) {
var a = el('a', 'btn ' + (cls || 'btn-outline'));
add(a, icon('download'), el('span', '', label || T.download));
return wireDownload(a);
}
function noteNode(key) {
var warn = key === 'notOpened' || key === 'inApp';
var n = el('div', 'note' + (warn ? ' note-warn' : ''));
n.setAttribute('data-note', key);
var ic = { iphone: 'phone', desktop: 'phone', installHelp: 'download' }[key] || 'info';
n.appendChild(icon(ic));
var dl = canOfferDownload();
var text = el('div', 'note-text', (!dl && T[key + 'NoDl']) || T[key] || '');
if (key === 'notOpened' && dl) {
text.appendChild(document.createTextNode(' '));
text.appendChild(wireDownload(el('a', 'link-btn', T.notOpenedDl)));
}
if (key === 'inApp') {
text.appendChild(document.createTextNode(' '));
var b = el('button', 'link-btn', T.copyLink);
b.type = 'button';
b.addEventListener('click', function () { copyLink(b, text); });
text.appendChild(b);
}
if (key === 'copyField') {
text.textContent = T.copyFailed;
text.appendChild(copyField(absolutePage(currentTarget() || { kind: 'course', id: '' }, '', 'stu')));
}
n.appendChild(text);
return n;
}
function showNote(key) {
if (!notesEl || notes[key]) return;
notes[key] = noteNode(key);
notesEl.appendChild(notes[key]);
refreshCta();
if (key === 'copyField') {
var f = notes[key].querySelector('.copy-field');
if (f) focusNoScroll(f);
}
}
function setupCta(primary, withDownload) {
ctaEl = document.getElementById('cta');
notesEl = document.getElementById('ctaNotes');
buttonsEl = document.getElementById('ctaButtons');
if (!ctaEl || !notesEl || !buttonsEl) return;
clear(buttonsEl);
if (primary) buttonsEl.appendChild(primary);
if (withDownload && canOfferDownload()) {
var dl = downloadButton(T.download, primary ? 'btn-outline' : 'btn-primary');
if (primary) {
var ic = dl.querySelector('.ic');
if (ic) dl.removeChild(ic);
}
buttonsEl.appendChild(dl);
}
var t = currentTarget();
if (IN_APP && t) showNote('inApp');
if (IS_DESKTOP) showNote('desktop');
if (CAME_BACK && t) showNote('notOpened');
refreshCta();
}
function refreshCta() {
if (!ctaEl) return;
ctaEl.hidden = !buttonsEl.firstChild && !notesEl.firstChild;
updateCtaSpace();
}
function updateCtaSpace() {
var h = !viewer && ctaEl && !ctaEl.hidden ? ctaEl.offsetHeight : 0;
document.body.style.paddingBottom = h ? (h + 16) + 'px' : '';
}
function setupTopDownload() {
var a = document.getElementById('topDownload');
if (!a) return;
if (!canOfferDownload()) {
a.hidden = true;
return;
}
if (!a.getAttribute('data-wired')) {
a.setAttribute('data-wired', '1');
wireDownload(a);
} else {
a.href = downloadHref();
}
a.hidden = false;
}
function copyField(url) {
var input = el('input', 'copy-field');
input.type = 'text';
input.readOnly = true;
input.value = url;
input.setAttribute('dir', 'ltr');
input.setAttribute('aria-label', T.copyLink);
input.addEventListener('focus', function () { input.select(); });
return input;
}
function copyText(text, cb) {
if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
navigator.clipboard.writeText(text).then(function () { cb(true); }, function () { cb(legacyCopy(text)); });
} else {
cb(legacyCopy(text));
}
}
function copyLink(btn, holder) {
var t = currentTarget();
var url = t ? absolutePage(t) : window.location.href;
copyText(url, function (ok) {
if (ok) {
btn.textContent = T.copied;
setTimeout(function () { btn.textContent = T.copyLink; }, 2500);
return;
}
if (holder.querySelector('.copy-field')) return;
holder.appendChild(el('span', '', ' ' + T.copyFailed));
var input = copyField(url);
holder.appendChild(input);
updateCtaSpace();
focusNoScroll(input);
});
}
function legacyCopy(text) {
var ta = el('textarea');
ta.value = text;
ta.setAttribute('readonly', '');
ta.style.position = 'fixed';
ta.style.top = '-1000px';
ta.style.opacity = '0';
document.body.appendChild(ta);
ta.select();
var ok = false;
try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
document.body.removeChild(ta);
return ok;
}
function shareCourse(c) {
var url = absolutePage({ kind: 'course', id: c.id }, '', 'stu');
var copy = function () {
copyText(url, function (ok) {
if (ok) toast(T.copied, 'ok');
else showNote('copyField');
});
};
if (navigator.share) {
try {
navigator.share({ title: c.title || T.untitled, url: url }).then(null, function (e) {
if (!e || e.name !== 'AbortError') copy();
});
return;
} catch (e) {   }
}
copy();
}
function ifStillHere(ms, cb) {
var left = false;
var mark = function () { if (document.hidden) left = true; };
var leave = function () { left = true; };
document.addEventListener('visibilitychange', mark);
window.addEventListener('pagehide', leave);
window.addEventListener('blur', leave);
setTimeout(function () {
document.removeEventListener('visibilitychange', mark);
window.removeEventListener('pagehide', leave);
window.removeEventListener('blur', leave);
if (!left && !document.hidden) cb();
}, ms);
}
function currentTarget() {
if (viewer) return { kind: 'course', id: viewer.courseId };
if (R && (R.kind === 'course' || R.kind === 'publisher')) return { kind: R.kind, id: R.id };
return null;
}
function openInApp(t) {
t = t || currentTarget();
var q = t ? deepQuery(t) : 'r=' + encodeURIComponent(REF || 'web');
if (IS_ANDROID) {
var back = t ? absolutePage(t, '&dl=1') : window.location.href;
window.location.href = 'intent://' + SCHEME_HOST + '?' + q + '#Intent;scheme=' + SCHEME +
';package=' + PKG + ';S.browser_fallback_url=' + encodeURIComponent(back) + ';end';
ifStillHere(1800, function () { showNote(IN_APP ? 'inApp' : 'notOpened'); });
} else if (IS_IOS) {
window.location.href = SCHEME + '://' + SCHEME_HOST + '?' + q;
ifStillHere(1500, function () {
showNote(httpsUrl(CFG.iosStoreUrl) ? 'notOpened' : 'iphone');
});
} else {
showNote('desktop');
}
}
var root = null;
var page = { kind: '', id: '', title: '', refs: {} };
var slowTimer = 0;
var views = {};
function viewState(id) {
return views[id] || (views[id] = { tab: '' });
}
function beginRender(kind, id) {
clearTimeout(slowTimer);
closeSheet(false);
clear(root);
layoutQueue = [];
root.className = 'page' + (kind === 'course' ? ' page-course' : '');
page = { kind: kind, id: id || '', title: '', refs: {} };
}
function setBusy(b) {
if (root) root.setAttribute('aria-busy', b ? 'true' : 'false');
}
function finish() {
setBusy(false);
flushLayout();
updateCtaSpace();
}
function routeTarget() {
return R && (R.kind === 'course' || R.kind === 'publisher') ? { kind: R.kind, id: R.id } : null;
}
function renderSkeleton(kind) {
beginRender('loading', '');
var sk = el('div', 'skeleton');
sk.setAttribute('aria-hidden', 'true');
if (kind === 'course') {
var c1 = el('div', 'card sk-card');
add(c1, add(el('div', 'sk-row'), el('span', 'sk sk-avatar'),
add(el('span', 'sk-col'), el('span', 'sk sk-line w60'), el('span', 'sk sk-line w40'))));
add(sk, el('span', 'sk sk-hero'), el('span', 'sk sk-line sk-title w80'), el('span', 'sk sk-line w50'),
c1, el('span', 'sk sk-tabs'), el('span', 'sk sk-lesson'), el('span', 'sk sk-lesson'));
} else {
var p1 = el('div', 'card sk-card');
add(p1,
add(el('div', 'sk-row'), el('span', 'sk sk-avatar'),
add(el('span', 'sk-col'), el('span', 'sk sk-line w60'), el('span', 'sk sk-line w40'))),
el('span', 'sk sk-line w90'), el('span', 'sk sk-line w70'));
var p2 = el('div', 'card sk-card');
add(p2, el('span', 'sk sk-cover'), el('span', 'sk sk-line w80'), el('span', 'sk sk-line w50'));
add(sk, p1, p2);
}
add(root, sk, el('p', 'sr-only', T.loading));
setBusy(true);
var t = routeTarget();
setupCta(t ? openButton(t, t.kind === 'course' ? T.openCourse : T.open, 'btn-primary') : null, true);
slowTimer = setTimeout(function () {
if (page.kind !== 'loading') return;
var hint = el('p', 'slow-hint', T.slow);
hint.setAttribute('role', 'status');
root.appendChild(hint);
}, SLOW_HINT_MS);
}
function renderError(err, what, retry) {
beginRender('error', '');
var card = el('section', 'card state-card');
card.appendChild(errorState(err, what, retry));
root.appendChild(card);
setBusy(false);
page.title = T.titleDefault;
document.title = page.title;
var t = routeTarget();
setupCta(t ? openButton(t, t.kind === 'course' ? T.openCourse : T.open, 'btn-primary') : null, true);
updateCtaSpace();
}
function stateCard(ic, title, text, action) {
var card = el('section', 'card state');
var box = el('div', 'state-icon');
box.appendChild(icon(ic));
add(card, box, el('h1', '', title), text ? el('p', '', text) : null, action);
return card;
}
function renderNotFound(pub) {
beginRender('notfound', '');
var action = canOfferDownload() ? downloadButton(T.downloadNotFound, 'btn-primary btn-block') : null;
root.appendChild(stateCard('info', T.notFoundTitle, pub ? T.notFoundPublisher : T.notFound, action));
setBusy(false);
page.title = T.titleDefault;
document.title = page.title;
setupCta(null, false);
}
function renderLanding() {
beginRender('landing', '');
var card = el('section', 'card landing');
var logo = el('img', 'landing-logo');
logo.src = 'assets/logo.png';
logo.alt = '';
logo.width = 108;
logo.height = 108;
var mark = el('p', 'landing-mark', (CFG.brand && CFG.brand.mark) || 'My Exams');
mark.setAttribute('dir', 'ltr');
var feats = el('ul', 'features');
[['file', T.feat1, 'ol-file'], ['quiz', T.feat2, 'ol-quiz'], ['school', T.feat3, 'ol-video']]
.forEach(function (f) {
var box = el('span', 'ol-icon ' + f[2]);
box.appendChild(icon(f[0]));
feats.appendChild(add(el('li'), box, el('span', '', f[1])));
});
var site = el('a', 'btn btn-soft btn-block', T.portal);
site.href = 'portal.html';
add(card, logo, mark, el('p', 'landing-tag', BRAND_TAG), el('h1', '', T.landing), feats,
site,
canOfferDownload() ? downloadButton(T.download, 'btn-primary btn-block') : null);
root.appendChild(card);
setBusy(false);
page.title = BRAND_AR + ' — My Exams';
document.title = page.title;
setupCta(null, false);
}
function cameBackBanner(t) {
var at = parseInt(lsGet(DL_KEY) || '', 10);
if (!at || Date.now() - at > DL_WINDOW_MS || IS_DESKTOP) return null;
var b = el('div', 'banner');
add(b, icon('check'), el('span', '',
t.kind === 'course' ? T.backFromDownloadCourse : T.backFromDownloadPublisher));
return b;
}
function noteBanner(text) {
var b = el('div', 'banner banner-warn');
b.setAttribute('role', 'status');
add(b, icon('info'), el('span', 'banner-text', text));
return b;
}
function updateStale(ent) {
var slot = page.refs && page.refs.stale;
if (!slot || page.kind !== ent.kind || page.id !== ent.id) return;
clear(slot);
if (!ent.stale) return;
var b = el('div', 'banner banner-warn');
b.setAttribute('role', 'status');
var btn = el('button', 'link-btn banner-btn', ent.busy ? T.refreshing : T.refresh);
btn.type = 'button';
btn.disabled = ent.busy;
btn.addEventListener('click', function () {
ent.force = true;
refreshEntry(ent);
});
add(b, icon('cloudOff'), el('span', 'banner-text', T.stale), btn);
slot.appendChild(b);
}
function renderPublisher(ent, r) {
var m = ent.model;
var pub = m.publisher;
var t = { kind: 'publisher', id: r.id };
beginRender('publisher', r.id);
page.refs.stale = el('div', 'slot');
add(root, page.refs.stale, cameBackBanner(t), publisherCard(pub));
var sec = el('h2', 'sec', T.hisCourses);
if (m.courses.length) sec.appendChild(el('span', 'count', T.courses(m.courses.length)));
root.appendChild(sec);
if (!m.courses.length) {
root.appendChild(el('div', 'card empty', T.emptyPublisher));
} else {
m.courses.forEach(function (c) { root.appendChild(courseCard(c)); });
}
updateStale(ent);
page.title = T.titlePublisher(pub.name || T.publisherFallback);
document.title = page.title;
setupCta(openButton(t, T.open, 'btn-primary'), true);
finish();
}
var COVER_TONES = ['#9A4A2B', '#55652B', '#3B5468', '#6A3A5A', '#1E6560',
'#9C6619', '#7A3A32', '#2E5946', '#474C78', '#7A5A38'];
function coverTone(c) {
var key = c.subject || c.subjectLabel || c.title || c.id || 'x';
return COVER_TONES[stableHash(key) % COVER_TONES.length];
}
function pad2(n) {
return n < 10 ? '0' + n : String(n);
}
function courseHero(c) {
var box = el('header', 'ch');
box.style.backgroundColor = coverTone(c);
var mono = el('span', 'ch-mono', firstGrapheme(c.subject || c.subjectLabel || c.title || ''));
mono.setAttribute('aria-hidden', 'true');
box.appendChild(mono);
if (c.cover) {
var img = el('img', 'ch-photo');
img.alt = '';
img.setAttribute('decoding', 'async');
img.setAttribute('referrerpolicy', 'no-referrer');
img.addEventListener('load', function () { box.className = 'ch has-photo'; });
img.addEventListener('error', function () {
detach(img);
box.className = 'ch';
});
img.src = c.cover;
box.appendChild(img);
}
box.appendChild(el('span', 'ch-scrim'));
var share = el('button', 'ch-share');
share.type = 'button';
share.setAttribute('aria-label', T.share);
share.setAttribute('title', T.share);
share.appendChild(icon('share'));
share.addEventListener('click', function () { shareCourse(c); });
box.appendChild(share);
var inner = el('div', 'ch-inner');
var tree = metaParts(c).filter(function (t) {
return t !== c.subject && (c.title || '').indexOf(t) < 0;
});
if (tree.length) inner.appendChild(metaNode('p', 'ch-eyebrow', tree));
inner.appendChild(elAuto('h1', 'ch-title', c.title || T.untitled));
box.appendChild(inner);
return box;
}
function pubLine(pub) {
var linked = !!pub.id;
var a = el(linked ? 'a' : 'div', 'cp');
if (linked) {
a.href = localHref('publisher', pub.id);
a.setAttribute('data-nav', '1');
}
var av = avatar(pub.logo, pub.name, pub.kind, 42);
av.removeAttribute('role');
av.setAttribute('aria-hidden', 'true');
var info = el('span', 'cp-info');
var name = el('span', 'cp-name');
add(name, elAuto('span', 'cp-text', pub.name || T.publisherFallback), icon('verified', 'cp-ok'));
var sub = [T.kinds[pub.kind] || T.kinds.individual];
if (pub.city) sub.push(pub.city);
if (pub.courses > 1) sub.push(T.courses(pub.courses));
if (pub.followers > 0) sub.push(T.followers(pub.followers));
add(info, el('span', 'cp-by', T.by), name, el('span', 'cp-sub', sub.join(' · ')));
add(a, av, info, linked ? icon('chevron', 'cp-chev') : null);
return a;
}
function factsRow(c, m) {
var list = m.lessons;
var count = list ? list.length : c.lessons;
var pages = 0;
var free = 0;
if (list) {
list.forEach(function (l) {
if (l.kind === 'file') pages += l.pages;
if (l.openable) free++;
});
}
var cells = [];
if (count > 0) cells.push([String(count), count === 1 ? T.factLesson : T.factLessons]);
if (pages > 0) cells.push([String(pages), T.factPages]);
if (c.price > 0 && free > 0) cells.push([String(free), T.factFree]);
if (c.rating !== null && c.rating > 0 && c.ratings > 0) {
cells.push([(Math.round(c.rating * 10) / 10).toFixed(1), T.factRating(c.ratings)]);
} else if (c.students > 0) {
cells.push([String(c.students), T.factStudents]);
}
if (!cells.length) return null;
var row = el('dl', 'facts');
cells.slice(0, 4).forEach(function (x) {
var cell = el('div', 'fact');
add(cell, el('dt', 'fact-l', x[1]), el('dd', 'fact-n', x[0]));
row.appendChild(cell);
});
return row;
}
function firstOpen(list) {
if (!list) return null;
for (var i = 0; i < list.length; i++) if (list[i].openable) return list[i];
return null;
}
function optRow(o) {
var node;
if (o.href) {
node = el('a', 'opt-row');
node.href = o.href;
if (o.nav) node.setAttribute('data-nav', '1');
} else {
node = el('button', 'opt-row');
node.type = 'button';
node.addEventListener('click', o.onClick);
}
if (o.main) node.className += ' is-main';
var ic = el('span', 'opt-ic');
ic.appendChild(icon(o.icon));
var body = el('span', 'opt-body');
add(body, el('span', 'opt-title', o.title), o.subNode || (o.sub ? el('span', 'opt-sub', o.sub) : null));
add(node, ic, body, icon('chevron', 'opt-chev'));
return node;
}
function optionsBox(c, m, t) {
var box = el('section', 'opt');
box.setAttribute('aria-label', T.options);
var head = el('div', 'opt-head');
add(head, el('span', 'opt-label', c.price > 0 ? T.fullPrice : T.allOpen), priceEl(c, true));
box.appendChild(head);
var list = el('div', 'opt-list');
var first = firstOpen(m.lessons);
if (first) {
list.appendChild(optRow({
href: lessonHref(c.id, first.id),
nav: true,
main: true,
icon: 'lockOpen',
title: c.price > 0 ? T.tryFree : T.startFirst,
subNode: add(el('span', 'opt-sub'), document.createTextNode('«'),
elAuto('bdi', '', first.title || T.lessonN(1)), document.createTextNode(T.tryFreeTail)),
}));
}
list.appendChild(optRow({
onClick: function () { openInApp(t); },
icon: 'open',
title: c.price > 0 ? T.buyCourse : T.openCourse,
sub: c.price > 0 ? T.buySub : T.openSub,
}));
list.appendChild(optRow({
onClick: function () { shareCourse(c); },
icon: 'share',
title: T.share,
sub: T.shareSub,
}));
box.appendChild(list);
return box;
}
function autoAbout(c, m) {
var subject = c.subject || c.subjectLabel;
var head = 'دورة';
if (subject && (c.title || '').indexOf(subject) < 0) head += ' ' + subject;
if (head === 'دورة' && m.publisher.name) head = 'دورة من ' + m.publisher.name;
var list = m.lessons || [];
var out;
if (list.length === 1) {
var one = list[0].kind === 'quiz' ? 'اختبار واحد' : list[0].kind === 'video' ? 'فيديو واحد' : 'ملف واحد';
out = head + '، فيها ' + one + '.';
} else {
out = head === 'دورة' ? T.noDesc : head + '.';
}
var free = 0;
list.forEach(function (l) { if (l.openable) free++; });
if (c.price <= 0) out += ' والدورة كلها مجانية.';
else if (free > 0) out += free === 1 ? ' وفيك تجرّب درسها المجاني قبل ما تشتري.' : ' وفيك تجرّب دروسها المجانية قبل ما تشتري.';
return out;
}
function aboutBlock(c, m) {
var sec = el('section', 'cab');
sec.appendChild(el('h2', 'sec-label', T.aboutCourse));
if (c.description) sec.appendChild(clampText(c.description, 'desc'));
else sec.appendChild(elAuto('p', 'desc', autoAbout(c, m)));
return sec;
}
function lessonIcon(kind) {
return kind === 'quiz' ? 'quiz' : kind === 'video' ? 'video' : 'pdf';
}
function lessonRow(l, idx, c, mode) {
var li = el('li', 'syl-item');
var node;
var open = mode === 'live' && l.openable;
var plain = mode !== 'live' && (l.free || c.price <= 0);
if (open) {
node = el('a', 'row is-open');
node.href = lessonHref(c.id, l.id);
node.setAttribute('data-nav', '1');
} else if (!plain) {
node = el('button', 'row is-locked');
node.type = 'button';
node.addEventListener('click', function () { openSheet(l, node); });
} else {
node = el('div', 'row is-plain');
}
if (l.id) node.setAttribute('data-lid', l.id);
node.setAttribute('data-kind', l.kind);
li.style.animationDelay = Math.min(idx, 10) * 40 + 'ms';
var locked = !open && !plain;
var num = el('span', 'row-n', pad2(idx + 1));
num.setAttribute('aria-hidden', 'true');
var meta = el('span', 'row-meta');
meta.appendChild(icon(lessonIcon(l.kind), 'row-ic'));
var extra = [T.type[l.kind]];
if (l.kind === 'file' && l.pages > 0) extra.push(l.pages + ' صفحة');
if (l.kind === 'quiz' && l.questions > 0) extra.push(l.questions + ' سؤال');
if (l.kind === 'quiz' && l.minutes > 0) extra.push(l.minutes + ' دقيقة');
meta.appendChild(el('span', '', extra.join(' · ')));
if (locked) meta.appendChild(el('span', 'sr-only', ' — ' + T.lockedSr));
var body = el('span', 'row-body');
add(body, elAuto('span', 'row-title', l.title || T.lessonN(l.n)), meta);
var end = el('span', 'row-end');
if (c.price > 0 && (open || (plain && l.free))) end.appendChild(el('span', 'row-free', T.free));
if (locked) end.appendChild(icon('lock', 'row-lock'));
else if (open) end.appendChild(icon('chevron', 'row-chev'));
add(node, num, body, end);
li.appendChild(node);
return li;
}
function syllabus(list, groups, vs, c, mode) {
var wrap = el('div', 'syl');
var kinds = KINDS.filter(function (k) { return groups[k].length > 0; });
var ol = el('ol', 'syl-list');
var items = list.map(function (l, i) {
var li = lessonRow(l, i, c, mode);
ol.appendChild(li);
return li;
});
var chipsBy = {};
var apply = function (k) {
var first = true;
items.forEach(function (li, i) {
var show = k === 'all' || list[i].kind === k;
li.hidden = !show;
li.className = 'syl-item' + (show && first ? ' is-first' : '');
if (show) first = false;
});
for (var key in chipsBy) {
if (hasOwn(chipsBy, key)) {
chipsBy[key].setAttribute('aria-pressed', key === k ? 'true' : 'false');
chipsBy[key].className = 'syl-chip' + (key === k ? ' is-on' : '');
}
}
};
if (kinds.length > 1) {
var bar = el('div', 'syl-filter');
bar.setAttribute('role', 'group');
bar.setAttribute('aria-label', T.tabsLabel);
['all'].concat(kinds).forEach(function (k) {
var b = el('button', 'syl-chip');
b.type = 'button';
add(b, el('span', '', k === 'all' ? T.all : T.tabs[k]),
el('span', 'syl-n', String(k === 'all' ? list.length : groups[k].length)));
b.addEventListener('click', function () {
vs.tab = k;
apply(k);
});
chipsBy[k] = b;
bar.appendChild(b);
});
wrap.appendChild(bar);
}
wrap.appendChild(ol);
var start = kinds.length > 1 && vs.tab && (vs.tab === 'all' || groups[vs.tab] && groups[vs.tab].length) ? vs.tab : 'all';
apply(start);
page.refs.selectTab = function (k) {
var cur = vs.tab || 'all';
if (cur === 'all' || cur === k) return;
vs.tab = 'all';
apply('all');
};
return wrap;
}
function lessonsSection(ent, m, vs) {
var c = m.course;
var sec = el('section', 'lessons');
sec.id = 'lessons';
sec.setAttribute('aria-labelledby', 'lessonsTitle');
var h = el('h2', 'sec-title');
h.id = 'lessonsTitle';
h.appendChild(el('span', '', T.courseContent));
sec.appendChild(h);
var list = m.lessons;
var mode = 'live';
if (!list && m.lessonsPending) {
var ld = loading(T.loading);
sec.appendChild(add(el('div', 'loading-inline'), ld));
setTimeout(function () {
if (document.body.contains(ld)) ld.setText(T.slow);
}, SLOW_HINT_MS);
return sec;
}
if (!list) {
var ol = (c.outline || []).filter(function (o) { return o.title; });
if (!ol.length) {
if (m.lessonsErr) {
sec.appendChild(add(el('div', 'card state-card'),
errorState(m.lessonsErr, T.whatLessons, function () { retryEntry(ent); })));
} else {
sec.appendChild(add(el('div', 'loading-inline'), loading(T.loading)));
}
return sec;
}
mode = 'outline';
list = ol.map(function (o) {
return { id: '', title: o.title, kind: o.kind, url: '', free: o.free, avail: true, openable: false,
pages: o.pages, minutes: 0, questions: 0, n: 0 };
});
var strip = el('div', 'info-strip is-warn');
add(strip, icon('info'), el('span', 'info-text', T.outlineNote));
if (m.lessonsErr && m.lessonsErr.kind === 'net') {
var rb = el('button', 'link-btn info-btn', T.retry);
rb.type = 'button';
rb.addEventListener('click', function () {
rb.disabled = true;
rb.textContent = T.refreshing;
retryEntry(ent);
});
strip.appendChild(rb);
}
sec.appendChild(strip);
}
if (!list.length) {
var empty = el('div', 'empty-state');
var ic = el('span', 'empty-ic');
ic.appendChild(icon('stories'));
add(empty, ic, el('h3', '', T.noLessons), el('p', '', T.noLessonsHint));
sec.appendChild(empty);
return sec;
}
h.appendChild(el('span', 'sec-count', T.lessons(list.length)));
var groups = { file: [], video: [], quiz: [] };
var openCount = 0;
list.forEach(function (l, i) {
groups[l.kind].push(l);
l.n = i + 1;
if (l.openable) openCount++;
});
if (mode === 'live' && openCount > 0 && c.price > 0) {
sec.appendChild(add(el('p', 'syl-note'), icon('lockOpen'),
el('span', '', T.freeStrip(openCount, openCount === list.length))));
}
sec.appendChild(syllabus(list, groups, vs, c, mode));
return sec;
}
function findLesson(list, id) {
if (!list) return null;
for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
return null;
}
function renderCourse(ent, r) {
var m = ent.model;
var c = m.course;
var pub = m.publisher;
var t = { kind: 'course', id: c.id };
var vs = viewState(c.id);
beginRender('course', c.id);
var refs = page.refs;
refs.stale = el('div', 'slot');
refs.note = el('div', 'slot');
if (r.lessonNote) refs.note.appendChild(noteBanner(T.lessonNotHere));
add(root,
courseHero(c),
refs.stale,
cameBackBanner(t),
refs.note,
pubLine(pub),
factsRow(c, m),
optionsBox(c, m, t),
aboutBlock(c, m),
lessonsSection(ent, m, vs),
pub.id ? allCoursesLink(pub) : null);
updateStale(ent);
page.title = T.titleCourse(c.title || T.untitled, pub.name);
document.title = page.title;
setupCta(openButton(t, T.openCourse, 'btn-primary'), true);
finish();
handleLesson(ent, r);
}
function lessonsSettled(ent) {
var m = ent.model;
if (ent.busy) return false;
if (!m) return true;
if (ent.stale) return false;
return !(m.lessons === null && m.lessonsErr && m.lessonsErr.kind === 'net');
}
function handleLesson(ent, r) {
if (!r.lesson || r.lessonDone || !ent.model) return;
var l = r.lesson !== 'bad' ? findLesson(ent.model.lessons, r.lesson) : null;
if (l && l.openable) {
r.lessonDone = true;
openViewer(ent, l, !!r.pushed);
return;
}
if (!lessonsSettled(ent)) return;
r.lessonDone = true;
r.lessonNote = true;
if (page.refs.note) {
clear(page.refs.note);
page.refs.note.appendChild(noteBanner(T.lessonNotHere));
}
}
var sheet = null;
function focusables(box) {
var all = box.querySelectorAll('a[href], button:not([disabled]), input, [tabindex="0"]');
var out = [];
for (var i = 0; i < all.length; i++) {
if (all[i].offsetWidth || all[i].offsetHeight) out.push(all[i]);
}
return out;
}
function openSheet(l, opener) {
closeSheet(false);
var back = el('div', 'sheet-backdrop');
var box = el('div', 'sheet');
box.setAttribute('role', 'dialog');
box.setAttribute('aria-modal', 'true');
box.setAttribute('aria-labelledby', 'sheetTitle');
box.setAttribute('aria-describedby', 'sheetText');
box.setAttribute('tabindex', '-1');
var grab = el('span', 'sheet-grab');
grab.setAttribute('aria-hidden', 'true');
var head = el('div', 'sheet-head');
var title = el('h2', 'sheet-title', T.lockedTitle);
title.id = 'sheetTitle';
add(head, icon('lock', 'sheet-lock'), title);
var text = el('p', 'sheet-text', l.avail === false ? T.unavailable : T.lockedText);
text.id = 'sheetText';
var btns = el('div', 'sheet-buttons');
var openB = openButton(currentTarget(), T.open, 'btn-primary btn-block');
openB.addEventListener('click', function () { closeSheet(false); });
var dl = canOfferDownload() ? downloadButton(T.download, 'btn-outline btn-block') : null;
if (dl) dl.addEventListener('click', function () { closeSheet(false); });
var cancel = el('button', 'sheet-cancel', T.back);
cancel.type = 'button';
cancel.addEventListener('click', function () { closeSheet(true); });
add(btns, openB, dl, cancel);
add(box, grab, head, elAuto('p', 'sheet-lesson', l.title || T.lessonN(l.n)), text, btns);
back.appendChild(box);
back.addEventListener('click', function (ev) {
if (ev.target === back) closeSheet(true);
});
var onKey = function (ev) {
var key = ev.key || '';
if (key === 'Escape' || key === 'Esc' || ev.keyCode === 27) {
ev.preventDefault();
closeSheet(true);
return;
}
if (key === 'Tab' || ev.keyCode === 9) {
var f = focusables(box);
if (!f.length) return;
var first = f[0];
var last = f[f.length - 1];
var a = document.activeElement;
if (ev.shiftKey && (a === first || a === box)) {
ev.preventDefault();
focusNoScroll(last);
} else if (!ev.shiftKey && a === last) {
ev.preventDefault();
focusNoScroll(first);
} else if (!box.contains(a)) {
ev.preventDefault();
focusNoScroll(first);
}
}
};
document.addEventListener('keydown', onKey, true);
document.body.appendChild(back);
document.body.classList.add('no-scroll');
sheet = { el: back, opener: opener, onKey: onKey };
focusNoScroll(openB);
}
function closeSheet(restoreFocus) {
if (!sheet) return;
var s = sheet;
sheet = null;
document.removeEventListener('keydown', s.onKey, true);
detach(s.el);
document.body.classList.remove('no-scroll');
if (restoreFocus && s.opener && document.body.contains(s.opener)) focusNoScroll(s.opener);
var lid = restoreFocus && s.opener ? s.opener.getAttribute('data-lid') : '';
setTimeout(function () { applyPending(lid); }, 0);
}
var viewer = null;
var viewerGen = 0;
function viewerShell(lesson, ctx) {
var wrap = el('div', 'vw');
var head = el('header', 'vw-head');
var titles = el('div', 'vw-titles');
add(titles, elAuto('h1', 'vw-title', lesson.displayTitle), elAuto('p', 'vw-sub', ctx.course.title));
add(head, backButton(ctx.back, 'frost'), titles);
var body = el('div', 'vw-body');
add(wrap, head, body);
return { root: wrap, body: body };
}
function queryParam(query, key) {
var parts = String(query || '').replace(/^\?/, '').split('&');
for (var i = 0; i < parts.length; i++) {
var eq = parts[i].indexOf('=');
if (eq < 0) continue;
try {
if (decodeURIComponent(parts[i].slice(0, eq)) === key) return decodeURIComponent(parts[i].slice(eq + 1));
} catch (e) {   }
}
return '';
}
function youtubeId(raw) {
var s = str(raw).trim();
if (!s) return '';
if (!/^[a-z]+:\/\//i.test(s) && /^(www\.|m\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(s)) {
s = 'https://' + s;
}
var mm = /^https?:\/\/([^\/?#]+)([^?#]*)(\?[^#]*)?/i.exec(s);
if (!mm) return '';
var host = mm[1].toLowerCase().replace(/:\d+$/, '').replace(/^(www|m|music)\./, '');
var parts = (mm[2] || '').split('/').filter(function (x) { return !!x; });
var id = '';
if (host === 'youtu.be') {
id = parts[0] || '';
} else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
if (parts[0] === 'watch') id = queryParam(mm[3], 'v');
else if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'v') id = parts[1] || '';
}
return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
}
function videoSource(url) {
var id = youtubeId(url);
if (id) return { type: 'yt', id: id };
var u = httpsUrl(url);
if (u && /^https:\/\/[^?#]+\.(mp4|m4v|webm|mov|3gp)(?:[?#].*)?$/i.test(u)) return { type: 'file', url: u };
return { type: 'app' };
}
function mountVideo(host, lesson, ctx) {
var shell = viewerShell(lesson, ctx);
host.appendChild(shell.root);
var body = shell.body;
var src = videoSource(lesson.url);
var frame = null;
var vid = null;
if (src.type === 'yt') {
var box = el('div', 'v-box');
var thumb = el('img', 'v-thumb');
thumb.alt = '';
thumb.setAttribute('decoding', 'async');
thumb.setAttribute('referrerpolicy', 'no-referrer');
thumb.addEventListener('error', function () { detach(thumb); });
thumb.src = 'https://i.ytimg.com/vi/' + src.id + '/mqdefault.jpg';
var play = el('button', 'v-play');
play.type = 'button';
play.setAttribute('aria-label', T.playVideo);
play.appendChild(icon('play'));
play.addEventListener('click', function () {
frame = document.createElement('iframe');
frame.className = 'v-frame';
frame.title = lesson.displayTitle;
frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
if (!('allow' in frame)) frame.setAttribute('allowfullscreen', '');
frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
frame.src = 'https://www.youtube-nocookie.com/embed/' + src.id +
'?autoplay=1&rel=0&modestbranding=1&playsinline=1';
clear(box);
box.appendChild(frame);
focusNoScroll(frame);
});
add(box, thumb, play);
var yt = el('a', 'btn btn-outline btn-block', '');
yt.href = 'https://www.youtube.com/watch?v=' + src.id;
yt.target = '_blank';
yt.rel = 'noopener noreferrer';
add(yt, icon('open'), el('span', '', T.openYoutube));
add(body, box, add(el('div', 'v-info'),
elAuto('h2', 'v-title', lesson.displayTitle),
el('p', 'v-note', T.videoOnYoutube)), add(el('div', 'v-actions'), yt));
} else if (src.type === 'file') {
var vbox = el('div', 'v-box');
vid = document.createElement('video');
vid.className = 'v-video';
vid.controls = true;
vid.setAttribute('playsinline', '');
vid.setAttribute('preload', 'none');
vid.setAttribute('controlslist', 'nodownload');
vid.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
vid.addEventListener('error', function () {
if (!vid || !vbox.parentNode) return;
var net = navigator.onLine === false || !!(vid.error && vid.error.code === 2);
var c = el('div', 'card state-card');
c.appendChild(errorState(fail(net ? 'net' : 'bad', 'video'), 'الفيديو', function () {
if (viewer) remount(viewer, 'video');
}));
vbox.parentNode.replaceChild(c, vbox);
});
vid.src = src.url;
vbox.appendChild(vid);
add(body, vbox, add(el('div', 'v-info'), elAuto('h2', 'v-title', lesson.displayTitle)));
} else {
var only = el('div', 'card v-only');
var ic = el('div', 'state-icon');
ic.appendChild(icon('video'));
add(only, ic, el('h2', 'v-title', T.videoAppOnly), el('p', 'v-note', T.videoAppOnlyHint),
openButton(currentTarget(), T.open, 'btn-primary btn-block'));
body.appendChild(only);
}
var more = add(el('div', 'v-more'),
openButton(currentTarget(), T.continueInApp, src.type === 'app' ? 'btn-soft btn-block' : 'btn-primary btn-block'),
canOfferDownload() ? downloadButton(T.download, 'btn-outline btn-block') : null);
if (src.type !== 'app') body.appendChild(more);
return {
destroy: function () {
if (frame) {
detach(frame);
frame = null;
}
if (vid) {
try {
vid.pause();
vid.removeAttribute('src');
vid.load();
} catch (e) {   }
vid = null;
}
},
};
}
function viewerError(v, k, e) {
clear(v.host);
var shell = viewerShell(v.lesson, v.ctx);
var card = el('div', 'card state-card');
card.appendChild(errorState(e, T.whatLesson, function () { remount(v, k); }));
shell.body.appendChild(card);
v.host.appendChild(shell.root);
}
function remount(v, k) {
if (viewer !== v) return;
if (k !== 'video') {
mountModule(v, k);
return;
}
clear(v.host);
try {
v.inst = mountVideo(v.host, v.lesson, v.ctx);
} catch (e) {
logErr('video', e);
viewerError(v, 'video', fail('bad', e && e.message));
}
}
function mountModule(v, k) {
if (viewer !== v) return;
clear(v.host);
var shell = viewerShell(v.lesson, v.ctx);
shell.body.appendChild(loading(T.preparing));
v.host.appendChild(shell.root);
var cssP = loadCss('viewer-' + k + '.css?v=' + encodeURIComponent(VERSION));
loadScript('viewer-' + k + '.js?v=' + encodeURIComponent(VERSION)).then(function () {
return cssP;
}).then(function () {
if (viewer !== v) return;
var mod = window.MEC_VIEWERS && window.MEC_VIEWERS[k];
if (!mod || typeof mod.mount !== 'function') throw fail('bad', 'viewer-' + k + '-missing');
clear(v.host);
v.inst = mod.mount(v.host, v.lesson, v.ctx) || null;
}).then(null, function (e) {
if (viewer !== v) return;
logErr('viewer ' + k, e);
if (v.inst && typeof v.inst.destroy === 'function') {
try { v.inst.destroy(); } catch (x) {   }
}
v.inst = null;
viewerError(v, k, e);
});
}
function openViewer(ent, l, pushed) {
closeSheet(false);
if (viewer) closeViewer();
var m = ent.model;
var c = m.course;
var lesson = {
id: l.id,
title: l.title,
displayTitle: l.title || T.lessonN(l.n || 1),
kind: l.kind,
url: l.url,
pages: l.pages,
minutes: l.minutes,
questions: l.questions,
n: l.n || 1,
};
var v = {
gen: ++viewerGen,
courseId: c.id,
lid: l.id,
pushed: !!pushed,
lesson: lesson,
inst: null,
host: null,
ctx: null,
backFn: null,
leaving: false,
histState: null,
};
if (HAS_PUSH) {
try { v.histState = window.history.state; } catch (e) { v.histState = null; }
}
v.ctx = {
course: { id: c.id, title: c.title || T.untitled, publisherName: m.publisher.name || '', price: c.price },
back: function () { viewerBack(v); },
ref: REF,
};
viewState(c.id).tab = l.kind;
var host = el('div', 'viewer viewer-' + l.kind + (l.kind === 'file' ? ' viewer-pdf' : ''));
host.setAttribute('tabindex', '-1');
v.host = host;
viewer = v;
document.body.classList.add('viewer-open');
var cta = document.getElementById('cta');
document.body.insertBefore(host, cta && cta.parentNode === document.body ? cta : null);
document.title = lesson.displayTitle + ' — ' + v.ctx.course.title;
updateCtaSpace();
window.scrollTo(0, 0);
remount(v, l.kind === 'video' ? 'video' : l.kind === 'quiz' ? 'quiz' : 'pdf');
focusNoScroll(host);
}
function closeViewer() {
var v = viewer;
if (!v) return null;
viewer = null;
if (v.inst && typeof v.inst.destroy === 'function') {
try { v.inst.destroy(); } catch (e) { logErr('destroy', e); }
}
v.inst = null;
detach(v.host);
document.body.classList.remove('viewer-open');
if (page.title) document.title = page.title;
updateCtaSpace();
flushLayout();
return v;
}
function viewerBack(v) {
if (viewer !== v) return;
v.leaving = true;
if (v.pushed && HAS_PUSH) {
window.history.back();
setTimeout(function () { if (viewer === v) leaveToCourse(v); }, 900);
return;
}
leaveToCourse(v);
}
function leaveToCourse(v) {
var href = localHref('course', v.courseId);
if (!HAS_PUSH) {
window.location.href = href;
return;
}
try {
window.history.replaceState({ mec: 1 }, '', href);
} catch (e) {   }
route(parseRoute(href), {});
}
function restoreToLesson(lid) {
var card = lid ? root.querySelector('[data-lid="' + lid + '"]') : null;
if (card && page.refs.selectTab) page.refs.selectTab(card.getAttribute('data-kind'));
var target = card || document.getElementById('lessons');
if (!target) return;
if (card) focusNoScroll(card);
var rect = target.getBoundingClientRect();
var vh = window.innerHeight || document.documentElement.clientHeight || 600;
var y = pageY() + rect.top - Math.max(72, (vh - rect.height) / 2);
window.scrollTo(0, Math.max(0, Math.round(y)));
}
var R = null;
var curSearch = null;
function renderRoute() {
var r = R;
if (!r || !root) return;
try {
if (r.kind === 'landing') {
renderLanding();
return;
}
if (r.kind === 'bad') {
renderNotFound(r.pub);
return;
}
var ent = getEntry(r.kind, r.id);
if (ent.model) {
if (r.kind === 'course') renderCourse(ent, r);
else renderPublisher(ent, r);
} else if (ent.notFound) {
renderNotFound(r.kind === 'publisher');
} else if (ent.err && !ent.busy) {
renderError(ent.err, r.kind === 'course' ? T.whatCourse : T.whatPublisher, function () { retryEntry(ent); });
} else {
renderSkeleton(r.kind);
}
} catch (e) {
logErr('render', e);
renderError(fail('bad', e && e.message), '', function () { window.location.reload(); });
}
}
function route(r, how) {
how = how || {};
closeSheet(false);
var prev = viewer ? closeViewer() : null;
R = r;
curSearch = window.location.search;
if (r.kind === 'course' || r.kind === 'publisher') {
var ent = getEntry(r.kind, r.id);
if (!ent.fresh && !ent.busy) refreshEntry(ent);
var showing = page.kind === r.kind && page.id === r.id && ent.model && !ent.pending;
if (showing) {
document.title = page.title;
updateStale(ent);
if (r.kind === 'course' && r.lesson) {
handleLesson(ent, r);
if (!viewer) afterNav(how);
} else if (prev && prev.courseId === r.id) {
restoreToLesson(prev.lid);
} else {
afterNav(how);
}
return;
}
ent.pending = false;
renderRoute();
if (!viewer && prev && r.kind === 'course' && prev.courseId === r.id && !r.lesson) restoreToLesson(prev.lid);
else if (!viewer) afterNav(how);
return;
}
renderRoute();
afterNav(how);
}
function afterNav(how) {
if (how.pop) {
window.scrollTo(0, typeof how.y === 'number' ? how.y : 0);
} else if (how.push) {
window.scrollTo(0, 0);
focusNoScroll(root);
}
}
function stateWith(extra) {
var out = {};
var old = window.history.state;
var k;
if (old && typeof old === 'object') {
for (k in old) if (hasOwn(old, k)) out[k] = old[k];
}
for (k in extra) if (hasOwn(extra, k)) out[k] = extra[k];
out.mec = 1;
return out;
}
function navigate(href) {
if (!HAS_PUSH) {
window.location.href = href;
return;
}
var r = parseRoute(href);
try {
window.history.replaceState(stateWith({ y: pageY() }), '');
} catch (e) {   }
var st = { mec: 1 };
if (r.kind === 'course' && r.lesson && R && R.kind === 'course' && R.id === r.id) st.lessonFrom = r.id;
try {
window.history.pushState(st, '', href);
} catch (e) {
window.location.href = href;
return;
}
r.pushed = !!st.lessonFrom;
route(r, { push: true });
}
function viewerDirty(v) {
if (!v || v.leaving || !v.inst || typeof v.inst.isDirty !== 'function') return false;
try {
return !!v.inst.isDirty();
} catch (e) {
return false;
}
}
function holdViewer(v) {
try {
window.history.pushState(v.histState || { mec: 1 }, '', curSearch || lessonHref(v.courseId, v.lid));
} catch (e) {
return false;
}
v.pushed = true;
var ask = v.backFn;
setTimeout(function () {
if (viewer !== v) return;
if (typeof ask === 'function') {
try {
ask();
return;
} catch (e) { logErr('viewer back', e); }
}
if (window.confirm(T.leaveConfirm)) viewerBack(v);
}, 0);
return true;
}
function onPopState(ev) {
var search = window.location.search;
if (search === curSearch) return;
if (viewer && viewerDirty(viewer) && holdViewer(viewer)) return;
var r = parseRoute(search);
var st = ev && ev.state ? ev.state : {};
r.pushed = r.kind === 'course' && !!r.lesson && st.lessonFrom === r.id;
route(r, { pop: true, y: typeof st.y === 'number' ? st.y : null });
}
function onDocClick(ev) {
if (ev.defaultPrevented || (ev.button !== undefined && ev.button !== 0) ||
ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
var a = ev.target;
while (a && a.nodeType === 1 && !(a.tagName === 'A' && a.getAttribute('data-nav'))) a = a.parentNode;
if (!a || a.nodeType !== 1) return;
if (a.target && a.target !== '_self') return;
var href = a.getAttribute('href') || '';
if (href.charAt(0) !== '?') return;
ev.preventDefault();
navigate(href);
}
function refreshAppLink() {
loadApp().then(function (a) {
if (setApp(a) && R && !viewer && (R.kind === 'landing' || R.kind === 'bad' ||
(store[R.kind] && store[R.kind][R.id] && store[R.kind][R.id].notFound))) renderRoute();
}, function () {   });
}
function onOnline() {
if (!R || (R.kind !== 'course' && R.kind !== 'publisher')) return;
var ent = store[R.kind][R.id];
if (!ent || ent.busy || !ent.model) return;
var m = ent.model;
if (ent.stale || (R.kind === 'course' && m.lessons === null && m.lessonsErr)) refreshEntry(ent);
}
function boot() {
root = document.getElementById('app');
if (!root) return;
if (!window.fetch || !window.Promise) {
clear(root);
root.appendChild(stateCard('info', T.notFoundTitle, T.oldBrowser, null));
setBusy(false);
return;
}
if (!KEY || !SUPA) {
renderError(fail('net', 'config'), '', function () { window.location.reload(); });
return;
}
root.setAttribute('tabindex', '-1');
app.downloadUrl = liveDownload(lsGet(APP_KEY));
setupTopDownload();
if (window.ResizeObserver) {
try {
new window.ResizeObserver(updateCtaSpace).observe(document.getElementById('cta'));
} catch (e) {   }
}
window.addEventListener('resize', updateCtaSpace);
window.addEventListener('online', onOnline);
document.addEventListener('click', onDocClick);
if (HAS_PUSH) {
try {
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
} catch (e) {   }
window.addEventListener('popstate', onPopState);
}
var r = parseRoute(window.location.search);
var st = HAS_PUSH ? window.history.state : null;
r.pushed = !!(r.kind === 'course' && r.lesson && st && st.lessonFrom === r.id);
route(r, {});
if (r.kind === 'landing' || r.kind === 'bad') refreshAppLink();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
