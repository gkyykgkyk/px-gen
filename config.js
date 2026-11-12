// ============================================
// ⚙️ إعدادات الاسكريبت - عدّل هنا بس
// ============================================

// قراءة المتغيرات من ملف .env تلقائياً
require("dotenv").config();

module.exports = {
  // 🔑 API Key لخدمة الإيميلات المؤقتة (gffkl.com)
  GFFKL_API_KEY:
    process.env.GFFKL_API_KEY || "v1_API_8f92a3c7b8d4e5f6g7h8j9k0l1m2n3o4p5q6",
  GFFKL_BASE_URL: process.env.GFFKL_BASE_URL || "https://gffkl.com/api",

  // 🌐 إعدادات PixAI
  PIXAI_URL: "https://pixai.art",
  PIXAI_LOGIN_URL: "https://pixai.art/login",
  PIXAI_ACCOUNTS_URL: "https://pixai.art/profile/edit/accounts",
  PIXAI_API_URL: "https://api.pixai.art",

  // رابط أو كود الإحالة (يقرأ من .env باسم REFERRAL_URL أو URL، ويقبل رابط أو كود فقط)
  REFERRAL_URL: (() => {
    const ref =
      process.env.REFERRAL_URL ||
      process.env.URL ||
      "https://agent.pixai.art/?referral=BFANYHAM";
    if (ref.startsWith("http://") || ref.startsWith("https://")) {
      return ref;
    }
    return `https://agent.pixai.art/?referral=${ref}`;
  })(),

  // 🔐 باسورد افتراضي للحسابات الجديدة
  DEFAULT_PASSWORD:
    process.env.DEFAULT_PASSWORD || "PixAI_Bot_2026!#Secure",

  // ⏱️ أوقات الانتظار (بالمللي ثانية)
  WAIT_FOR_EMAIL_TIMEOUT: 60000,    // أقصى وقت انتظار لوصول الإيميل (60 ثانية)
  POLL_INTERVAL: 3000,              // كل كم ثانية نتشيك على الإيميل (3 ثواني)
  PAGE_LOAD_TIMEOUT: 30000,         // أقصى وقت لتحميل الصفحة

  // 🖥️ إعدادات المتصفح
  // في GitHub Actions بيكون HEADLESS: true أوتوماتيك
  HEADLESS:
    process.env.HEADLESS !== undefined
      ? process.env.HEADLESS === "true"
      : Boolean(process.env.CI),
  SLOW_MO: process.env.CI ? 0 : 100,
};

