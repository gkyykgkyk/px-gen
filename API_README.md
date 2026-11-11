# GFFKL.com - Temporary Email API

هذا الملف يشرح كيفية استخدام الـ REST API الخاص بخدمة الإيميلات المؤقتة. الـ API معزول تماماً عن بوت التلجرام، ولا يتم إرسال إشعارات للإيميلات التي يتم إنشاؤها هنا إلى التلجرام.

## المصادقة (Authentication)
للاتصال بالـ API، يجب إرفاق `API Key` في جميع الطلبات (Requests) باستخدام الـ Header التالي:
```http
X-API-Key: v1_API_8f92a3c7b8d4e5f6g7h8j9k0l1m2n3o4p5q6
```
> **ملاحظة:** تأكد من إضافة هذا الـ API_KEY في إعدادات Cloudflare Workers تحت قسم Variables.

---

## روابط الـ API (Endpoints)

رابط السيرفر الأساسي: `https://your-worker.your-subdomain.workers.dev` أو `https://gffkl.com`

### 1. إنشاء إيميل جديد (Create Email)
يقوم بتسجيل إيميل مخصص لاستقبال الرسائل.

* **الرابط:** `/api/email/create`
* **الطريقة:** `POST`
* **البيانات (JSON):**
  ```json
  {
    "email": "myname@gffkl.com"
  }
  ```
* **الرد الناجح:**
  ```json
  {
    "success": true,
    "email": "myname@gffkl.com",
    "message": "Email created successfully."
  }
  ```

### 2. عرض جميع الإيميلات المسجلة (List Emails)
يعرض قائمة بكل الإيميلات التي تم إنشاؤها عبر الـ API.

* **الرابط:** `/api/emails`
* **الطريقة:** `GET`
* **الرد الناجح:**
  ```json
  {
    "success": true,
    "count": 1,
    "emails": [
      {
        "email": "myname@gffkl.com",
        "createdAt": 1700000000000
      }
    ]
  }
  ```

### 3. جلب الرسائل الواردة (Get Inbox)
يعرض قائمة الرسائل التي وصلت لإيميل معين.

* **الرابط:** `/api/email/{email}/inbox` (مثال: `/api/email/myname@gffkl.com/inbox`)
* **الطريقة:** `GET`
* **الرد الناجح:**
  ```json
  {
    "success": true,
    "email": "myname@gffkl.com",
    "count": 1,
    "messages": [
      {
        "id": "msg123xyz",
        "from": "sender@example.com",
        "to": "myname@gffkl.com",
        "subject": "Hello there",
        "date": "Mon, 05 Oct 2026 12:00:00 +0000",
        "receivedAt": 1700000000000
      }
    ]
  }
  ```

### 4. قراءة تفاصيل رسالة معينة (Read Message)
يجلب محتوى الرسالة بالكامل (HTML و Text).

* **الرابط:** `/api/email/{email}/inbox/{msgId}` (مثال: `/api/email/myname@gffkl.com/inbox/msg123xyz`)
* **الطريقة:** `GET`
* **الرد الناجح:**
  ```json
  {
    "success": true,
    "message": {
      "from": "sender@example.com",
      "to": "myname@gffkl.com",
      "subject": "Hello there",
      "date": "Mon, 05 Oct 2026 12:00:00 +0000",
      "htmlBody": "<html><body>...</body></html>",
      "textBody": "Hello there, this is a test.",
      "receivedAt": 1700000000000
    }
  }
  ```

### 5. حذف رسالة معينة (Delete Message)
يحذف رسالة محددة من الـ Inbox.

* **الرابط:** `/api/email/{email}/inbox/{msgId}`
* **الطريقة:** `DELETE`
* **الرد الناجح:**
  ```json
  {
    "success": true,
    "message": "Message msg123xyz deleted."
  }
  ```

### 6. مسح كل رسائل الـ Inbox (Clear Inbox)
يمسح جميع الرسائل الواردة لإيميل معين.

* **الرابط:** `/api/email/{email}/inbox`
* **الطريقة:** `DELETE`
* **الرد الناجح:**
  ```json
  {
    "success": true,
    "message": "Inbox for myname@gffkl.com cleared."
  }
  ```

### 7. حذف الإيميل بالكامل (Delete Email)
يقوم بحذف الإيميل من قاعدة البيانات ومسح جميع رسائله.

* **الرابط:** `/api/email/{email}`
* **الطريقة:** `DELETE`
* **الرد الناجح:**
  ```json
  {
    "success": true,
    "message": "Email myname@gffkl.com and its inbox deleted."
  }
  ```

---

## أمثلة برمجية (Code Examples)

### مثال باستخدام بايثون (Python / Requests)
```python
import requests

API_KEY = "v1_API_8f92a3c7b8d4e5f6g7h8j9k0l1m2n3o4p5q6"
HEADERS = {"X-API-Key": API_KEY}
BASE_URL = "https://gffkl.com/api"

# 1. Create an email
response = requests.post(
    f"{BASE_URL}/email/create", 
    headers=HEADERS, 
    json={"email": "test@gffkl.com"}
)
print("Create Email:", response.json())

# 2. Get Inbox
response = requests.get(
    f"{BASE_URL}/email/test@gffkl.com/inbox", 
    headers=HEADERS
)
print("Inbox:", response.json())
```

### مثال باستخدام جافاسكريبت (JavaScript / Fetch)
```javascript
const API_KEY = "v1_API_8f92a3c7b8d4e5f6g7h8j9k0l1m2n3o4p5q6";
const HEADERS = {
  "X-API-Key": API_KEY,
  "Content-Type": "application/json"
};

// Create email
fetch("https://gffkl.com/api/email/create", {
  method: "POST",
  headers: HEADERS,
  body: JSON.stringify({ email: "js_test@gffkl.com" })
})
.then(res => res.json())
.then(console.log);
```
