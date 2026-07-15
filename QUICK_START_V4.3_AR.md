# تشغيل Orbit HR v4.3.0-ready بسرعة

## التشغيل على ويندوز

1. فك ضغط الملف.
2. افتح المجلد `artifacts/orbit-hr`.
3. شغّل `run.bat` أو نفّذ:

```bash
python server.py
```

4. افتح المتصفح على:

```text
http://127.0.0.1:8080
```

## التشغيل على Linux / macOS

```bash
cd artifacts/orbit-hr
python3 server.py
```

## الحسابات التجريبية الأولية

- Admin: `admin@hr.local` / `admin123`
- Manager: `manager@hr.local` / `manager123`
- Employee: `employee@hr.local` / `employee123`

سيطلب النظام تغيير كلمة المرور بعد أول دخول.

## تشغيل Production خلف دومين

اضبط المتغيرات التالية قبل التشغيل:

```bash
export ORBIT_HR_HOST=127.0.0.1
export ORBIT_HR_PORT=8080
export ORBIT_HR_ALLOWED_ORIGINS=https://your-domain.com
export ORBIT_HR_TIMEZONE=Africa/Cairo
export ORBIT_HR_BOOTSTRAP_ADMIN_PASSWORD='ضع-كلمة-قوية-هنا'
```

ثم استخدم Nginx أو Apache كـ Reverse Proxy مع HTTPS.

## ملاحظة مهمة

مجلد `server_data` يتم إنشاؤه تلقائيًا عند أول تشغيل ويحتوي قاعدة البيانات والمرفقات والنسخ الاحتياطية. لا ترفعه للعامة ولا تضعه داخل مجلد Static عام.
