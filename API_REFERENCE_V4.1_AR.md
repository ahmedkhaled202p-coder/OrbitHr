# مرجع API — Orbit HR v4.1

كل الطلبات ما عدا `/api/health` و`/api/login` تحتاج Header:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

## Login

`POST /api/login`

```json
{"email":"admin@hr.local","password":"admin123"}
```

يرجع `token` وبيانات المستخدم والحالة المسموحة له حسب الصلاحيات.

## صلاحيات عامة

السيرفر يقبل الأدمن دائمًا. المدير له صلاحيات قراءة/كتابة إدارية أساسية. الصلاحيات التفصيلية يمكن إضافتها داخل حساب المستخدم مثل:

- `employees:read`, `employees:write`, `employees:delete`
- `attendance:read`, `attendance:write`, `attendance:delete`
- `payroll:read`, `payroll:write`, `payroll:approve`, `payroll:delete`
- `leaves:read`, `leaves:write`, `leaves:approve`, `leaves:delete`
- `missions:read`, `missions:write`, `missions:approve`, `missions:delete`
- `settings:write`
- `backup:read`, `backup:write`, `backup:restore`
- `audit:read`, `quality:read`

## أخطاء Validation المهمة

السيرفر يرفض:

- تكرار كود موظف.
- تكرار بريد موظف.
- تكرار حساب دخول.
- ربط نفس الموظف بأكثر من حساب.
- تكرار حضور لنفس الموظف في نفس اليوم.
- تكرار راتب لنفس الموظف في نفس الشهر.
- موظف نشط بدون وردية صحيحة.
- تواريخ عقد غير منطقية.
- راتب/تأمين/ضريبة بالسالب.

## دورة الرواتب من السيرفر

1. تجهيز الحضور والإجازات والمأموريات والخصومات والمكافآت.
2. استدعاء `POST /api/payroll/calculate`.
3. مراجعة السجلات الناتجة.
4. تغيير الحالة إلى `reviewed` ثم `approved` ثم `paid` ثم `locked`.
5. السجلات `paid` و`locked` محمية من الحذف.

## دورة الحضور من السيرفر

1. الموظف يرسل `POST /api/attendance/punch` مع GPS وصورة الكاميرا عند الحاجة.
2. السيرفر يحدد فرع الموظف من ملفه.
3. السيرفر يحسب المسافة من موقع الفرع.
4. السيرفر يحسب التأخير والخروج المبكر والإضافي حسب وردية اليوم.
5. إذا كان خارج النطاق، السياسة تكون: منع / مراجعة / سماح بتنبيه حسب الإعدادات.
