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
npx expo export --platform web --clear
```

## ملاحظات مهمة

- تأكد أن الخادم الخلفي يعمل على `http://localhost:5000` أو أن IP الخاص بالجهاز/المحاكاة صحيح في ملف API.
- إذا كنت تبني التطبيق على Android Emulator، استخدم عنوان `10.0.2.2` بدلاً من `localhost`.
- تم تجهيز ملف `app.json` وملف `eas.json` لاستقبال البناء والتحميل على الأجهزة.
