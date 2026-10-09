# Goody Star Mobile App

## تطبيقات الأدوار

المشروع ينتج ثلاثة تطبيقات مستقلة من نفس الكود والـAPI:

| الدور | اسم التطبيق | Android package / iOS bundle |
|---|---|---|
| العميل | چودي ستار | `com.now.delivery` |
| البائع | چودي ستار بائع | `com.now.delivery.vendor` |
| المندوب | چودي ستار مندوب | `com.now.delivery.courier` |

لكل تطبيق تسجيل دخول وتنقل مخصصان لدوره. لوحة الإدارة مستقلة على الويب.

## التشغيل المحلي

افتراضيًا يعمل Expo بنسخة العميل. لاختيار نسخة أخرى:

```powershell
$env:EXPO_PUBLIC_APP_ROLE = "vendor" # أو delivery أو customer
npx expo start
```

```bash
cd mobile
npm install
npx expo start
```

## إنشاء نسخ التثبيت الداخلية

ملفات `customer` و`vendor` و`delivery` تنتج نسخ Android داخلية قابلة للتثبيت:

```bash
npx eas build --platform android --profile customer
npx eas build --platform android --profile vendor
npx eas build --platform android --profile delivery
```

لإنشاء نسخ المتاجر استخدم ملفات `customer-production` أو `vendor-production`
أو `delivery-production`.

### Android

```bash
npx eas build --platform android --profile customer
```

### iOS

```bash
npx eas build --platform ios --profile customer-production
```

### Web

```bash
npm run build:web
```

ينتج الأمر السابق مجلد `dist/` ثابتاً يحتوي على ملفات HTML وCSS وJavaScript
القابلة للنشر على Vercel أو Netlify أو أي استضافة للملفات الثابتة. لا تستخدم
`server.js` كنقطة دخول لتطبيق Expo؛ الخادم الموجود في جذر المشروع هو API
منفصل عن تطبيق الويب. عند إعداد Hostinger اختر `App.js` كنقطة الإدخال
واستخدم أمر البناء `npm run build:web` ومجلد الإخراج `dist`.

من جذر المشروع يمكن تنفيذ نفس البناء باستخدام:

```bash
npm run build:web
```

## ملاحظات مهمة

- تأكد أن الخادم الخلفي يعمل على `http://localhost:5000` أو أن IP الخاص بالجهاز/المحاكاة صحيح في ملف API.
- إذا كنت تبني التطبيق على Android Emulator، استخدم عنوان `10.0.2.2` بدلاً من `localhost`.
- تم تجهيز ملف `app.json` وملف `eas.json` لاستقبال البناء والتحميل على الأجهزة.
