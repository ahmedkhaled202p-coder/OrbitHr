# Orbit HR v4.1 Production Backend

هذه النسخة تضيف طبقة Backend إنتاجية فوق واجهة Orbit HR الحالية، مع الحفاظ على توافق البيانات القديمة.

## الجديد في v4.1

- قاعدة بيانات SQLite منظمة بجداول منفصلة للموظفين، الحضور، الرواتب، الطلبات، مواقع الفروع، المرفقات، النسخ الاحتياطي، وسجل العمليات.
- API منفصل لكل دورة أساسية بدل الاعتماد فقط على حفظ حالة البرنامج كاملة.
- Validation من السيرفر يمنع البيانات المكررة والخاطئة قبل الحفظ.
- صلاحيات من السيرفر لكل API، مع صلاحيات المدير والأدمن.
- احتساب حضور وانصراف من السيرفر مع التأخير، الخروج المبكر، والوقت الإضافي.
- ربط الحضور بموقع الفرع وحساب المسافة من السيرفر.
- احتساب رواتب من السيرفر حسب الشهر، الحضور، الغياب، الإجازات، المأموريات، الإضافي، الخصومات، المكافآت، السلف، التأمين، والضريبة.
- حماية الرواتب المعتمدة/المصروفة/المغلقة من إعادة الاحتساب أو الحذف غير المصرح.
- endpoints جاهزة للموبايل Android/iOS.

## التشغيل المحلي

1. فك الضغط.
2. افتح مجلد `orbit_hr`.
3. شغل `run.bat` على ويندوز أو `./run.sh` على لينكس/ماك.
4. افتح `http://127.0.0.1:8080`.

## أهم APIs الجديدة

### الموظفون

- `GET /api/employees`
- `POST /api/employees`
- `GET /api/employees/{id}`
- `PUT /api/employees/{id}`
- `DELETE /api/employees/{id}`

### الحضور

- `GET /api/attendance?month=YYYY-MM`
- `POST /api/attendance`
- `PUT /api/attendance/{id}`
- `DELETE /api/attendance/{id}`
- `POST /api/attendance/punch`

مثال تسجيل حضور من الموبايل:

```json
{
  "employeeId": "e3",
  "type": "checkIn",
  "lat": 30.0444,
  "lng": 31.2357,
  "faceVerified": true,
  "cameraImage": "data:image/jpeg;base64,..."
}
```

### الرواتب

- `GET /api/payroll?month=YYYY-MM`
- `POST /api/payroll/calculate`
- `PUT /api/payroll/{id}/status`
- `DELETE /api/payroll/{id}`

مثال احتساب رواتب:

```json
{
  "month": "2026-07",
  "branch": "القاهرة",
  "employeeIds": ["e1", "e2"],
  "mode": "full_month"
}
```

### الإجازات والمأموريات

- `GET /api/leaves`
- `POST /api/leaves`
- `PUT /api/leaves/{id}/status`
- `DELETE /api/leaves/{id}`
- `GET /api/missions`
- `POST /api/missions`
- `PUT /api/missions/{id}/status`
- `DELETE /api/missions/{id}`

### مواقع الفروع

- `PUT /api/settings/branch-location`

```json
{
  "branch": "القاهرة",
  "lat": 30.0444,
  "lng": 31.2357,
  "radius": 300,
  "enabled": true
}
```

## قبل النشر الحقيقي

- تشغيل التطبيق خلف HTTPS Reverse Proxy مثل Nginx أو Caddy.
- تغيير كلمات المرور التجريبية.
- ضبط `ORBIT_HR_ALLOWED_ORIGINS` على الدومين الحقيقي.
- استخدام Backup يومي.
- يفضل الترقية لاحقًا إلى PostgreSQL لو عدد المستخدمين والفروع كبير.
- تجهيز Android/iOS من خلال Capacitor أو TWA بعد ربط دومين HTTPS.

## ملاحظة مهمة

الواجهة الحالية ما زالت تحتفظ بـ Local Storage ككاش مؤقت حتى لا تتعطل عند انقطاع الشبكة، لكن السيرفر أصبح يحتوي APIs منفصلة جاهزة لتطبيق موبايل حقيقي أو واجهة جديدة بالكامل.
