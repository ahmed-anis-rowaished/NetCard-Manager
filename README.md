# NetCard Manager - مدير كروت المايكروتك الاحترافي 🚀

> **برنامج سطح مكتب متكامل واحترافي لإدارة وتوليد وطباعة كروت شبكات الإنترنت لأجهزة المايكروتك (MikroTik RouterOS v6 & v7) بواجهات عربية عصرية وتفاعلية (RTL) مستوحاة ومطورة عن برنامج Space Gate.**

[![GitHub Repo](https://img.shields.io/badge/GitHub-NetCard--Manager-7928CA?logo=github)](https://github.com/ahmed-anis-rowaished/NetCard-Manager)
[![RouterOS](https://img.shields.io/badge/RouterOS-v6%20%26%20v7-blue)](https://mikrotik.com)
[![Tech Stack](https://img.shields.io/badge/Stack-Electron%20%7C%20React%20%7C%20TypeScript%20%7C%20Vite-61DAFB)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 أبرز المميزات (Key Features)

### 1. شاشة تسجيل الدخول واكتشاف الأجهزة (MNDP Discovery)
- **إدخال مرن للعناوين:**
  - تبديل فوري بين **IP** مقسم إلى 4 خانات منفصلة (Octets) مع انتقال تلقائي بالـ `Tab` أو النقطة (`.`)، أو **Domain** للاتصال بالروابط السحابية وعناوين DynDNS.
  - خيار تغيير المنفذ (افتراضياً `8728` للـ API و `8729` للـ API-SSL المشفر).
- **أداء استثنائي وتوربو:**
  - **دخول سريع (Fast Login):** تخطي جلب الجلسات والمدفوعات لتسريع الفتح اللحظي.
  - **فتح مع توربو (Turbo Mode):** قنوات متوازية وأوامر مجمعة (Batch Pipelines) لتوليد مئات الكروت في ثوانٍ معدودة.
- **اكتشاف تلقائي للأجهزة عبر الشبكة المحلية (MNDP):**
  - مستمع UDP على المنفذ `5678` لبروتوكول MikroTik Neighbor Discovery.
  - جدول تفاعلي يعرض: `IP Address`, `MAC Address`, `Identity`, `Platform`, `Version`, `Board Name`.
  - نقرة واحدة على أي صف تعبئ بيانات الراوتر فورياً.
- **حفظ الأجهزة المشفر:** حفظ الراوترات في قاعدة بيانات محلية مشفرة بـ AES-256 مع إمكانية التعديل والحذف السريع.

---

### 2. طبقة التوافق الشاملة مع RouterOS v6 & v7 (`MikroTikAdapter`)
- التعرف التلقائي الذكي على إصدار النظام من `/system/resource/print`.
- **مستخدمو الهوت سبوت (Hotspot):**
  - إضافة المستخدمين، تعيين باقات السرعة (Rate Limit)، حدود الصلاحية (Limit Uptime)، وحجم التحميل (Limit Bytes Total).
  - دعم ربط الماك أدرس بأول جهاز (MAC Cookie / Binding).
- **مستخدمو اليوزر مانجر (User Manager v6 & v7):**
  - التوجيه التلقائي للمسار القديم في RouterOS v6 (`/tool/user-manager/user`) أو المسار الحديث في RouterOS v7 (`/user-manager/user`).
- **مستخدمو البرودباند (Broadband / PPPoE):**
  - إدارة اشتراكات وسجلات PPPoE (`/ppp/secret`) مع تحديد البروفايل وكلمات المرور وعناوين IP.

---

### 3. استوديو تصميم وتخصيص قوالب الكروت (Interactive Template Designer)
- **مساحة عمل تفاعلية حية (Live Canvas Preview):**
  - سحب وإفلات العناصر بالماوس (Drag & Drop) مع دقة مليمترية وحساب الإحداثيات `X` و `Y` في الوقت الفعلي.
  - تكبير وتصغير المعاينة (Zoom Control).
- **تخصيص 11 عنصراً مستقلاً:**
  1. `رمز الدخول` (Username)
  2. `كلمة السر` (Password)
  3. `رقم تسلسلي` (Serial Number)
  4. `الحجم` (Data Limit)
  5. `الصلاحية` (Validity / Uptime)
  6. `تاريخ الطباعة` (Print Date)
  7. `الوقت` (Time)
  8. `السعر` (Price)
  9. `باركود` (QR Code / Barcode)
  10. `تفاصيل 1` (نص مخصص مثل رقم الدعم الفني)
  11. `تفاصيل 2` (نص مخصص مثل عنوان صفحة تسجيل الدخول)
- **تخصيص كامل للمظهر:**
  - نوع الخط (`Cairo`, `Tajawal`, `Arial`, `Courier`).
  - حجم الخط، اللون (Color Picker)، خط غامق (Bold)، خط مائل (Italic).
  - إدراج صورة خلفية للكرت وصورة شعار (Logo).
  - أبعاد الكرت، عدد الكروت في الصفحة (مثلاً 51 كرت أو 42 كرت A4)، عدد الأعمدة، الهوامش، وإطار الكرت.
  - ترقيم الصفحات التلقائي (`صفحة X من Y`).

---

### 4. محرك التوليد والطباعة الدفعية (Batch Generation Engine)
- **حساب تبادلي ذكي (Reciprocal Calculation):**
  - إدخال **عدد الصفحات** يحسب عدد الكروت تلقائياً بالاعتماد على سعة القالب (`Cards = Pages × CardsPerPage`).
  - إدخال **عدد الكروت** يحسب عدد الصفحات المطلوبة تلقائياً (`Pages = ceil(Cards / CardsPerPage)`).
- **تنسيق مرن لبيانات الدخول:**
  - اسم وكلمة سر متساويين | اسم وكلمة سر مختلفين | رمز دخول فقط بدون كلمة سر.
  - التحكم في البادئة (Prefix) والنهاية (Suffix)، نمط الحروف (أرقام فقط / حروف فقط / أرقام وحروف) والطول.
- **مفاتيح التحكم الـ 10:**
  1. ربط الكروت بأول جهاز يستخدمه (MAC Cookie / Binding).
  2. المطالبة بتحديد مكان حفظ ملف الـ PDF.
  3. تصدير الكروت إلى ملف Excel (`.xlsx`) بتنسيق جداول أنيق.
  4. حفظ الكروت إلى ملف PDF جاهز للطباعة بدقة 300 DPI.
  5. **أمان المعاملات (Transaction Safety):** منع الطباعة أو الحفظ إلا بعد تأكيد إضافة الكروت بنجاح في المايكروتك.
  6. حفظ نسخة نصية (`.txt`).
  7. تصنيف الكروت في الأرشيف (مطبوع / غير مطبوع).
  8. فتح ملف الطباعة تلقائياً بعد الإضافة.
  9. تصدير الكروت إلى ملف سكربت مايكروتك (`.rsc`) للاستيراد في WinBox.
  10. **الوضع بدون اتصال (Offline Mode):** توليد وطباعة الكروت بدون اتصال مباشر بالراوتر.
- **درع الحماية من التخمين (Pro Guess Protection):**
  - توليد كروت عالية الإنتروبيا العشوائية تمنع التكرار والتنبؤ.
  - توليد سكربت جدار ناري (Firewall Anti-Bruteforce Script) لحظر الأجهزة التي تحاول تخمين الكروت على صفحة الهوت سبوت بعد 3 محاولات فاشلة.

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

| المجال | التقنية |
|---|---|
| **الإطار المكتبي** | Electron 33 |
| **واجهة المستخدم** | React 18, TypeScript, TailwindCSS, Framer Motion, Lucide Icons |
| **أداة البناء** | Vite 5 |
| **قاعدة البيانات** | SQLite (WASM / Persistent File-Backed) |
| **الاتصال بالراوتر** | Native RouterOS Protocol Socket Client (TCP 8728 / TLS 8729) |
| **اكتشاف الشبكة** | UDP Socket MNDP Listener (Port 5678) |
| **محرك الطباعة** | jsPDF Grid Engine + QRCode + ExcelJS |

---

## 🚀 التثبيت والتشغيل المحلي (Getting Started)

### المتطلبات الأساسية
- Node.js (الإصدار 18 فما فوق).
- npm أو yarn أو pnpm.

### 1. استنساخ المستودع
```bash
git clone https://github.com/ahmed-anis-rowaished/NetCard-Manager.git
cd NetCard-Manager
```

### 2. تثبيت الحزم
```bash
npm install
```

### 3. تشغيل وضع التطوير (Development Mode)
```bash
npm run dev
```

### 4. بناء ملفات الإنتاج والحزمة التنفيذية (Build)
```bash
# بناء كود TypeScript و Vite
npm run build

# حزم البرنامج كملف تنفيذي لنظام Windows (.exe)
npm run electron:build
```

---

## 📁 هيكلية المشروع (Project Structure)

```text
NetCard-Manager/
├── src/
│   ├── main/                   # عملية Electron الرئيسية (Main Process)
│   │   ├── index.ts            # نقطة البداية وإنشاء النوافذ
│   │   ├── database.ts         # طبقة SQLite وتشفير كلمات المرور
│   │   ├── mikrotikClient.ts   # بروتوكول اتصال الـ Socket بالمايكروتك
│   │   ├── mikrotikAdapter.ts  # التوافق مع v6 و v7 وهوت سبوت ويوزرمانجر
│   │   ├── mndpListener.ts     # مستمع بروتوكول اكتشاف الشبكة MNDP
│   │   ├── cardGeneratorEngine.ts # محرك توليد الأرقام والحساب التبادلي
│   │   ├── pdfGenerator.ts     # محرك طباعة الـ PDF الشبكي 300 DPI
│   │   ├── excelGenerator.ts   # مصدّر ملفات Excel
│   │   ├── firewallProtector.ts # مولد سكربتات حماية الجدار الناري
│   │   └── ipcHandlers.ts      # معالجات قنوات IPC
│   ├── preload/                # سكريبت Preload وعزل السياق (Context Bridge)
│   │   └── index.ts
│   ├── renderer/               # واجهة المستخدم (React + Tailwind)
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── index.css
│   │       ├── main.tsx
│   │       ├── components/     # شريط التنقل، إدخال Octets، وغيرها
│   │       └── views/          # الشاشات الرئيسية (تسجيل الدخول، القوالب، التوليد، الأرشيف)
│   └── shared/                 # الأنواع المشتركة والإعدادات الافتراضية
│       ├── types.ts
│       └── defaults.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 📜 الترخيص (License)
هذا المشروع مرخص تحت رخصة **MIT**.

---

**تم التطوير بواسطة NetCard Architect بأعلى معايير الجودة لشبكات المايكروتك.**
