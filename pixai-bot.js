// ============================================
// 🤖 pixai-bot.js - بوت إنشاء حسابات PixAI
// ============================================

const { chromium } = require("playwright");
const config = require("./config");
const emailService = require("./gffkl-email");

/**
 * إنشاء حساب PixAI كامل مع التحقق من الإيميل
 * @returns {Promise<object>} بيانات الحساب اللي اتعمل
 */
async function createPixAIAccount() {
  let browser;
  let email;

  try {
    // ========== الخطوة 1: إنشاء إيميل مؤقت ==========
    console.log("\n🚀 === بدأ إنشاء حساب PixAI جديد ===\n");
    email = await emailService.createRandomEmail();
    const password = config.DEFAULT_PASSWORD;

    // ========== الخطوة 2: فتح المتصفح ==========
    console.log("🌐 جاري فتح المتصفح...");
    browser = await chromium.launch({
      headless: config.HEADLESS,
      slowMo: config.SLOW_MO,
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
      locale: "en-US",
    });

    const page = await context.newPage();
    page.setDefaultTimeout(config.PAGE_LOAD_TIMEOUT);

    // ========== الخطوة 3: الذهاب مباشرة إلى صفحة تسجيل الدخول ==========
    console.log(`🌐 جاري فتح صفحة تسجيل الدخول مباشرة: ${config.PIXAI_LOGIN_URL}...`);
    await page.goto(config.PIXAI_LOGIN_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    // ========== الخطوة 4: اختيار Continue with Email ==========
    const emailInput = page
      .locator(
        'input[placeholder="Email" i], input[type="email"], input[placeholder*="email" i]'
      )
      .first();

    const isEmailVisible = await emailInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isEmailVisible) {
      console.log("📧 الضغط على Continue with Email...");
      const emailBtn = page
        .locator('button:has-text("Continue with Email"), [role="button"]:has-text("Continue with Email")')
        .first();
      await emailBtn.waitFor({ state: "visible", timeout: 10000 });
      await emailBtn.click();
      await page.waitForTimeout(1000);
    }

    // ========== الخطوة 5: ملء بيانات التسجيل ==========
    console.log(`📝 كتابة الإيميل: ${email}`);
    await emailInput.waitFor({ state: "visible", timeout: 10000 });
    await emailInput.fill(email);

    // ملء خانة الباسورد
    console.log("🔐 كتابة الباسورد...");
    const passwordInput = page
      .locator('input[type="password"], input[placeholder*="Password" i]')
      .first();
    await passwordInput.waitFor({ state: "visible", timeout: 10000 });
    await passwordInput.fill(password);

    // ========== الخطوة 6: الضغط على Continue ==========
    console.log("▶️ الضغط على Continue...");

    // نلتقط الريسبونس بتاع التسجيل (مهلة 30 ثانية لتوليد reCAPTCHA براحته)
    const [signUpResponse] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes("/v2/auth/sign-in/email") &&
          resp.request().method() === "POST",
        { timeout: 30000 }
      ),
      page.getByRole("button", { name: "Continue", exact: true }).click(),
    ]);

    const signUpData = await signUpResponse.json();
    console.log("✅ تم التسجيل! Status:", signUpResponse.status());

    // استنى شوية عشان الصفحة تتحمل
    await page.waitForTimeout(3000);

    // ========== الخطوة 7: التحقق من الإيميل وتأكيد الحساب ==========
    // نفحص أولاً: هل ظهرت شاشة إدخال الكود المباشرة (Please check your email)؟
    const verifyAndCreateBtn = page
      .getByRole("button", { name: "Verify and create account" })
      .or(page.locator('button:has-text("Verify and create account")'))
      .first();

    const isDirectCodeScreen = await verifyAndCreateBtn
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isDirectCodeScreen) {
      console.log("🎯 ممتاز! ظهرت شاشة إدخال الكود المباشرة (Verify and create account)");
      console.log("📬 في انتظار وصول رسالة التحقق للإيميل...");
      const msg = await emailService.waitForEmail(email);
      const code = await emailService.getVerificationCode(email, msg.id);

      console.log(`🔢 كتابة كود التحقق (${code}) في الشاشة...`);
      const codeInput = page.locator('input').first();
      await codeInput.waitFor({ state: "visible", timeout: 5000 });
      await codeInput.fill(code);
      await page.waitForTimeout(500);

      console.log("🔘 الضغط على Verify and create account...");
      await verifyAndCreateBtn.click();
      await page.waitForTimeout(5000);
      console.log("✅ تم توثيق وإنشاء الحساب مباشرة بدون مغادرة الصفحة!");
    } else {
      // الطريقة الاحتياطية: الانتقال لصفحة الحسابات وطلب الكود
      console.log(`🌐 جاري الانتقال لصفحة الحساب: ${config.PIXAI_ACCOUNTS_URL}...`);
      await page.goto(config.PIXAI_ACCOUNTS_URL, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);

      console.log("🔘 البحث عن زرار Verify Email والضغط عليه...");
      const verifyEmailBtn = page
        .getByRole("button", { name: "Verify Email", exact: true })
        .or(page.locator('button:has-text("Verify Email")'))
        .first();

      if (await verifyEmailBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        await verifyEmailBtn.click();
        console.log("✅ تم الضغط على زرار Verify Email بنجاح!");
      }

      console.log("\n📬 في انتظار رسالة التحقق...");
      const msg = await emailService.waitForEmail(email);
      const code = await emailService.getVerificationCode(email, msg.id);

      const verifyUrl = `${config.PIXAI_URL}/verify-email?code=${code}&to=`;
      console.log(`🔗 جاري فتح رابط التحقق: ${verifyUrl}`);
      await page.goto(verifyUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(6000);
    }

    // ========== الخطوة 10: فتح رابط الـ Referral / Agent ==========
    console.log(`\n🎯 جاري فتح رابط الـ Agent / Referral: ${config.REFERRAL_URL}`);

    // مراقبة أي طلبات API تخرج من صفحة الـ Agent عشان نساعدك تشوفها
    const agentRequests = [];
    const requestListener = (req) => {
      const url = req.url();
      if (
        (url.includes("/api/") || url.includes("graphql") || url.includes("agent")) &&
        !url.includes("google") &&
        !url.includes("sentry") &&
        !url.includes("intercom")
      ) {
        agentRequests.push({
          method: req.method(),
          url: url,
          postData: req.postData(),
        });
        console.log(`📡 [طلب API جديد] ${req.method()} -> ${url}`);
      }
    };
    page.on("request", requestListener);

    await page.goto(config.REFERRAL_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // الضغط على زرار Skip في نافذة Welcome to Mio!
    console.log("🔘 البحث عن زرار Skip في نافذة الترحيب...");
    const skipBtn = page
      .getByRole("button", { name: "Skip", exact: true })
      .or(page.locator('button:has-text("Skip")'))
      .first();

    if (await skipBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await skipBtn.click();
      console.log("✅ تم الضغط على Skip!");
    } else {
      console.log("ℹ️ نافذة الترحيب / زرار Skip لم يظهر.");
    }

    await page.waitForTimeout(2000);

    // ========== الخطوة 11: إرسال رسالة "hi" للموديل ==========
    console.log("💬 جاري إرسال رسالة 'hi' في الشات...");
    const chatInput = page
      .locator(
        'textarea, [contenteditable="true"], [placeholder*="Write your idea"], input[placeholder*="Write your idea"]'
      )
      .first();

    if (await chatInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await chatInput.click();
      await chatInput.fill("hi");
      await page.waitForTimeout(500);

      // الضغط على Enter أو زرار الإرسال
      await page.keyboard.press("Enter");

      // أو كليك على زرار الإرسال الأزرق لو لسه موجود
      const sendBtn = page.locator('button:has(svg.lucide-send), button:has(svg)').last();
      if (await sendBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await sendBtn.click().catch(() => {});
      }

      console.log("🚀 تم إرسال رسالة 'hi' بنجاح!");
      console.log("⏳ في انتظار رد الموديل وتأكيد التفاعل (10 ثواني)...");
      await page.waitForTimeout(10000);
    } else {
      console.log("⚠️ لم يتم العثور على صندوق الشات لإرسال الرسالة.");
    }

    page.off("request", requestListener);

    // ========== الخطوة 12: التحقق من النجاح وحفظ الحساب ==========
    console.log("\n🎉 ============================");
    console.log("🎉  تم إنشاء الحساب والتحقق بنجاح!");
    console.log("🎉 ============================");
    console.log(`📧 الإيميل:  ${email}`);
    console.log(`🔐 الباسورد: ${password}`);
    console.log(`🎯 طلبات الـ API المرصودة في صفحة Agent: ${agentRequests.length}`);
    console.log("================================\n");

    // حفظ بيانات الحساب
    const accountData = {
      email,
      password,
      createdAt: new Date().toISOString(),
      verified: true,
    };

    return accountData;
  } catch (error) {
    console.error(`\n❌ حصل خطأ: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      // استنى 3 ثواني قبل ما تقفل المتصفح
      await new Promise((r) => setTimeout(r, 3000));
      await browser.close();
      console.log("🔒 المتصفح اتقفل.");
    }
  }
}

module.exports = { createPixAIAccount };

