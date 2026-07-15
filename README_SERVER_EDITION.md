# Orbit HR v4.0 Server Edition

هذه النسخة تحول Orbit HR من برنامج Local Storage فقط إلى نسخة بسيرفر محلي وقاعدة بيانات SQLite مركزية.

## التشغيل السريع

1. فك الضغط.
2. افتح مجلد `orbit_hr`.
3. شغل `run.bat` على Windows أو `./run.sh` على macOS/Linux.
4. افتح: `http://127.0.0.1:8080`.

يمكن تغيير البورت قبل التشغيل:

```bash
ORBIT_HR_PORT=8090 python server.py
```

## ما الذي تمت إضافته في v4.0؟

- Backend API داخل `server.py` باستخدام Python Standard Library فقط.
- قاعدة بيانات SQLite داخل `server_data/orbit_hr.sqlite3` يتم إنشاؤها تلقائيًا.
- مزامنة بيانات البرنامج مع السيرفر عبر `/api/state`.
- تسجيل دخول عبر السيرفر مع PBKDF2 password hashing وجلسات Token.
- جدول Audit Log مركزي.
- جدول Uploads لحفظ المرفقات على السيرفر.
- جدول Notifications جاهز للإشعارات.
- Backups تلقائية ويدوية من السيرفر.
- Restore API لاسترجاع نسخة احتياطية.
- Quality Check API لكشف التكرارات والمشاكل.
- مؤشر اتصال السيرفر داخل الواجهة.
- أدوات سيرفر داخل الإعدادات ← النظام والنسخ الاحتياطي.

## ملفات مهمة

- `server.py`: السيرفر، الـ API، قاعدة البيانات، النسخ الاحتياطية، الرفع، الفحص.
- `initial_state.json`: بيانات البداية لأول تشغيل.
- `server_data/`: يتم إنشاؤه تلقائيًا ويحتوي قاعدة البيانات والنسخ والمرفقات.
- `app.js`: الواجهة الأمامية مع مزامنة السيرفر.
- `manifest.json` و `sw.js`: تجهيز PWA.

## بيانات الدخول التجريبية عند أول تشغيل

- admin@hr.local / admin123
- manager@hr.local / manager123
- employee@hr.local / employee123

غيّر هذه البيانات فورًا من داخل النظام قبل أي استخدام فعلي.

## ملاحظات إنتاجية مهمة

للاستخدام الحقيقي على عدة أجهزة أو رفع التطبيق على المتاجر، يفضل تشغيل السيرفر خلف HTTPS Proxy مثل Nginx/Caddy، واستخدام PostgreSQL بدل SQLite عند زيادة عدد المستخدمين، وتفعيل نسخ احتياطي خارجي.

## تحويله لموبايل

- Android: استخدم TWA أو Capacitor بعد نشر الواجهة والسيرفر على HTTPS.
- iOS: استخدم Capacitor iOS مع الالتزام بخصوصية الكاميرا واللوكيشن وسياسات Apple.


## تحديث v4.1.0

تمت إضافة Production Backend APIs وجداول منظمة في SQLite. راجع:

- `README_PRODUCTION_BACKEND_V4.1_AR.md`
- `API_REFERENCE_V4.1_AR.md`
- `DEPLOYMENT_CHECKLIST_V4.1_AR.md`
- `TEST_REPORT_V4.1.md`
