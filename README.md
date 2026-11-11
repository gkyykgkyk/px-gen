# 🤖 PixAI Account Creator Bot

بوت لإنشاء حسابات PixAI تلقائياً مع التحقق من الإيميل.

## 📁 هيكل المشروع

```
pix ai gen/
├── config.js           # ⚙️ الإعدادات (API key, باسورد, أوقات الانتظار)
├── gffkl-email.js      # 📧 وحدة التعامل مع الإيميلات المؤقتة
├── pixai-bot.js        # 🤖 بوت Playwright للتسجيل والتحقق
├── index.js            # 🚀 نقطة البداية
├── accounts.json       # 💾 الحسابات المحفوظة (يتعمل أوتوماتيك)
└── api/                # 📂 ملفات الـ API اللي سجلتها
```

## 🚀 التشغيل

### إنشاء حساب واحد:
```bash
node index.js
```

### إنشاء عدد معين من الحسابات:
```bash
node index.js 5
```

## ⚙️ الإعدادات

عدّل ملف `config.js` حسب احتياجك:

| الإعداد | الوصف |
|---------|-------|
| `GFFKL_API_KEY` | مفتاح API لخدمة الإيميلات |
| `DEFAULT_PASSWORD` | الباسورد الافتراضي للحسابات |
| `HEADLESS` | `false` = شوف المتصفح، `true` = في الخلفية |
| `SLOW_MO` | تأخير بين كل عملية (عشان يبان طبيعي) |

## 📊 الحسابات المحفوظة

بعد إنشاء كل حساب، بيتحفظ في `accounts.json`:
```json
[
  {
    "email": "pixai_abc123@gffkl.com",
    "password": "PixAI_Bot_2026!#Secure",
    "createdAt": "2026-11-11T00:00:00.000Z",
    "verified": true
  }
]
```

