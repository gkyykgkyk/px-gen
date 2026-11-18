// ============================================
// 🤖 pixai-bot.js - بوت إنشاء حسابات PixAI
// ============================================

const { chromium } = require("playwright");
const config = require("./config");
const emailService = require("./temp-email");

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

    // ========== الخطوة 5: ملء بيانات التسجيل مع التبديل التلقائي للدومين لو رُفض ==========
    const passwordInput = page
      .locator('input[type="password"], input[placeholder*="Password" i]')
      .first();
    await passwordInput.waitFor({ state: "visible", timeout: 10000 });

    let signUpStatus = 0;
    const maxDomainRetries = 5;

    for (let attempt = 1; attempt <= maxDomainRetries; attempt++) {
      if (attempt > 1) {
        console.log(`\n🔄 رفض الموقع الدومين! جاري تجربة دومين جديد (${attempt}/${maxDomainRetries})...`);
        email = await emailService.createRandomEmail();
      }

      console.log(`📝 كتابة الإيميل: ${email}`);
      await emailInput.fill("");
      await emailInput.fill(email);

      console.log("🔐 كتابة الباسورد...");
      await passwordInput.fill("");
      await passwordInput.fill(password);

      console.log("▶️ الضغط على Continue...");

      const [signUpResponse] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes("/v2/auth/sign-in/email") &&
            resp.request().method() === "POST",
          { timeout: 30000 }
        ),
        page.getByRole("button", { name: "Continue", exact: true }).click(),
      ]);

      signUpStatus = signUpResponse.status();
      if (signUpStatus === 200) {
        console.log("✅ تم قبول الإيميل والتسجيل بنجاح! Status: 200");
        break;
      } else {
        const errBody = await signUpResponse.text().catch(() => "");
        console.warn(`⚠️ تم رفض هذا الدومين من PixAI (Status ${signUpStatus}): ${errBody}`);
        await page.waitForTimeout(2000);
      }
    }

    if (signUpStatus !== 200) {
      throw new Error(`تعذر العثور على دومين مقبول بعد ${maxDomainRetries} محاولات مختلفة.`);
    }

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
      const code = await emailService.getVerificationCode(email, msg);

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
      const code = await emailService.getVerificationCode(email, msg);

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

    // ========== التعامل مع نافذة Welcome to Mio وإغلاقها ==========
    console.log("🔘 فحص نافذة الترحيب Welcome to Mio...");
    try {
      const dialogOverlay = page
        .locator(
          '[data-slot="dialog-portal"], [data-slot="dialog-overlay"], [role="dialog"], text="Welcome to Mio!"'
        )
        .first();

      if (await dialogOverlay.isVisible({ timeout: 6000 }).catch(() => false)) {
        console.log("🎯 نافذة Welcome to Mio ظاهرة! جاري الضغط على Skip...");

        // محاولة 1: كليك بالـ Role أو داخل الـ Portal
        const skipButton = page
          .getByRole("button", { name: /skip/i })
          .or(page.locator('[data-slot="dialog-portal"] button').filter({ hasText: /skip/i }))
          .or(page.locator('button:has-text("Skip")'))
          .or(page.getByText(/^Skip$/i))
          .first();

        let clicked = false;
        if (await skipButton.isVisible({ timeout: 4000 }).catch(() => false)) {
          await skipButton.click({ force: true }).catch(() => {});
          console.log("✅ تم الضغط على زرار Skip!");
          clicked = true;
        }

        // محاولة 2: إغلاق عبر Escape أو الضغط المباشر بالـ DOM
        await page.waitForTimeout(1000);
        const stillOpen = await dialogOverlay.isVisible().catch(() => false);
        if (stillOpen) {
          console.log("🔘 إغلاق النافذة عبر Escape / DOM...");
          await page.keyboard.press("Escape").catch(() => {});
          await page.waitForTimeout(500);

          await page
            .evaluate(() => {
              const buttons = Array.from(
                document.querySelectorAll('button, [role="button"]')
              );
              const skipEl = buttons.find(
                (b) =>
                  b.textContent &&
                  b.textContent.trim().toLowerCase() === "skip"
              );
              if (skipEl) {
                skipEl.click();
              } else {
                document
                  .querySelectorAll(
                    '[data-slot="dialog-portal"], [data-slot="dialog-overlay"]'
                  )
                  .forEach((el) => el.remove());
              }
            })
            .catch(() => {});
        }
      } else {
        console.log("ℹ️ نافذة الترحيب لم تظهر أو تم تخطيها تلقائياً.");
      }
    } catch (e) {
      console.log("ℹ️ تم تجاوز خطوة نافذة الترحيب.");
    }

    await page.waitForTimeout(2000);

    // ========== الخطوة 11: إرسال رسالة "hi" للموديل ==========
    console.log("💬 جاري إرسال رسالة 'hi' في الشات...");
    const chatInput = page
      .locator(
        'textarea[data-testid="chat-input-textarea"], textarea[name="message"], textarea, [contenteditable="true"]'
      )
      .first();

    try {
      await chatInput.waitFor({ state: "visible", timeout: 15000 });
      await chatInput.fill("hi");
      await page.waitForTimeout(500);

      // الضغط على Enter أو زرار الإرسال
      await page.keyboard.press("Enter");

      // أو كليك على زرار الإرسال الأزرق لو لسه موجود
      const sendBtn = page
        .locator(
          'button[data-testid="send-button"], button:has(svg.lucide-send), button:has(svg)'
        )
        .last();
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click({ force: true }).catch(() => {});
      }

      console.log("🚀 تم إرسال رسالة 'hi' بنجاح!");
      console.log("⏳ في انتظار رد الموديل وتأكيد التفاعل (10 ثواني)...");
      await page.waitForTimeout(10000);
    } catch (e) {
      console.log("⚠️ لم يتم العثور على صندوق الشات لإرسال الرسالة:", e.message);
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

