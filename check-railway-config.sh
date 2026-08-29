#!/bin/bash
# اختبار سريع للتأكد من أن كل الإعدادات صحيحة ✅

echo "🔍 فحص الملفات الضرورية..."
echo ""

# 1. التحقق من وجود الملفات الجديدة
echo "1️⃣ التحقق من الملفات الجديدة:"
files=("Procfile" ".railwayignore" "railway.json")

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file موجود"
  else
    echo "   ❌ $file مفقود"
  fi
done

echo ""
echo "2️⃣ التحقق من package.json:"

# التحقق من أن build script محدث
if grep -q '"build": "npm run prisma:generate"' package.json; then
  echo "   ✅ Build script محدث بشكل صحيح"
else
  echo "   ❌ Build script لم يتم تحديثه"
fi

echo ""
echo "3️⃣ التحقق من server.js:"

# التحقق من القيمة الافتراضية
if grep -q 'process.env.CORS_ORIGIN || '\''*'\''' server.js; then
  echo "   ✅ CORS_ORIGIN لديها قيمة افتراضية آمنة"
else
  echo "   ⚠️  تحقق من CORS_ORIGIN handling"
fi

echo ""
echo "4️⃣ التحقق من متغيرات البيئة المطلوبة:"

required_vars=("PORT" "NODE_ENV" "CORS_ORIGIN" "JWT_SECRET" "DATABASE_URL")

for var in "${required_vars[@]}"; do
  if grep -q "$var" .env 2>/dev/null; then
    echo "   ✅ $var موجود في .env"
  else
    echo "   ⚠️  $var لم يتم العثور عليه في .env"
  fi
done

echo ""
echo "5️⃣ فحص Git Status:"
git_status=$(git status --porcelain | wc -l)
if [ $git_status -eq 0 ]; then
  echo "   ✅ جميع التعديلات مرفوعة"
else
  echo "   ⚠️  هناك $git_status ملفات لم تُرفع بعد"
fi

echo ""
echo "✨ الفحص اكتمل!"
echo ""
echo "📝 الخطوات التالية:"
echo "  1. تحقق من Railway Dashboard → Deployments"
echo "  2. ابحث عن ✅ Build successful"
echo "  3. اختبر API: curl https://your-app.up.railway.app/api"
