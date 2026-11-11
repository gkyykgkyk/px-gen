// ============================================
// 📧 gffkl-email.js - وحدة التعامل مع الإيميلات المؤقتة
// ============================================

const config = require("./config");

const HEADERS = {
  "X-API-Key": config.GFFKL_API_KEY,
  "Content-Type": "application/json",
};

/**
 * إنشاء إيميل عشوائي جديد على gffkl.com
 * @returns {Promise<string>} الإيميل اللي اتعمل
 */
async function createRandomEmail() {
  const randomName =
    "pixai_" +
    Math.random().toString(36).substring(2, 10) +
    "_" +
    Date.now().toString(36);
  const email = `${randomName}@gffkl.com`;

  const response = await fetch(`${config.GFFKL_BASE_URL}/email/create`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(`فشل إنشاء الإيميل: ${JSON.stringify(data)}`);
  }

  console.log(`📧 تم إنشاء إيميل: ${email}`);
  return email;
}

/**
 * انتظار وصول رسالة جديدة في الـ inbox
 * @param {string} email - الإيميل المراد فحصه
 * @returns {Promise<object>} أول رسالة في الـ inbox
 */
async function waitForEmail(email) {
  const startTime = Date.now();
  console.log(`⏳ في انتظار وصول رسالة لـ ${email}...`);

  while (Date.now() - startTime < config.WAIT_FOR_EMAIL_TIMEOUT) {
    const response = await fetch(
      `${config.GFFKL_BASE_URL}/email/${email}/inbox`,
      { headers: HEADERS }
    );
    const data = await response.json();

    if (data.success && data.count > 0) {
      const msg = data.messages[0];
      console.log(`📩 وصلت رسالة من: ${msg.from} | الموضوع: ${msg.subject}`);
      return msg;
    }

    // استنى شوية وحاول تاني
    await new Promise((resolve) => setTimeout(resolve, config.POLL_INTERVAL));
    process.stdout.write(".");
  }

  throw new Error("⏰ انتهى وقت الانتظار — الرسالة ما وصلتش!");
}

/**
 * قراءة محتوى رسالة واستخراج كود التحقق
 * @param {string} email - الإيميل
 * @param {string} msgId - معرف الرسالة
 * @returns {Promise<string>} كود التحقق (6 أرقام)
 */
async function getVerificationCode(email, msgId) {
  const response = await fetch(
    `${config.GFFKL_BASE_URL}/email/${email}/inbox/${msgId}`,
    { headers: HEADERS }
  );
  const data = await response.json();

  if (!data.success) {
    throw new Error(`فشل قراءة الرسالة: ${JSON.stringify(data)}`);
  }

  // استخراج الكود من رابط التحقق
  const htmlBody = data.message.htmlBody || data.message.textBody || "";

  // البحث عن الرابط: verify-email?code=XXXXXX أو أي كود مكون من 6 أرقام
  const codeMatch =
    htmlBody.match(/verify-email\?code=(\d+)/) ||
    htmlBody.match(/code[=:\s]+(\d{6})/i) ||
    htmlBody.match(/\b(\d{6})\b/);

  if (!codeMatch) {
    console.log("📄 محتوى الرسالة:", htmlBody);
    throw new Error("مش لاقي كود التحقق في الرسالة!");
  }

  const code = codeMatch[1];
  console.log(`🔑 كود التحقق: ${code}`);
  return code;
}

/**
 * حذف الإيميل بعد الانتهاء (تنظيف)
 * @param {string} email - الإيميل المراد حذفه
 */
async function deleteEmail(email) {
  try {
    await fetch(`${config.GFFKL_BASE_URL}/email/${email}`, {
      method: "DELETE",
      headers: HEADERS,
    });
    console.log(`🗑️ تم حذف الإيميل: ${email}`);
  } catch (err) {
    console.warn(`⚠️ فشل حذف الإيميل: ${err.message}`);
  }
}

module.exports = {
  createRandomEmail,
  waitForEmail,
  getVerificationCode,
  deleteEmail,
};

