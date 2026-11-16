// ============================================
// 📧 temp-email.js - خدمة الإيميلات المؤقتة المتجددة
// ============================================

const config = require("./config");

// تخزين التوكنات لطلبات الاستقبال
const activeAccounts = new Map();

/**
 * دالة اتصال آمنة تعيد المحاولة تلقائياً
 */
async function safeFetch(url, options = {}, retries = 3, delayMs = 1500) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

/**
 * إنشاء إيميل جديد بدومينات متنوعة ومتجددة عبر tempmail.lol
 * كل طلب بيجيب دومين فرعي مختلف تماماً
 */
async function createRandomEmail() {
  const res = await safeFetch("https://api.tempmail.lol/v2/inbox/create", {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  if (!data.address || !data.token) {
    throw new Error(`فشل إنشاء إيميل: ${JSON.stringify(data)}`);
  }

  activeAccounts.set(data.address, {
    token: data.token,
  });

  console.log(`📧 تم إنشاء إيميل جديد بدومين مختلف: ${data.address}`);
  return data.address;
}

/**
 * انتظار وصول رسالة التحقق في الـ Inbox
 */
async function waitForEmail(email) {
  const account = activeAccounts.get(email);
  if (!account) {
    throw new Error(`بيانات الحساب غير موجودة لـ: ${email}`);
  }

  const startTime = Date.now();
  console.log(`⏳ في انتظار وصول رسالة لـ ${email}...`);

  while (Date.now() - startTime < config.WAIT_FOR_EMAIL_TIMEOUT) {
    try {
      const res = await safeFetch(
        `https://api.tempmail.lol/v2/inbox?token=${account.token}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.emails && data.emails.length > 0) {
          const msg = data.emails[0];
          console.log(`\n📩 وصلت رسالة من: ${msg.from} | الموضوع: ${msg.subject}`);
          return msg;
        }
      }
    } catch (e) {}

    await new Promise((resolve) => setTimeout(resolve, config.POLL_INTERVAL));
    process.stdout.write(".");
  }

  throw new Error("⏰ انتهى وقت الانتظار — الرسالة لم تصل!");
}

/**
 * استخراج كود التحقق من محتوى الرسالة
 */
async function getVerificationCode(email, msgOrId) {
  let fullContent = "";

  if (typeof msgOrId === "object" && msgOrId !== null) {
    fullContent =
      (msgOrId.subject || "") +
      "\n" +
      (msgOrId.html || "") +
      "\n" +
      (msgOrId.body || "");
  } else {
    const account = activeAccounts.get(email);
    if (account) {
      const res = await safeFetch(
        `https://api.tempmail.lol/v2/inbox?token=${account.token}`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
        }
      );
      const data = await res.json();
      if (data.emails && data.emails.length > 0) {
        fullContent =
          (data.emails[0].subject || "") +
          "\n" +
          (data.emails[0].html || "") +
          "\n" +
          (data.emails[0].body || "");
      }
    }
  }

  const codeMatch =
    fullContent.match(/verify-email\?code=(\d+)/) ||
    fullContent.match(/code[=:\s]+(\d{6})/i) ||
    fullContent.match(/\b(\d{6})\b/);

  if (!codeMatch) {
    console.log("📄 محتوى الرسالة بالكامل:", fullContent);
    throw new Error("لم يتم العثور على كود التحقق داخل الرسالة!");
  }

  const code = codeMatch[1];
  console.log(`🔑 كود التحقق: ${code}`);
  return code;
}

/**
 * تنظيف الحساب
 */
async function deleteEmail(email) {
  activeAccounts.delete(email);
}

module.exports = {
  createRandomEmail,
  waitForEmail,
  getVerificationCode,
  deleteEmail,
};
