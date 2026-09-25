# تجهيز لوحة الإدارة والتعليقات — DevAhmad

هذه حزمة تجهيز، وليست تفعيلًا نهائيًا. لا تضع Client Secret في GitHub أو داخل ملف ZIP.

## 1) Decap CMS
- واجهة الإدارة: https://devahmad-blog.pages.dev/admin/
- الملفات: public/admin/index.html وpublic/admin/config.yml.
- يلزم إعداد GitHub OAuth Proxy على Cloudflare Pages؛ ملف config.yml يستخدم /api/auth.
- يمكن استخدام قالب المجتمع https://github.com/i40west/netlify-cms-cloudflare-pages لإنشاء Functions لمساري /api/auth و/api/callback، بعد مراجعته أمنيًا؛ يجب مطابقة المسارات مع الإعداد.
- أنشئ GitHub OAuth App من https://github.com/settings/developers ؛ Homepage: https://devahmad-blog.pages.dev ؛ callback بحسب مسار البروكسي الذي تختاره.
- خزّن GITHUB_CLIENT_ID وGITHUB_CLIENT_SECRET في Cloudflare Pages > Settings > Variables and Secrets (Production)، لا في المستودع.
- تحقق من تسجيل الدخول ونشر مقال تجريبي قبل الاعتماد.

## 2) تعليقات الزوار
- سجّل في https://echothread.io/ وأنشئ موقعًا باسم devahmad-blog.pages.dev، وفعل guest comments وmanual moderation إذا أردت مراجعة كل تعليق.
- انسخ public embed API key (وليس أي secret key) وضعه في Cloudflare Pages كمتغير بناء PUBLIC_ECHOTHREAD_API_KEY.
- أعد النشر وتحقق من ظهور نموذج التعليقات تحت المقالات.
- تأكد من إعداد سياسة الخصوصية وفق معالجة بيانات الاسم والبريد لدى المزود.
- راجع خطة الخدمة المجانية وحدودها قبل الاعتماد؛ قد تتغير.

## 3) النشر من الهاتف
- ZIP جاهز للاستخدام عبر GitHub Actions بالطريقة السابقة. اسم الملف الجديد devahmad-cms-comments.zip.
- غيّر قيمة ZIP في publish-ar.yml إلى الاسم الجديد قبل تشغيله؛ لن تعمل خطوة GitHub Actions السابقة إذا ظل اسم الملف القديم.
- لا ترفع أي أسرار إلى المستودع.

## 4) فحص الأمان
- لا تمنح أي شخص صلاحية الكتابة إلى مستودع GitHub.
- يجب أن تكون أسرار OAuth في Cloudflare فقط، وأن تكون التعليقات خاضعة لمكافحة السبام والمراجعة.
