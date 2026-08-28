# NOW Delivery Mobile App

## إعدادات التطبيق الأساسية

- اسم التطبيق: NOW Delivery
- slug: now-delivery
- package Android: com.now.delivery
- bundle iOS: com.now.delivery
- الاتجاه: portrait
- النمط: automatic
- الأيقونة: `./assets/images/icon.png`
- شاشة البداية: `./assets/images/splash-icon.png`

## التشغيل المحلي

```bash
cd mobile
npm install
npx expo start
```

## إنشاء نسخة البناء

### Android

```bash
npx eas build --platform android
```

### iOS

```bash
npx eas build --platform ios
```

### Web

```bash
npm run build:web
```

ينتج الأمر السابق مجلد `dist/` ثابتاً يحتوي على ملفات HTML وCSS وJavaScript
القابلة للنشر على Vercel أو Netlify أو أي استضافة للملفات الثابتة. لا تستخدم
`server.js` كنقطة دخول لتطبيق Expo؛ الخادم الموجود في جذر المشروع هو API
منفصل عن تطبيق الويب.

من جذر المشروع يمكن تنفيذ نفس البناء باستخدام:

```bash
npm run build:web
```

## ملاحظات مهمة

- تأكد أن الخادم الخلفي يعمل على `http://localhost:5000` أو أن IP الخاص بالجهاز/المحاكاة صحيح في ملف API.
- إذا كنت تبني التطبيق على Android Emulator، استخدم عنوان `10.0.2.2` بدلاً من `localhost`.
- تم تجهيز ملف `app.json` وملف `eas.json` لاستقبال البناء والتحميل على الأجهزة.
