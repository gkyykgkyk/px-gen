// ============================================
// 🚀 index.js - نقطة البداية
// ============================================

const fs = require("fs");
const path = require("path");
const { createPixAIAccount } = require("./pixai-bot");

// ملف حفظ بيانات الحسابات
const ACCOUNTS_FILE = path.join(__dirname, "accounts.json");

/**
 * تحميل الحسابات المحفوظة
 */
function loadAccounts() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
    }
  } catch (err) {
    console.warn("⚠️ فشل تحميل ملف الحسابات:", err.message);
  }
  return [];
}

/**
 * حفظ حساب جديد في الملف
 */
function saveAccount(account) {
  const accounts = loadAccounts();
  accounts.push(account);
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf-8");
  console.log(
    `💾 تم حفظ الحساب في accounts.json (إجمالي: ${accounts.length} حساب)`
  );
}

/**
 * إنشاء عدد معين من الحسابات
 */
async function main() {
  const count = parseInt(process.argv[2]) || 1;

  console.log("╔══════════════════════════════════════════╗");
  console.log(`║   🤖 PixAI Account Creator Bot           ║`);
  console.log(`║   📊 عدد الحسابات المطلوبة: ${count.toString().padEnd(13)}║`);
  console.log("╚══════════════════════════════════════════╝\n");

  let successCount = 0;
  let failCount = 0;

  for (let i = 1; i <= count; i++) {
    console.log(`\n📌 ========= الحساب ${i} من ${count} =========`);
    try {
      const account = await createPixAIAccount();
      saveAccount(account);
      successCount++;
    } catch (error) {
      console.error(
        `❌ فشل إنشاء الحساب رقم ${i}: ${error.message}`,
        error.cause ? `\n🔍 السبب الأساسي: ${error.cause.message || JSON.stringify(error.cause)}` : ""
      );
      failCount++;
    }

    // لو فيه حسابات تانية، استنى شوية بين كل حساب والتاني
    if (i < count) {
      const delay = 5000 + Math.random() * 5000; // 5-10 ثواني عشوائي
      console.log(
        `⏳ انتظار ${Math.round(delay / 1000)} ثواني قبل الحساب التالي...\n`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  console.log("\n╔══════════════════════════════════════════╗");
  console.log(`║   📊 النتائج النهائية                    ║`);
  console.log(`║   ✅ نجح: ${successCount.toString().padEnd(31)}║`);
  console.log(`║   ❌ فشل: ${failCount.toString().padEnd(31)}║`);
  console.log("╚══════════════════════════════════════════╝");

  // لو شغال داخل GitHub Actions، نكتب جدول بالحسابات في ملخص الصفحة
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      const accounts = loadAccounts();
      let summary = `## 🤖 PixAI Accounts Summary\n\n`;
      summary += `| # | Email | Password | Status | Created At |\n`;
      summary += `|---|-------|----------|--------|------------|\n`;
      accounts.forEach((acc, idx) => {
        summary += `| ${idx + 1} | \`${acc.email}\` | \`${acc.password}\` | ✅ Verified | ${acc.createdAt} |\n`;
      });
      summary += `\n**Total Verified Accounts:** ${accounts.length}\n`;
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, "utf-8");
    } catch (err) {
      console.warn("⚠️ فشل كتابة ملخص GitHub Actions:", err.message);
    }
  }
}

main().catch(console.error);

