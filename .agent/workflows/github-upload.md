---
description: تهيئة المشروع ورفعه على GitHub بنفس اسم المجلد
---

هذا الـ Workflow سيساعدك في رفع مشروعك `smart-acc-Elctron-Desktop-Only` إلى GitHub.

### الخطوات:

1. **تهيئة Git وعمل أول Commit**
// turbo
```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
```

2. **إنشاء المستودع على GitHub**
   - قم بالدخول إلى الرابط التالي: [https://github.com/new](https://github.com/new)
   - ضع اسم المستودع: `smart-acc-Elctron-Desktop-Only`
   - اضغط على **Create repository**.

3. **ربط المشروع ورفعه**
   *(بعد إنشاء المستودع، سيظهر لك رابط، قم بنسخه واستبدال `YOUR_REPO_URL` أدناه)*
```powershell
git remote add origin YOUR_REPO_URL
git push -u origin main
```

> **ملاحظة:** إذا كنت تريد أتمتة العملية بالكامل مستقبلاً، يمكننا تثبيت أداة `gh` (GitHub CLI). هل تود ذلك؟
