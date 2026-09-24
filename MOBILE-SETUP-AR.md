# نشر DevAhmad بالكامل من هاتف أندرويد

لا تحتاج إلى كمبيوتر أو VS Code محلي أو بطاقة بنكية لنشر الموقع ضمن حدود الخدمات المجانية. تحتاج إلى حساب GitHub وحساب Cloudflare ومتصفح Chrome بوضع سطح المكتب. يمكن استخدام GitHub Codespaces من المتصفح إذا كانت حصة الحساب المجانية متاحة.

## 1. أنشئ المستودع
افتح github.com/new، سمِّ المستودع `devahmad-blog`، واجعله Public، وحدد Add README ثم Create repository.

## 2. افتح بيئة تطوير من الهاتف
من صفحة المستودع اختر Code ثم Codespaces ثم Create codespace on main. افتح المتصفح بوضع Desktop site عند الحاجة. إذا لم تتوفر Codespaces المجانية لحسابك، استخدم تطبيق Termux أو محرر ملفات مع Git يدعم رفع مجلدات المشروع.

## 3. ارفع المشروع
نزّل ملف devahmad-blog.zip من المحادثة إلى هاتفك. داخل Codespaces افتح Explorer، ثم ارفع ZIP إلى مجلد العمل (من قائمة Explorer أو بالسحب من مدير الملفات إن كان متاحًا). من Terminal نفّذ:

```sh
unzip -o devahmad-blog.zip
cp -a devahmad/. .
rm -rf devahmad devahmad-blog.zip
npm install
npm run lint
npm run build
```

إذا لم تنجح عملية رفع ZIP في متصفح الهاتف، فك ضغطه بتطبيق الملفات وارفع الملفات إلى Codespaces من مستعرض الملفات؛ حافظ على المجلدات والملفات المخفية مثل `.github`.

## 4. عدّل بياناتك
في `src/lib/site.ts` أضف البريد الإلكتروني وروابط حساباتك الصحيحة. غيّر `SITE_URL` في إعدادات Cloudflare إذا كان اسم مشروعك مختلفًا عن `devahmad`.

## 5. ارفع الكود إلى GitHub
```sh
git add .
git commit -m "Publish complete DevAhmad blog"
git push origin main
```

## 6. اربط Cloudflare Pages
من dash.cloudflare.com اختر Workers & Pages → Create → Pages → Connect to Git. اختر مستودع devahmad-blog والفرع main. إعدادات البناء: Build command = `npm run build`، Output directory = `dist`، ومتغير البيئة `SITE_URL` = رابط صفحاتك النهائي، مثال `https://devahmad.pages.dev`. قد تحتاج إلى اختيار اسم فرعي مختلف إذا كان محجوزًا. كل Push جديد سيؤدي إلى إعادة النشر تلقائيًا بعد نجاح البناء.

## 7. أضف مقالة من الهاتف
افتح المستودع في GitHub من المتصفح، انتقل إلى `src/content/blog`، اختر Add file → Create new file. سمّه `my-post.md`، وانسخ واجهة YAML من المقالات الحالية، ثم اكتب محتوى Markdown واضغط Commit changes. ستُبنى النسخة الجديدة تلقائيًا.

## تنبيهات
- المشروع لا يحتاج إلى قاعدة بيانات أو خدمات مدفوعة.
- الخطة المجانية لكل من GitHub Codespaces وCloudflare Pages لها حصص وحدود قابلة للتغيير؛ راجع لوحة حسابك قبل الاستخدام.
- لا تنشر بريدك أو حساباتك إلا بعد إدخال البيانات الحقيقية، ولا تضع رموز الوصول داخل ملفات المشروع.
- تأكد من نجاح `npm run build` في Codespaces أو GitHub Actions قبل اعتبار النشر مكتملًا.
