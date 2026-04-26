import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CURRENCY = "INR";
const SYMBOL = "₹";

// Countries fetched dynamically from country_pricing table
let COUNTRIES: { code: string; flag: string; name: string }[] = [];
async function fetchCountries(supabase: any) {
  const { data } = await supabase.from("country_pricing").select("country_code, country_name, flag").order("country_name");
  COUNTRIES = (data || []).map((c: any) => ({ code: c.country_code, flag: c.flag, name: c.country_name }));
}

// ══════════════════════════════════════════════
// 🌐 TRANSLATIONS — EN, HI, ES, AR
// ══════════════════════════════════════════════
type Lang = "en" | "hi" | "es" | "ar";
const translations: Record<string, Record<Lang, string>> = {
  // ── Main Keyboard ──
  kb_buy: { en: "🛒 Buy Accounts", hi: "🛒 अकाउंट खरीदें", es: "🛒 Comprar Cuentas", ar: "🛒 شراء حسابات" },
  kb_orders: { en: "📊 My Orders", hi: "📊 मेरे ऑर्डर", es: "📊 Mis Pedidos", ar: "📊 طلباتي" },
  kb_reorder: { en: "🔄 Reorder", hi: "🔄 फिर से ऑर्डर", es: "🔄 Reordenar", ar: "🔄 إعادة طلب" },
  kb_guide: { en: "📖 Guide", hi: "📖 गाइड", es: "📖 Guía", ar: "📖 دليل" },
  kb_login: { en: "📲 Manual Login", hi: "📲 मैनुअल लॉगिन", es: "📲 Login Manual", ar: "📲 تسجيل يدوي" },
  kb_refer: { en: "🎁 Refer & Earn", hi: "🎁 रेफर करें और कमाएं", es: "🎁 Referir y Ganar", ar: "🎁 إحالة واكسب" },
  kb_support: { en: "🧑‍💻 Support", hi: "🧑‍💻 सहायता", es: "🧑‍💻 Soporte", ar: "🧑‍💻 الدعم" },
  kb_language: { en: "🌐 Language", hi: "🌐 भाषा", es: "🌐 Idioma", ar: "🌐 اللغة" },

  // ── Blocked ──
  blocked: { en: "🚫 *Account Suspended*\n\nYour account has been suspended.\nPlease contact support for assistance.", hi: "🚫 *खाता निलंबित*\n\nआपका खाता निलंबित कर दिया गया है।\nकृपया सहायता के लिए सपोर्ट से संपर्क करें।", es: "🚫 *Cuenta Suspendida*\n\nTu cuenta ha sido suspendida.\nContacta soporte para asistencia.", ar: "🚫 *الحساب معلق*\n\nتم تعليق حسابك.\nيرجى التواصل مع الدعم للمساعدة." },
  contact_support: { en: "🧑‍💻 Contact Support", hi: "🧑‍💻 सपोर्ट से संपर्क", es: "🧑‍💻 Contactar Soporte", ar: "🧑‍💻 اتصل بالدعم" },

  // ── Channel Join ──
  join_channel_title: { en: "📢  JOIN OUR CHANNEL", hi: "📢  हमारे चैनल से जुड़ें", es: "📢  ÚNETE A NUESTRO CANAL", ar: "📢  انضم إلى قناتنا" },
  join_channel_msg: { en: "Before you start, please join our\nofficial channel for:\n\n🔹 Latest deals & discounts\n🔹 Stock updates\n🔹 Important announcements\n🔹 Tips & tricks\n\n👇 *Tap \"Join Channel\" then come\nback and tap \"✅ Joined\"*", hi: "शुरू करने से पहले, कृपया हमारे\nआधिकारिक चैनल से जुड़ें:\n\n🔹 नवीनतम डील और छूट\n🔹 स्टॉक अपडेट\n🔹 महत्वपूर्ण घोषणाएं\n🔹 टिप्स और ट्रिक्स\n\n👇 *\"Join Channel\" दबाएं फिर\nवापस आकर \"✅ Joined\" दबाएं*", es: "Antes de empezar, únete a nuestro\ncanal oficial para:\n\n🔹 Últimas ofertas y descuentos\n🔹 Actualizaciones de stock\n🔹 Anuncios importantes\n🔹 Tips y trucos\n\n👇 *Toca \"Join Channel\" y luego\nvuelve y toca \"✅ Joined\"*", ar: "قبل البدء، يرجى الانضمام إلى\nقناتنا الرسمية من أجل:\n\n🔹 أحدث العروض والخصومات\n🔹 تحديثات المخزون\n🔹 إعلانات مهمة\n🔹 نصائح وحيل\n\n👇 *اضغط \"Join Channel\" ثم\nعد واضغط \"✅ Joined\"*" },
  not_joined: { en: "❌ *You haven't joined yet!*\n\nPlease join our channel first, then tap \"✅ Joined\" again.", hi: "❌ *आपने अभी तक जॉइन नहीं किया!*\n\nकृपया पहले हमारे चैनल से जुड़ें, फिर \"✅ Joined\" दबाएं।", es: "❌ *¡Aún no te has unido!*\n\nÚnete a nuestro canal primero, luego toca \"✅ Joined\" de nuevo.", ar: "❌ *لم تنضم بعد!*\n\nيرجى الانضمام إلى قناتنا أولاً، ثم اضغط \"✅ Joined\" مرة أخرى." },
  btn_join: { en: "📢 Join @riox239", hi: "📢 @riox239 जॉइन करें", es: "📢 Unirse a @riox239", ar: "📢 انضم @riox239" },
  btn_joined: { en: "✅ Joined", hi: "✅ जॉइन किया", es: "✅ Unido", ar: "✅ انضممت" },

  // ── Welcome ──
  welcome_title: { en: "🚀  RIOX ACCOUNTS PRO", hi: "🚀  RIOX ACCOUNTS PRO", es: "🚀  RIOX ACCOUNTS PRO", ar: "🚀  RIOX ACCOUNTS PRO" },
  welcome_msg: { en: "Premium Telegram accounts for\nairdrop farming — delivered instantly.", hi: "एयरड्रॉप फार्मिंग के लिए प्रीमियम\nटेलीग्राम अकाउंट — तुरंत डिलीवरी।", es: "Cuentas premium de Telegram para\nairdrop farming — entrega instantánea.", ar: "حسابات تيليجرام متميزة\nلزراعة الإيردروب — توصيل فوري." },
  welcome_stats: { en: "✅  3,847+ Happy Customers\n⭐  4.9★ Avg Rating\n⚡  Auto-Delivery in <5 min\n🔒  100% Working Guarantee\n💰  Lowest Market Prices", hi: "✅  3,847+ खुश ग्राहक\n⭐  4.9★ औसत रेटिंग\n⚡  <5 मिनट में ऑटो-डिलीवरी\n🔒  100% वर्किंग गारंटी\n💰  सबसे कम मार्केट प्राइस", es: "✅  3,847+ Clientes Satisfechos\n⭐  4.9★ Calificación Promedio\n⚡  Auto-Entrega en <5 min\n🔒  100% Garantía de Funcionamiento\n💰  Precios más bajos del mercado", ar: "✅  3,847+ عميل سعيد\n⭐  4.9★ متوسط التقييم\n⚡  توصيل تلقائي في <5 دقائق\n🔒  ضمان عمل 100%\n💰  أقل أسعار في السوق" },
  pick_country: { en: "⬇️ *Pick your country to begin:*\n_(⭐ Popular countries shown first)_\n_(📖 New? Tap \"How to Buy\" for a guide!)_", hi: "⬇️ *शुरू करने के लिए अपना देश चुनें:*\n_(⭐ लोकप्रिय देश पहले दिखाए गए)_\n_(📖 नए हैं? गाइड के लिए \"How to Buy\" दबाएं!)_", es: "⬇️ *Elige tu país para comenzar:*\n_(⭐ Países populares primero)_\n_(📖 ¿Nuevo? Toca \"How to Buy\" para una guía!)_", ar: "⬇️ *اختر بلدك للبدء:*\n_(⭐ الدول الشائعة أولاً)_\n_(📖 جديد؟ اضغط \"How to Buy\" للدليل!)_" },
  btn_how_to_buy: { en: "📖 How to Buy (Guide)", hi: "📖 कैसे खरीदें (गाइड)", es: "📖 Cómo Comprar (Guía)", ar: "📖 كيفية الشراء (دليل)" },
  btn_referrals: { en: "🎁 Referrals", hi: "🎁 रेफरल", es: "🎁 Referidos", ar: "🎁 إحالات" },

  // ── Promo video ──
  promo_caption: { en: "🎬 *Welcome to RIOX ACCOUNTS PRO!*\n\nWatch this quick intro to see how easy it is to buy premium Telegram accounts.\n\n_New here? Type /guide for a step-by-step tutorial!_", hi: "🎬 *RIOX ACCOUNTS PRO में आपका स्वागत है!*\n\nयह क्विक इंट्रो देखें और जानें कि प्रीमियम टेलीग्राम अकाउंट खरीदना कितना आसान है।\n\n_नए हैं? स्टेप-बाय-स्टेप ट्यूटोरियल के लिए /guide टाइप करें!_", es: "🎬 *¡Bienvenido a RIOX ACCOUNTS PRO!*\n\nMira esta intro rápida para ver lo fácil que es comprar cuentas premium de Telegram.\n\n_¿Nuevo? Escribe /guide para un tutorial paso a paso!_", ar: "🎬 *مرحبًا بك في RIOX ACCOUNTS PRO!*\n\nشاهد هذا المقدمة السريعة لترى مدى سهولة شراء حسابات تيليجرام المميزة.\n\n_جديد هنا؟ اكتب /guide للحصول على دليل خطوة بخطوة!_" },

  // ── Country selection / Type ──
  select_type: { en: "👇 *Select account type:*", hi: "👇 *अकाउंट प्रकार चुनें:*", es: "👇 *Selecciona tipo de cuenta:*", ar: "👇 *اختر نوع الحساب:*" },
  regular: { en: "📦 REGULAR", hi: "📦 रेगुलर", es: "📦 REGULAR", ar: "📦 عادي" },
  aged: { en: "👑 AGED (6mo+)", hi: "👑 पुराना (6 महीने+)", es: "👑 ANTIGUO (6m+)", ar: "👑 قديم (6 أشهر+)" },
  per_account: { en: "per account", hi: "प्रति अकाउंट", es: "por cuenta", ar: "لكل حساب" },
  in_stock: { en: "in stock", hi: "स्टॉक में", es: "en stock", ar: "متوفر" },
  sold_out: { en: "Sold Out", hi: "स्टॉक खत्म", es: "Agotado", ar: "نفذ" },
  left: { en: "left", hi: "बाकी", es: "restantes", ar: "متبقي" },
  limited_stock: { en: "Limited stock!", hi: "सीमित स्टॉक!", es: "¡Stock limitado!", ar: "مخزون محدود!" },
  currently_unavailable: { en: "Currently unavailable", hi: "वर्तमान में अनुपलब्ध", es: "No disponible", ar: "غير متوفر حالياً" },
  fresh_accounts: { en: "Fresh accounts", hi: "नए अकाउंट", es: "Cuentas frescas", ar: "حسابات جديدة" },
  ready_to_use: { en: "Ready to use", hi: "उपयोग के लिए तैयार", es: "Listo para usar", ar: "جاهز للاستخدام" },
  months_old: { en: "6+ months old", hi: "6+ महीने पुराना", es: "6+ meses de antigüedad", ar: "أقدم من 6 أشهر" },
  higher_trust: { en: "Higher trust score", hi: "उच्च विश्वास स्कोर", es: "Mayor puntuación de confianza", ar: "درجة ثقة أعلى" },
  best_premium: { en: "Best for premium drops", hi: "प्रीमियम ड्रॉप्स के लिए सर्वोत्तम", es: "Mejor para drops premium", ar: "الأفضل للإسقاطات المميزة" },
  change_country: { en: "🔙 Change Country", hi: "🔙 देश बदलें", es: "🔙 Cambiar País", ar: "🔙 تغيير البلد" },
  btn_menu: { en: "🏠 Menu", hi: "🏠 मेनू", es: "🏠 Menú", ar: "🏠 القائمة" },
  notify_regular: { en: "🔔 Notify when Regular back", hi: "🔔 रेगुलर वापस आने पर सूचित करें", es: "🔔 Notificar cuando Regular vuelva", ar: "🔔 إعلامي عند توفر العادي" },
  notify_aged: { en: "🔔 Notify when Aged back", hi: "🔔 पुराना वापस आने पर सूचित करें", es: "🔔 Notificar cuando Antiguo vuelva", ar: "🔔 إعلامي عند توفر القديم" },

  // ── Quantity ──
  price_calc: { en: "🧮 *PRICE CALCULATOR*", hi: "🧮 *प्राइस कैलकुलेटर*", es: "🧮 *CALCULADORA DE PRECIO*", ar: "🧮 *حاسبة الأسعار*" },
  how_many: { en: "*How many accounts?*\nTap below or type a number (1-100):", hi: "*कितने अकाउंट?*\nनीचे टैप करें या नंबर टाइप करें (1-100):", es: "*¿Cuántas cuentas?*\nToca abajo o escribe un número (1-100):", ar: "*كم حساب؟*\nاضغط أدناه أو اكتب رقماً (1-100):" },
  change_type: { en: "🔙 Change Type", hi: "🔙 प्रकार बदलें", es: "🔙 Cambiar Tipo", ar: "🔙 تغيير النوع" },
  invalid_qty: { en: "⚠️ *Invalid number!*\n\nPlease enter between *1* and *100*.\nOr tap a quick option above ☝️", hi: "⚠️ *अमान्य संख्या!*\n\nकृपया *1* और *100* के बीच दर्ज करें।\nया ऊपर क्विक ऑप्शन टैप करें ☝️", es: "⚠️ *¡Número inválido!*\n\nIngresa entre *1* y *100*.\nO toca una opción rápida arriba ☝️", ar: "⚠️ *رقم غير صالح!*\n\nيرجى إدخال رقم بين *1* و *100*.\nأو اضغط على خيار سريع أعلاه ☝️" },
  go_back: { en: "🔙 Go Back", hi: "🔙 वापस जाएं", es: "🔙 Volver", ar: "🔙 رجوع" },

  // ── Order Created ──
  order_created: { en: "📋  ORDER CREATED!", hi: "📋  ऑर्डर बन गया!", es: "📋  ¡PEDIDO CREADO!", ar: "📋  تم إنشاء الطلب!" },
  total: { en: "TOTAL", hi: "कुल", es: "TOTAL", ar: "المجموع" },
  choose_payment: { en: "👇 *Choose payment method:*", hi: "👇 *भुगतान विधि चुनें:*", es: "👇 *Elige método de pago:*", ar: "👇 *اختر طريقة الدفع:*" },
  btn_upi: { en: "💳 UPI Payment", hi: "💳 UPI भुगतान", es: "💳 Pago UPI", ar: "💳 دفع UPI" },
  btn_crypto: { en: "₿ Crypto Payment", hi: "₿ क्रिप्टो भुगतान", es: "₿ Pago Crypto", ar: "₿ دفع كريبتو" },
  btn_cancel: { en: "❌ Cancel Order", hi: "❌ ऑर्डर रद्द करें", es: "❌ Cancelar Pedido", ar: "❌ إلغاء الطلب" },

  // ── Screenshot received ──
  screenshot_title: { en: "📸  SCREENSHOT RECEIVED", hi: "📸  स्क्रीनशॉट प्राप्त", es: "📸  CAPTURA RECIBIDA", ar: "📸  تم استلام لقطة الشاشة" },
  screenshot_msg: { en: "✅ Payment proof has been sent to our team!\n\n⏱️ *ETA:* 5–15 minutes\n\nWe'll send your accounts right\nhere once verified! 📥", hi: "✅ भुगतान प्रमाण हमारी टीम को भेज दिया गया!\n\n⏱️ *अनुमानित समय:* 5–15 मिनट\n\nसत्यापन के बाद आपके अकाउंट\nयहीं भेजे जाएंगे! 📥", es: "✅ ¡Prueba de pago enviada a nuestro equipo!\n\n⏱️ *Tiempo est.:* 5–15 minutos\n\n¡Te enviaremos tus cuentas\naquí una vez verificado! 📥", ar: "✅ تم إرسال إثبات الدفع لفريقنا!\n\n⏱️ *الوقت المتوقع:* 5–15 دقيقة\n\nسنرسل حساباتك هنا\nبمجرد التحقق! 📥" },
  btn_track: { en: "📊 Track Order", hi: "📊 ऑर्डर ट्रैक करें", es: "📊 Rastrear Pedido", ar: "📊 تتبع الطلب" },
  btn_main_menu: { en: "🏠 Main Menu", hi: "🏠 मुख्य मेनू", es: "🏠 Menú Principal", ar: "🏠 القائمة الرئيسية" },

  // ── Payment received ──
  payment_received_title: { en: "✅  PAYMENT RECEIVED", hi: "✅  भुगतान प्राप्त", es: "✅  PAGO RECIBIDO", ar: "✅  تم استلام الدفع" },
  payment_next: { en: "*What happens next:*\n\n  ┌── Step 1 ──┐\n  │ ⏳ Admin verifies payment │\n  ├── Step 2 ──┤\n  │ ✅ Order gets approved │\n  ├── Step 3 ──┤\n  │ 📥 Accounts auto-delivered │\n  └─────────────────────┘\n\n⏱️ *ETA: 5–15 minutes*\n\n📸 _Send payment screenshot for\nfaster verification!_", hi: "*आगे क्या होगा:*\n\n  ┌── चरण 1 ──┐\n  │ ⏳ एडमिन भुगतान सत्यापित करेगा │\n  ├── चरण 2 ──┤\n  │ ✅ ऑर्डर अप्रूव होगा │\n  ├── चरण 3 ──┤\n  │ 📥 अकाउंट ऑटो-डिलीवर होंगे │\n  └─────────────────────┘\n\n⏱️ *अनुमानित समय: 5–15 मिनट*\n\n📸 _तेज सत्यापन के लिए भुगतान\nस्क्रीनशॉट भेजें!_", es: "*¿Qué sigue?*\n\n  ┌── Paso 1 ──┐\n  │ ⏳ Admin verifica pago │\n  ├── Paso 2 ──┤\n  │ ✅ Pedido aprobado │\n  ├── Paso 3 ──┤\n  │ 📥 Cuentas auto-entregadas │\n  └─────────────────────┘\n\n⏱️ *Tiempo est.: 5–15 minutos*\n\n📸 _Envía captura del pago para\nverificación más rápida!_", ar: "*ماذا بعد:*\n\n  ┌── خطوة 1 ──┐\n  │ ⏳ المشرف يتحقق من الدفع │\n  ├── خطوة 2 ──┤\n  │ ✅ الطلب يُوافق عليه │\n  ├── خطوة 3 ──┤\n  │ 📥 الحسابات تُسلم تلقائياً │\n  └─────────────────────┘\n\n⏱️ *الوقت المتوقع: 5–15 دقيقة*\n\n📸 _أرسل لقطة شاشة الدفع\nللتحقق الأسرع!_" },

  // ── UPI Payment ──
  upi_title: { en: "💳 *PAY VIA UPI*", hi: "💳 *UPI से भुगतान*", es: "💳 *PAGAR VÍA UPI*", ar: "💳 *الدفع عبر UPI*" },
  upi_scan: { en: "Scan the QR above or pay via\nGPay • Paytm • PhonePe\n\n📸 *Send payment screenshot* for\nfaster verification!\n\nOr tap *\"✅ I Have Paid\"* below 👇", hi: "ऊपर QR स्कैन करें या\nGPay • Paytm • PhonePe से भुगतान करें\n\n📸 *तेज सत्यापन के लिए भुगतान\nस्क्रीनशॉट भेजें!*\n\nया नीचे *\"✅ मैंने भुगतान किया\"* दबाएं 👇", es: "Escanea el QR arriba o paga vía\nGPay • Paytm • PhonePe\n\n📸 *Envía captura del pago* para\nverificación más rápida!\n\nO toca *\"✅ He Pagado\"* abajo 👇", ar: "امسح QR أعلاه أو ادفع عبر\nGPay • Paytm • PhonePe\n\n📸 *أرسل لقطة شاشة الدفع* للتحقق\nالأسرع!\n\nأو اضغط *\"✅ لقد دفعت\"* أدناه 👇" },
  btn_paid: { en: "✅ I Have Paid", hi: "✅ मैंने भुगतान किया", es: "✅ He Pagado", ar: "✅ لقد دفعت" },
  btn_switch_crypto: { en: "₿ Switch to Crypto", hi: "₿ क्रिप्टो पर स्विच करें", es: "₿ Cambiar a Crypto", ar: "₿ التبديل إلى كريبتو" },
  btn_switch_upi: { en: "💳 Switch to UPI", hi: "💳 UPI पर स्विच करें", es: "💳 Cambiar a UPI", ar: "💳 التبديل إلى UPI" },
  btn_help: { en: "🧑‍💻 Help", hi: "🧑‍💻 मदद", es: "🧑‍💻 Ayuda", ar: "🧑‍💻 مساعدة" },

  // ── Crypto Payment ──
  crypto_title: { en: "₿  CRYPTO PAYMENT", hi: "₿  क्रिप्टो भुगतान", es: "₿  PAGO CRYPTO", ar: "₿  دفع كريبتو" },
  crypto_not_available: { en: "❌ *Crypto payments not available*\n\nNo crypto wallets are currently configured. Please use UPI payment instead.", hi: "❌ *क्रिप्टो भुगतान उपलब्ध नहीं*\n\nवर्तमान में कोई क्रिप्टो वॉलेट कॉन्फ़िगर नहीं है। कृपया UPI भुगतान का उपयोग करें।", es: "❌ *Pagos crypto no disponibles*\n\nNo hay wallets crypto configurados. Usa pago UPI en su lugar.", ar: "❌ *الدفع بالعملات المشفرة غير متاح*\n\nلا توجد محافظ كريبتو مُعدة حالياً. يرجى استخدام الدفع عبر UPI بدلاً من ذلك." },
  crypto_send_screenshot: { en: "📸 After sending, *send a screenshot*\nor the *transaction hash* here.", hi: "📸 भेजने के बाद, यहाँ *स्क्रीनशॉट*\nया *ट्रांज़ैक्शन हैश* भेजें।", es: "📸 Después de enviar, *envía una captura*\no el *hash de transacción* aquí.", ar: "📸 بعد الإرسال، *أرسل لقطة شاشة*\nأو *هاش المعاملة* هنا." },
  crypto_verify: { en: "⏱️ Admin will verify & approve\nwithin *15–30 minutes*.", hi: "⏱️ एडमिन *15–30 मिनट* में\nसत्यापित और अप्रूव करेगा।", es: "⏱️ El admin verificará y aprobará\nen *15–30 minutos*.", ar: "⏱️ المشرف سيتحقق ويوافق\nخلال *15–30 دقيقة*." },

  // ── Cancel ──
  cancelled: { en: "❌ Order cancelled. Start a new order anytime!", hi: "❌ ऑर्डर रद्द। कभी भी नया ऑर्डर शुरू करें!", es: "❌ Pedido cancelado. ¡Inicia uno nuevo cuando quieras!", ar: "❌ تم إلغاء الطلب. ابدأ طلباً جديداً في أي وقت!" },
  no_cancel: { en: "No active order to cancel.", hi: "रद्द करने के लिए कोई सक्रिय ऑर्डर नहीं।", es: "No hay pedido activo para cancelar.", ar: "لا يوجد طلب نشط للإلغاء." },
  btn_new_order: { en: "🛒 New Order", hi: "🛒 नया ऑर्डर", es: "🛒 Nuevo Pedido", ar: "🛒 طلب جديد" },

  // ── Orders ──
  orders_title: { en: "📊  YOUR ORDERS", hi: "📊  आपके ऑर्डर", es: "📊  TUS PEDIDOS", ar: "📊  طلباتك" },
  no_orders: { en: "📭 *No orders yet!*\n\nYou haven't placed any orders.\nGet started now — it only takes\n30 seconds! ⚡", hi: "📭 *अभी तक कोई ऑर्डर नहीं!*\n\nआपने कोई ऑर्डर नहीं दिया है।\nअभी शुरू करें — केवल 30 सेकंड\nलगते हैं! ⚡", es: "📭 *¡Sin pedidos aún!*\n\nNo has hecho ningún pedido.\n¡Empieza ahora — solo toma\n30 segundos! ⚡", ar: "📭 *لا توجد طلبات بعد!*\n\nلم تقم بأي طلب.\nابدأ الآن — يستغرق 30\nثانية فقط! ⚡" },
  btn_buy_first: { en: "🛒 Buy My First Accounts", hi: "🛒 मेरे पहले अकाउंट खरीदें", es: "🛒 Comprar Mis Primeras Cuentas", ar: "🛒 شراء حساباتي الأولى" },
  btn_refresh: { en: "🔄 Refresh", hi: "🔄 रिफ्रेश", es: "🔄 Actualizar", ar: "🔄 تحديث" },
  btn_full_history: { en: "📜 Full History", hi: "📜 पूरा इतिहास", es: "📜 Historial Completo", ar: "📜 السجل الكامل" },
  btn_reorder_last: { en: "🔄 Reorder Last", hi: "🔄 आखिरी रीऑर्डर", es: "🔄 Reordenar Último", ar: "🔄 إعادة طلب الأخير" },
  orders_delivered: { en: "delivered", hi: "डिलीवर हुए", es: "entregados", ar: "تم التسليم" },
  orders_total: { en: "orders", hi: "ऑर्डर", es: "pedidos", ar: "طلبات" },
  total_spent: { en: "Total spent", hi: "कुल खर्च", es: "Total gastado", ar: "إجمالي الإنفاق" },
  status_pending: { en: "Pending", hi: "लंबित", es: "Pendiente", ar: "قيد الانتظار" },
  status_review: { en: "Under Review", hi: "समीक्षा में", es: "En Revisión", ar: "قيد المراجعة" },
  status_delivered: { en: "✓ Delivered", hi: "✓ डिलीवर हुआ", es: "✓ Entregado", ar: "✓ تم التسليم" },
  status_approved: { en: "Approved", hi: "अप्रूव हुआ", es: "Aprobado", ar: "تمت الموافقة" },
  status_rejected: { en: "Rejected", hi: "अस्वीकृत", es: "Rechazado", ar: "مرفوض" },
  status_cancelled: { en: "Cancelled", hi: "रद्द", es: "Cancelado", ar: "ملغي" },

  // ── Track ──
  track_title: { en: "🔍  ORDER TRACKING", hi: "🔍  ऑर्डर ट्रैकिंग", es: "🔍  RASTREO DE PEDIDO", ar: "🔍  تتبع الطلب" },
  track_not_found: { en: "❌ *Order not found!*\n\nNo order with that ID was found under your account.\n\n💡 _Check /status for your order list._", hi: "❌ *ऑर्डर नहीं मिला!*\n\nआपके अकाउंट में उस ID का कोई ऑर्डर नहीं मिला।\n\n💡 _अपनी ऑर्डर लिस्ट के लिए /status चेक करें।_", es: "❌ *¡Pedido no encontrado!*\n\nNo se encontró un pedido con ese ID en tu cuenta.\n\n💡 _Revisa /status para tu lista de pedidos._", ar: "❌ *الطلب غير موجود!*\n\nلم يتم العثور على طلب بهذا المعرف في حسابك.\n\n💡 _تحقق من /status لقائمة طلباتك._" },
  details: { en: "Details", hi: "विवरण", es: "Detalles", ar: "تفاصيل" },
  progress: { en: "Progress", hi: "प्रगति", es: "Progreso", ar: "التقدم" },
  ordered_on: { en: "Ordered", hi: "ऑर्डर किया", es: "Ordenado", ar: "تم الطلب" },
  delivered_on: { en: "Delivered", hi: "डिलीवर हुआ", es: "Entregado", ar: "تم التسليم" },
  btn_all_orders: { en: "📊 All Orders", hi: "📊 सभी ऑर्डर", es: "📊 Todos los Pedidos", ar: "📊 جميع الطلبات" },

  // ── Reorder ──
  reorder_title: { en: "🔄  QUICK REORDER", hi: "🔄  क्विक रीऑर्डर", es: "🔄  REORDEN RÁPIDO", ar: "🔄  إعادة طلب سريع" },
  reorder_last: { en: "Your last order:", hi: "आपका आखिरी ऑर्डर:", es: "Tu último pedido:", ar: "آخر طلب لك:" },
  reorder_confirm: { en: "Want to reorder the same? 👇", hi: "वही फिर से ऑर्डर करना है? 👇", es: "¿Quieres reordenar lo mismo? 👇", ar: "تريد إعادة طلب نفس الشيء؟ 👇" },
  btn_reorder: { en: "✅ Reorder", hi: "✅ रीऑर्डर", es: "✅ Reordenar", ar: "✅ إعادة طلب" },
  btn_modify: { en: "✏️ Modify Order", hi: "✏️ ऑर्डर बदलें", es: "✏️ Modificar Pedido", ar: "✏️ تعديل الطلب" },
  no_prev_orders: { en: "❌ *No previous orders found!*\n\nYou need to complete at least one order before you can reorder.\n\nStart your first order below! 👇", hi: "❌ *कोई पिछला ऑर्डर नहीं मिला!*\n\nरीऑर्डर करने से पहले कम से कम एक ऑर्डर पूरा करना होगा।\n\nनीचे अपना पहला ऑर्डर शुरू करें! 👇", es: "❌ *¡Sin pedidos previos!*\n\nNecesitas completar al menos un pedido antes de reordenar.\n\n¡Inicia tu primer pedido abajo! 👇", ar: "❌ *لا توجد طلبات سابقة!*\n\nتحتاج إلى إكمال طلب واحد على الأقل قبل إعادة الطلب.\n\nابدأ طلبك الأول أدناه! 👇" },

  // ── Stock Alert ──
  stock_alert_set: { en: "🔔 *Stock Alert Set!*\n\nYou'll be notified when stock is back! 📬\n\nWe'll message you as soon as\nnew accounts are available.", hi: "🔔 *स्टॉक अलर्ट सेट!*\n\nस्टॉक वापस आने पर आपको सूचित किया जाएगा! 📬\n\nनए अकाउंट उपलब्ध होते ही\nहम आपको मैसेज करेंगे।", es: "🔔 *¡Alerta de Stock Configurada!*\n\n¡Te notificaremos cuando vuelva el stock! 📬\n\nTe enviaremos un mensaje cuando\nhaya cuentas nuevas disponibles.", ar: "🔔 *تم تعيين تنبيه المخزون!*\n\nسيتم إعلامك عندما يعود المخزون! 📬\n\nسنراسلك بمجرد توفر\nحسابات جديدة." },
  btn_browse: { en: "🛒 Browse Other Countries", hi: "🛒 अन्य देश ब्राउज़ करें", es: "🛒 Explorar Otros Países", ar: "🛒 تصفح بلدان أخرى" },

  // ── Referral ──
  referral_title: { en: "🎁  REFERRAL PROGRAM", hi: "🎁  रेफरल प्रोग्राम", es: "🎁  PROGRAMA DE REFERIDOS", ar: "🎁  برنامج الإحالة" },
  referral_earn: { en: "Earn *5% commission* on every\nsale from your referrals! 💰", hi: "अपने रेफरल की हर बिक्री पर\n*5% कमीशन* कमाएं! 💰", es: "Gana *5% de comisión* en cada\nventa de tus referidos! 💰", ar: "اكسب *5% عمولة* على كل\nبيع من إحالاتك! 💰" },
  your_stats: { en: "Your Stats", hi: "आपके आंकड़े", es: "Tus Estadísticas", ar: "إحصائياتك" },
  referrals_count: { en: "Referrals", hi: "रेफरल", es: "Referidos", ar: "الإحالات" },
  earned: { en: "Earned", hi: "कमाया", es: "Ganado", ar: "المكتسب" },
  your_link: { en: "🔗 *Your Link (tap to copy):*", hi: "🔗 *आपका लिंक (कॉपी करने के लिए टैप करें):*", es: "🔗 *Tu Link (toca para copiar):*", ar: "🔗 *رابطك (انقر للنسخ):*" },
  how_it_works: { en: "*How it works:*\n1️⃣ Share link → 2️⃣ They buy → 3️⃣ You earn 🤑", hi: "*कैसे काम करता है:*\n1️⃣ लिंक शेयर करें → 2️⃣ वे खरीदें → 3️⃣ आप कमाएं 🤑", es: "*Cómo funciona:*\n1️⃣ Comparte link → 2️⃣ Ellos compran → 3️⃣ Tú ganas 🤑", ar: "*كيف يعمل:*\n1️⃣ شارك الرابط → 2️⃣ يشترون → 3️⃣ أنت تكسب 🤑" },
  btn_back_shop: { en: "🛒 Back to Shop", hi: "🛒 शॉप पर वापस", es: "🛒 Volver a Tienda", ar: "🛒 العودة للمتجر" },

  // ── Support ──
  support_title: { en: "🧑‍💻  CUSTOMER SUPPORT", hi: "🧑‍💻  ग्राहक सहायता", es: "🧑‍💻  SOPORTE AL CLIENTE", ar: "🧑‍💻  دعم العملاء" },
  support_msg: { en: "Our support team is here to help!\n\n⏱️ Response time: *15–30 min*\n\nA human agent will reach out\nto you shortly! 🙏\n\n💡 *Quick self-service:*", hi: "हमारी सपोर्ट टीम मदद के लिए यहाँ है!\n\n⏱️ प्रतिक्रिया समय: *15–30 मिनट*\n\nएक मानव एजेंट जल्द ही\nआपसे संपर्क करेगा! 🙏\n\n💡 *त्वरित सेल्फ-सर्विस:*", es: "¡Nuestro equipo de soporte está aquí para ayudar!\n\n⏱️ Tiempo de respuesta: *15–30 min*\n\nUn agente humano se comunicará\ncontigo pronto! 🙏\n\n💡 *Auto-servicio rápido:*", ar: "فريق الدعم لدينا هنا للمساعدة!\n\n⏱️ وقت الاستجابة: *15–30 دقيقة*\n\nسيتواصل معك وكيل بشري\nقريبًا! 🙏\n\n💡 *خدمة ذاتية سريعة:*" },
  btn_check_status: { en: "📊 Check Order Status", hi: "📊 ऑर्डर स्टेटस चेक करें", es: "📊 Ver Estado del Pedido", ar: "📊 تحقق من حالة الطلب" },
  btn_place_order: { en: "🛒 Place New Order", hi: "🛒 नया ऑर्डर दें", es: "🛒 Hacer Nuevo Pedido", ar: "🛒 تقديم طلب جديد" },
  btn_referral: { en: "🎁 Referral Program", hi: "🎁 रेफरल प्रोग्राम", es: "🎁 Programa de Referidos", ar: "🎁 برنامج الإحالة" },

  // ── Fallback ──
  fallback_msg: { en: "What would you like to do?\n\nChoose from the options below\nor use the menu buttons 👇", hi: "आप क्या करना चाहेंगे?\n\nनीचे दिए गए विकल्पों में से चुनें\nया मेनू बटन का उपयोग करें 👇", es: "¿Qué te gustaría hacer?\n\nElige de las opciones abajo\no usa los botones del menú 👇", ar: "ماذا تريد أن تفعل؟\n\nاختر من الخيارات أدناه\nأو استخدم أزرار القائمة 👇" },
  btn_buy: { en: "🛒 Buy Accounts", hi: "🛒 अकाउंट खरीदें", es: "🛒 Comprar Cuentas", ar: "🛒 شراء حسابات" },

  // ── Language ──
  lang_title: { en: "🌐  CHOOSE LANGUAGE", hi: "🌐  भाषा चुनें", es: "🌐  ELEGIR IDIOMA", ar: "🌐  اختر اللغة" },
  lang_msg: { en: "Select your preferred language:", hi: "अपनी पसंदीदा भाषा चुनें:", es: "Selecciona tu idioma preferido:", ar: "اختر لغتك المفضلة:" },
  lang_set: { en: "✅ Language set to *English*!", hi: "✅ भाषा *हिंदी* में सेट की गई!", es: "✅ ¡Idioma configurado en *Español*!", ar: "✅ تم تعيين اللغة إلى *العربية*!" },

  // ── Steps indicator ──
  step_country: { en: "🌍 Country", hi: "🌍 देश", es: "🌍 País", ar: "🌍 البلد" },
  step_type: { en: "📦 Type", hi: "📦 प्रकार", es: "📦 Tipo", ar: "📦 النوع" },
  step_qty: { en: "🔢 Qty", hi: "🔢 संख्या", es: "🔢 Cant.", ar: "🔢 الكمية" },
  step_pay: { en: "💳 Pay", hi: "💳 भुगतान", es: "💳 Pago", ar: "💳 الدفع" },

  // ── Progress steps ──
  prog_ordered: { en: "Ordered", hi: "ऑर्डर किया", es: "Ordenado", ar: "تم الطلب" },
  prog_paid: { en: "Paid", hi: "भुगतान किया", es: "Pagado", ar: "تم الدفع" },
  prog_verified: { en: "Verified", hi: "सत्यापित", es: "Verificado", ar: "تم التحقق" },
  prog_delivered: { en: "Delivered", hi: "डिलीवर हुआ", es: "Entregado", ar: "تم التسليم" },

  // ── Manual Login ──
  ml_title: { en: "📲  MANUAL LOGIN", hi: "📲  मैनुअल लॉगिन", es: "📲  LOGIN MANUAL", ar: "📲  تسجيل يدوي" },
  ml_no_orders: { en: "❌ *No delivered orders found!*\n\nYou need to have delivered orders to use Manual Login.\nBuy accounts first! 👇", hi: "❌ *कोई डिलीवर ऑर्डर नहीं मिला!*\n\nमैनुअल लॉगिन के लिए डिलीवर ऑर्डर होना चाहिए।\nपहले अकाउंट खरीदें! 👇", es: "❌ *¡No hay pedidos entregados!*\n\nNecesitas pedidos entregados para usar Login Manual.\n¡Compra cuentas primero! 👇", ar: "❌ *لا توجد طلبات مسلّمة!*\n\nتحتاج طلبات مسلّمة لاستخدام التسجيل اليدوي.\nاشترِ حسابات أولاً! 👇" },
  ml_select_order: { en: "👇 *Select an order to login:*", hi: "👇 *लॉगिन के लिए ऑर्डर चुनें:*", es: "👇 *Selecciona un pedido para login:*", ar: "👇 *اختر طلباً لتسجيل الدخول:*" },
  ml_number: { en: "📱 *Phone Number:*", hi: "📱 *फोन नंबर:*", es: "📱 *Número de Teléfono:*", ar: "📱 *رقم الهاتف:*" },
  ml_request_otp: { en: "🔑 Request OTP", hi: "🔑 OTP अनुरोध", es: "🔑 Solicitar OTP", ar: "🔑 طلب OTP" },
  ml_next_number: { en: "➡️ Next Number", hi: "➡️ अगला नंबर", es: "➡️ Siguiente Número", ar: "➡️ الرقم التالي" },
  ml_otp_requested: { en: "🔑 *OTP Requested!*\n\nAdmin has been notified.\nYou'll receive OTP + 2FA code shortly.\n\n⏱️ *Please wait 1-5 minutes*", hi: "🔑 *OTP अनुरोध किया!*\n\nएडमिन को सूचित किया गया।\nआपको जल्द OTP + 2FA कोड मिलेगा।\n\n⏱️ *कृपया 1-5 मिनट प्रतीक्षा करें*", es: "🔑 *¡OTP Solicitado!*\n\nEl admin ha sido notificado.\nRecibirás OTP + código 2FA pronto.\n\n⏱️ *Espera 1-5 minutos*", ar: "🔑 *تم طلب OTP!*\n\nتم إعلام المشرف.\nستتلقى OTP + رمز 2FA قريباً.\n\n⏱️ *انتظر 1-5 دقائق*" },
  ml_no_numbers: { en: "❌ No phone numbers found for this order.", hi: "❌ इस ऑर्डर के लिए कोई नंबर नहीं मिला।", es: "❌ No se encontraron números para este pedido.", ar: "❌ لا توجد أرقام لهذا الطلب." },
  ml_done: { en: "✅ *All numbers shown!*\n\nNo more numbers in this order.", hi: "✅ *सभी नंबर दिखाए गए!*\n\nइस ऑर्डर में और नंबर नहीं।", es: "✅ *¡Todos los números mostrados!*\n\nNo hay más números en este pedido.", ar: "✅ *تم عرض جميع الأرقام!*\n\nلا مزيد من الأرقام في هذا الطلب." },
};

function t(key: string, lang: Lang): string {
  return translations[key]?.[lang] || translations[key]?.en || key;
}

function getMainKeyboard(lang: Lang) {
  return {
    keyboard: [
      [{ text: t("kb_buy", lang) }, { text: t("kb_orders", lang) }],
      [{ text: t("kb_reorder", lang) }, { text: t("kb_guide", lang) }],
      [{ text: t("kb_login", lang) }, { text: t("kb_refer", lang) }],
      [{ text: t("kb_support", lang) }, { text: t("kb_language", lang) }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

async function sendMsg(botToken: string, chatId: string, text: string, inlineMarkup?: any, lang: Lang = "en") {
  const body: any = {
    chat_id: chatId, text, parse_mode: "Markdown",
    reply_markup: inlineMarkup ? JSON.stringify(inlineMarkup) : JSON.stringify(getMainKeyboard(lang)),
  };
  return await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

async function sendPhoto(botToken: string, chatId: string, photo: string, caption: string, inlineMarkup?: any, lang: Lang = "en") {
  const body: any = {
    chat_id: chatId, photo, caption, parse_mode: "Markdown",
    reply_markup: inlineMarkup ? JSON.stringify(inlineMarkup) : JSON.stringify(getMainKeyboard(lang)),
  };
  return await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

async function answerCb(botToken: string, cbId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: cbId, text: text || "✓" }),
  });
}

async function getPricing(supabase: any): Promise<Record<string, { regular: number; aged: number; regular_usdt: number; aged_usdt: number }>> {
  try {
    const { data } = await supabase.from("country_pricing").select("country_code, regular_price, aged_price, regular_price_usdt, aged_price_usdt");
    if (data && data.length > 0) {
      const pricing: Record<string, { regular: number; aged: number; regular_usdt: number; aged_usdt: number }> = {};
      for (const row of data) pricing[row.country_code] = { regular: Number(row.regular_price), aged: Number(row.aged_price), regular_usdt: Number(row.regular_price_usdt || 0), aged_usdt: Number(row.aged_price_usdt || 0) };
      return pricing;
    }
  } catch (e) { console.error("Pricing fetch failed:", e); }
  return { IN: { regular: 50, aged: 100, regular_usdt: 0, aged_usdt: 0 }, US: { regular: 50, aged: 150, regular_usdt: 0, aged_usdt: 0 } };
}

async function getStock(supabase: any, country: string): Promise<{ regular: number; aged: number }> {
  const { data } = await supabase.from("account_inventory").select("account_type").eq("country", country).eq("status", "available");
  let regular = 0, aged = 0;
  (data || []).forEach((i: any) => { if (i.account_type === "aged") aged++; else regular++; });
  return { regular, aged };
}

async function getUserLang(supabase: any, chatId: string): Promise<Lang> {
  try {
    const { data } = await supabase.from("customers").select("preferred_language").eq("telegram_id", chatId).single();
    if (data?.preferred_language && ["en", "hi", "es", "ar"].includes(data.preferred_language)) {
      return data.preferred_language as Lang;
    }
  } catch (_) {}
  return "en";
}

function stepIndicator(step: number, lang: Lang): string {
  const steps = [t("step_country", lang), t("step_type", lang), t("step_qty", lang), t("step_pay", lang)];
  return steps.map((s, i) => i + 1 === step ? `▸ *${s}*` : i + 1 < step ? `✅ ${s}` : `○ ${s}`).join("  ");
}

function stockBadge(count: number, lang: Lang): string {
  if (count === 0) return `🔴 ${t("sold_out", lang)}`;
  if (count <= 5) return `🟡 ${count} ${t("left", lang)}`;
  return `🟢 ${count} ${t("in_stock", lang)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!BOT_TOKEN) return new Response("BOT_TOKEN not set", { status: 500 });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  await fetchCountries(supabase);

  try {
    const update = await req.json();
    const message = update.message || update.callback_query?.message;
    const callbackQuery = update.callback_query;
    const chatId = String(message?.chat?.id || callbackQuery?.from?.id);
    const rawText = (update.message?.text || "").trim();
    const callbackData = callbackQuery?.data || "";
    const username = message?.from?.username || callbackQuery?.from?.username || "unknown";
    const firstName = message?.from?.first_name || callbackQuery?.from?.first_name || "Friend";

    if (!chatId) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    if (callbackQuery) await answerCb(BOT_TOKEN, callbackQuery.id);

    // Upsert state & customer
    let { data: state } = await supabase.from("conversation_states").select("*").eq("chat_id", chatId).single();
    if (!state) {
      const { data: ns } = await supabase.from("conversation_states").insert({ chat_id: chatId, state: "idle" }).select().single();
      state = ns;
    }
    await supabase.from("customers").upsert({ telegram_id: chatId, username, first_name: firstName }, { onConflict: "telegram_id" });

    // Get user language
    const lang = await getUserLang(supabase, chatId);

    // Check if customer is blocked
    const { data: customerData } = await supabase.from("customers").select("is_blocked").eq("telegram_id", chatId).single();
    if (customerData?.is_blocked) {
      await sendMsg(BOT_TOKEN, chatId, t("blocked", lang),
        { inline_keyboard: [[{ text: t("contact_support", lang), callback_data: "support" }]] }, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Normalize input — handle both callbacks and keyboard button text (multilingual)
    let input = (callbackData || rawText).toLowerCase();
    // Map all language variants of keyboard buttons
    const buyVariants = [t("kb_buy", "en"), t("kb_buy", "hi"), t("kb_buy", "es"), t("kb_buy", "ar")].map(s => s.toLowerCase());
    const ordersVariants = [t("kb_orders", "en"), t("kb_orders", "hi"), t("kb_orders", "es"), t("kb_orders", "ar")].map(s => s.toLowerCase());
    const referVariants = [t("kb_refer", "en"), t("kb_refer", "hi"), t("kb_refer", "es"), t("kb_refer", "ar")].map(s => s.toLowerCase());
    const supportVariants = [t("kb_support", "en"), t("kb_support", "hi"), t("kb_support", "es"), t("kb_support", "ar")].map(s => s.toLowerCase());
    const guideVariants = [t("kb_guide", "en"), t("kb_guide", "hi"), t("kb_guide", "es"), t("kb_guide", "ar")].map(s => s.toLowerCase());
    const loginVariants = [t("kb_login", "en"), t("kb_login", "hi"), t("kb_login", "es"), t("kb_login", "ar")].map(s => s.toLowerCase());
    const reorderVariants = [t("kb_reorder", "en"), t("kb_reorder", "hi"), t("kb_reorder", "es"), t("kb_reorder", "ar")].map(s => s.toLowerCase());
    const langVariants = [t("kb_language", "en"), t("kb_language", "hi"), t("kb_language", "es"), t("kb_language", "ar")].map(s => s.toLowerCase());

    if (buyVariants.includes(input)) input = "start";
    if (ordersVariants.includes(input)) input = "check_status";
    if (referVariants.includes(input)) input = "/refer";
    if (supportVariants.includes(input)) input = "support";
    if (guideVariants.includes(input)) input = "/guide";
    if (loginVariants.includes(input)) input = "/manuallogin";
    if (reorderVariants.includes(input)) input = "/reorder";
    if (langVariants.includes(input)) input = "/language";

    const PRICING = await getPricing(supabase);

    // ════════════════════════════════════════════
    // 🌐 /language — Language Selection
    // ════════════════════════════════════════════
    if (input === "/language" || input === "language" || input === "set_lang") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║  ${t("lang_title", lang)}       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `${t("lang_msg", lang)}`,
        { inline_keyboard: [
          [{ text: "🇬🇧 English", callback_data: "lang_en" }, { text: "🇮🇳 हिंदी", callback_data: "lang_hi" }],
          [{ text: "🇪🇸 Español", callback_data: "lang_es" }, { text: "🇸🇦 العربية", callback_data: "lang_ar" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (input.startsWith("lang_")) {
      const newLang = input.replace("lang_", "") as Lang;
      if (["en", "hi", "es", "ar"].includes(newLang)) {
        await supabase.from("customers").update({ preferred_language: newLang }).eq("telegram_id", chatId);
        await sendMsg(BOT_TOKEN, chatId, t("lang_set", newLang), undefined, newLang);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 📸 Photo/Screenshot Handler
    // ════════════════════════════════════════════
    const photo = update.message?.photo;
    if (photo && photo.length > 0 && (state?.state === "awaiting_payment" || state?.state === "payment_review") && state?.pending_order_id) {
      const fileId = photo[photo.length - 1].file_id;
      const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");

      await supabase.from("orders").update({ status: "payment_received" }).eq("order_id", state.pending_order_id);
      await supabase.from("conversation_states").update({ state: "payment_review", updated_at: new Date().toISOString() }).eq("chat_id", chatId);

      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║   ${t("screenshot_title", lang)}     ║\n` +
        `╚═══════════════════════╝\n\n` +
        `${t("screenshot_msg", lang).replace("has been sent", `for \`${state.pending_order_id}\`\nhas been sent`)}`,
        { inline_keyboard: [
          [{ text: t("btn_track", lang), callback_data: "check_status" }],
          [{ text: t("btn_main_menu", lang), callback_data: "start" }],
        ]}, lang);

      if (ADMIN_CHAT_ID && ADMIN_BOT_TOKEN) {
        const { data: order } = await supabase.from("orders").select("*").eq("order_id", state.pending_order_id).single();
        if (order) {
          const ci = COUNTRIES.find(c => c.code === order.country);
          const { data: cust } = await supabase.from("customers").select("customer_code").eq("telegram_id", chatId).maybeSingle();
          const custCode = cust?.customer_code || "—";
          await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendPhoto`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: ADMIN_CHAT_ID, photo: fileId,
              caption: `🚨 *PAYMENT SCREENSHOT*\n\n🆔 \`${order.order_id}\`\n👤 \`${custCode}\` @${username} (${firstName})\n🌍 ${ci?.flag || ""} ${order.country}\n📦 ${order.quantity}x ${order.account_type}\n💵 *${SYMBOL}${order.amount}*`,
              parse_mode: "Markdown",
            }),
          });
          await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: ADMIN_CHAT_ID,
              text: `⚡ *Action for ${order.order_id}:*`,
              parse_mode: "Markdown",
              reply_markup: JSON.stringify({ inline_keyboard: [
                [{ text: `✅ Approve`, callback_data: `approve_${order.order_id}` },
                 { text: `❌ Reject`, callback_data: `reject_${order.order_id}` }]
              ]}),
            }),
          });
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 📢 Channel Join Check Helper
    // ════════════════════════════════════════════
    const CHANNEL_USERNAME = "riox239";

    async function checkChannelMembership(botToken: string, userId: string): Promise<boolean> {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: `@${CHANNEL_USERNAME}`, user_id: userId }),
        });
        const data = await res.json();
        const status = data?.result?.status;
        return ["member", "administrator", "creator"].includes(status);
      } catch (e) { console.error("Channel check failed:", e); return false; }
    }

    // ════════════════════════════════════════════
    // ✅ "Joined" callback — verify membership
    // ════════════════════════════════════════════
    if (input === "check_joined") {
      const isMember = await checkChannelMembership(BOT_TOKEN, chatId);
      if (!isMember) {
        await sendMsg(BOT_TOKEN, chatId, t("not_joined", lang),
          { inline_keyboard: [
            [{ text: "📢 Join Channel", url: "https://t.me/riox239" }],
            [{ text: t("btn_joined", lang), callback_data: "check_joined" }],
          ]}, lang);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      input = "start";
    }

    // ════════════════════════════════════════════
    // 🏠 /start — Welcome
    // ════════════════════════════════════════════
    if (input === "/start" || input === "hi" || input === "hello" || input === "start" || input === "menu" || input === "home") {

      // ── Channel join gate ──
      const isMember = await checkChannelMembership(BOT_TOKEN, chatId);
      if (!isMember) {
        await sendMsg(BOT_TOKEN, chatId,
          `╔═══════════════════════╗\n` +
          `║  ${t("join_channel_title", lang)}         ║\n` +
          `╚═══════════════════════╝\n\n` +
          `Hey *${firstName}*! 👋\n\n` +
          t("join_channel_msg", lang),
          { inline_keyboard: [
            [{ text: t("btn_join", lang), url: "https://t.me/riox239" }],
            [{ text: t("btn_joined", lang), callback_data: "check_joined" }],
          ]}, lang);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      // Check if first-time user — send promo video
      const { data: existingOrders } = await supabase.from("orders").select("id").eq("customer_id", chatId).limit(1);
      if (!existingOrders || existingOrders.length === 0) {
        const videoUrl = `${SUPABASE_URL}/storage/v1/object/public/bot-assets/promo-video.mp4`;
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId, video: videoUrl,
            caption: t("promo_caption", lang),
            parse_mode: "Markdown",
            supports_streaming: true,
          }),
        });
      }

      // Country buttons
      const popular = ["IN", "US", "UK", "AE"].filter(code => COUNTRIES.some(x => x.code === code));
      const popularRow = popular.map(code => {
        const c = COUNTRIES.find(x => x.code === code)!;
        return { text: `${c.flag} ${c.name}`, callback_data: `country_${c.code}` };
      });

      const rest = COUNTRIES.filter(c => !popular.includes(c.code));
      const restRows: any[][] = [];
      for (let i = 0; i < rest.length; i += 3) {
        const row = rest.slice(i, i + 3).map(c => ({ text: `${c.flag} ${c.name}`, callback_data: `country_${c.code}` }));
        restRows.push(row);
      }

      const allRows = [
        [{ text: t("btn_how_to_buy", lang), callback_data: "guide_1" }],
        popularRow,
        ...restRows,
        [{ text: t("kb_orders", lang), callback_data: "check_status" }, { text: t("btn_referrals", lang), callback_data: "/refer" }],
        [{ text: t("kb_support", lang), callback_data: "support" }],
      ];

      const bannerUrl = `${SUPABASE_URL}/storage/v1/object/public/bot-assets/welcome-banner.jpg`;

      await sendPhoto(BOT_TOKEN, chatId, bannerUrl,
        `Hey *${firstName}*! 👋 Welcome to\n\n` +
        `╔═══════════════════════╗\n` +
        `║   ${t("welcome_title", lang)}       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `${t("welcome_msg", lang)}\n\n` +
        `┌──── ✨ *Why Us?* ────┐\n` +
        `│                                                     │\n` +
        `│  ${t("welcome_stats", lang).split("\n").join("\n│  ")}\n` +
        `│                                                     │\n` +
        `└─────────────────────┘\n\n` +
        `${stepIndicator(1, lang)}\n\n` +
        t("pick_country", lang),
        { inline_keyboard: allRows }, lang);

      await supabase.from("conversation_states").update({ state: "awaiting_country", updated_at: new Date().toISOString() }).eq("chat_id", chatId);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 📖 /guide — Interactive Step-by-Step Tutorial
    // ════════════════════════════════════════════
    if (input === "/guide" || input === "guide_1") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║  📖  HOW TO BUY — GUIDE       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `*STEP 1 of 5* — 🌍 Choose Country\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `After pressing /start, you'll see\na list of 20 countries.\n\n` +
        `🔹 *Popular countries* appear first:\n` +
        `   🇮🇳 India • 🇺🇸 USA • 🇬🇧 UK • 🇦🇪 UAE\n\n` +
        `🔹 Simply *tap on your country*\n   to see pricing & availability.\n\n` +
        `💡 _Each country has different\nprices and stock levels._\n\n` +
        `▓░░░░ 1/5`,
        { inline_keyboard: [
          [{ text: "Next → Step 2 📦", callback_data: "guide_2" }],
          [{ text: "⏭️ Skip Guide — Start Buying", callback_data: "start" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (input === "guide_2") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║  📖  HOW TO BUY — GUIDE       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `*STEP 2 of 5* — 📦 Pick Account Type\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `You'll see two options:\n\n` +
        `📦 *Regular Accounts*\n` +
        `   • Fresh, newly created\n` +
        `   • Lower price\n` +
        `   • Great for general farming\n\n` +
        `👑 *Aged Accounts (6mo+)*\n` +
        `   • 6+ months old\n` +
        `   • Higher trust scores\n` +
        `   • Best for premium airdrops\n\n` +
        `🔹 Tap the button to select.\n` +
        `🔹 Stock levels shown in real-time!\n\n` +
        `▓▓░░░ 2/5`,
        { inline_keyboard: [
          [{ text: "← Step 1", callback_data: "guide_1" }, { text: "Step 3 →", callback_data: "guide_3" }],
          [{ text: "⏭️ Skip — Start Buying", callback_data: "start" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (input === "guide_3") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║  📖  HOW TO BUY — GUIDE       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `*STEP 3 of 5* — 🔢 Set Quantity\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Choose how many accounts:\n\n` +
        `🔹 *Quick buttons:*\n` +
        `   1️⃣ 2️⃣ 3️⃣ 5️⃣ 🔟 📦25 📦50 💯\n\n` +
        `🔹 Or *type any number* (1–100)\n\n` +
        `📊 A *price calculator* shows\ntotal cost for each quantity!\n\n` +
        `_Example: 10 × ₹50 = ₹500 total_\n\n` +
        `▓▓▓░░ 3/5`,
        { inline_keyboard: [
          [{ text: "← Step 2", callback_data: "guide_2" }, { text: "Step 4 →", callback_data: "guide_4" }],
          [{ text: "⏭️ Skip — Start Buying", callback_data: "start" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (input === "guide_4") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║  📖  HOW TO BUY — GUIDE       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `*STEP 4 of 5* — 💳 Make Payment\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `After confirming your order:\n\n` +
        `1️⃣ You'll see the *order summary*\n   with total amount\n\n` +
        `2️⃣ A *UPI QR code* is shown —\n   scan it with any UPI app:\n` +
        `   • Google Pay\n   • PhonePe\n   • Paytm\n\n` +
        `3️⃣ Pay the exact amount shown\n\n` +
        `4️⃣ *Send a screenshot* 📸 of your\n   payment for faster verification!\n\n` +
        `5️⃣ Tap *"✅ I Have Paid"*\n\n` +
        `▓▓▓▓░ 4/5`,
        { inline_keyboard: [
          [{ text: "← Step 3", callback_data: "guide_3" }, { text: "Step 5 →", callback_data: "guide_5" }],
          [{ text: "⏭️ Skip — Start Buying", callback_data: "start" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (input === "guide_5") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║  📖  HOW TO BUY — GUIDE       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `*STEP 5 of 5* — 📥 Get Your Accounts!\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `After payment verification:\n\n` +
        `✅ Admin approves your order\n` +
        `📥 Accounts are *delivered right here*\n   in this chat as a file!\n\n` +
        `⏱️ *Typical wait: 5–15 minutes*\n\n` +
        `📊 Track anytime: tap *"My Orders"*\n   or type /status\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎉 *That's it! Super easy!*\n\n` +
        `Ready to buy your first accounts?\nTap the button below! 🚀\n\n` +
        `▓▓▓▓▓ 5/5 ✅`,
        { inline_keyboard: [
          [{ text: "🛒 Start Buying Now!", callback_data: "start" }],
          [{ text: "← Back to Step 4", callback_data: "guide_4" }],
          [{ text: "📲 How to Login Accounts", callback_data: "login_guide" }],
          [{ text: "🎬 Watch Promo Video", callback_data: "watch_promo" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 📲 Login Guide
    // ════════════════════════════════════════════
    if (input === "/loginguide" || input === "login_guide") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║  📲  LOGIN GUIDE                       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `*How to Login Accounts Using*\n*the ZIP File You Received:*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*Step 1:* 🤖 Start the login bot\n` +
        `   👉 Open @NewLonamiBot\n\n` +
        `*Step 2:* 📖 Click on *"Read OTP"*\n\n` +
        `*Step 3:* 📁 Send the *ZIP file*\n   you received from us\n\n` +
        `*Step 4:* 📱 You'll get a phone number\n` +
        `   → Enter it in your Telegram app\n` +
        `   → Send OTP from your app\n` +
        `   → *Only after sending*, click\n     *"OTP 💑"* in the bot\n` +
        `   → Copy the OTP, paste it\n` +
        `   → Enter the password: \`123\`\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `⚠️ *IMPORTANT NOTE:*\n` +
        `Click on OTP *only after* you've\nsent the code from your app!\n\n` +
        `🔐 *2-Step Password:* \`123\`\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━`,
        { inline_keyboard: [
          [{ text: "🤖 Open Login Bot", url: "https://t.me/NewLonamiBot" }],
          [{ text: t("btn_buy", lang), callback_data: "start" }],
          [{ text: "📖 Buying Guide", callback_data: "guide_1" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Watch promo video
    if (input === "watch_promo" || input === "/video") {
      const videoUrl = `${SUPABASE_URL}/storage/v1/object/public/bot-assets/promo-video.mp4`;
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId, video: videoUrl,
          caption: `🎬 *RIOX ACCOUNTS PRO*\n\nPremium Telegram accounts — instant delivery, guaranteed quality!\n\nReady to start? 👇`,
          parse_mode: "Markdown",
          supports_streaming: true,
          reply_markup: JSON.stringify({ inline_keyboard: [
            [{ text: t("btn_buy", lang), callback_data: "start" }],
            [{ text: "📖 Step-by-Step Guide", callback_data: "guide_1" }],
          ]}),
        }),
      });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 🌍 Country Selection
    // ════════════════════════════════════════════
    if (input.startsWith("country_")) {
      const code = input.replace("country_", "").toUpperCase();
      const country = COUNTRIES.find(c => c.code === code);
      if (!country) {
        await sendMsg(BOT_TOKEN, chatId, "❌ Invalid country.", { inline_keyboard: [[{ text: t("btn_main_menu", lang), callback_data: "start" }]] }, lang);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const pricing = PRICING[code] || { regular: 50, aged: 100 };
      const stock = await getStock(supabase, code);

      await supabase.from("conversation_states").update({ state: "awaiting_type", selected_country: code, updated_at: new Date().toISOString() }).eq("chat_id", chatId);

      const regNote = stock.regular > 20 ? "" : stock.regular > 0 ? `\n│  ⚠️ _${t("limited_stock", lang)}_` : `\n│  🚫 _${t("currently_unavailable", lang)}_`;
      const agedNote = stock.aged > 20 ? "" : stock.aged > 0 ? `\n│  ⚠️ _${t("limited_stock", lang)}_` : `\n│  🚫 _${t("currently_unavailable", lang)}_`;

      await sendMsg(BOT_TOKEN, chatId,
        `${country.flag} *${country.name}*\n\n` +
        `${stepIndicator(2, lang)}\n\n` +
        `╔═══ ${t("regular", lang)} ═══╗\n` +
        `║                                                  ║\n` +
        `║  💰 *${SYMBOL}${pricing.regular}* ${t("per_account", lang)}           ║\n` +
        `║  📊 ${stockBadge(stock.regular, lang)}               ║\n` +
        `║  ✓ ${t("fresh_accounts", lang)}                       ║\n` +
        `║  ✓ ${t("ready_to_use", lang)}                           ║${regNote}\n` +
        `║                                                  ║\n` +
        `╠═══ ${t("aged", lang)} ═══╣\n` +
        `║                                                  ║\n` +
        `║  💰 *${SYMBOL}${pricing.aged}* ${t("per_account", lang)}             ║\n` +
        `║  📊 ${stockBadge(stock.aged, lang)}                 ║\n` +
        `║  ✓ ${t("months_old", lang)}                         ║\n` +
        `║  ✓ ${t("higher_trust", lang)}                   ║\n` +
        `║  ✓ ${t("best_premium", lang)}          ║${agedNote}\n` +
        `║                                                  ║\n` +
        `╚══════════════════╝\n\n` +
        t("select_type", lang),
        { inline_keyboard: [
          ...(stock.regular > 0 ? [[{ text: `📦 Regular — ${SYMBOL}${pricing.regular}/acc`, callback_data: "type_regular" }]] : [[{ text: t("notify_regular", lang), callback_data: `alert_stock_${code}_regular` }]]),
          ...(stock.aged > 0 ? [[{ text: `👑 Aged — ${SYMBOL}${pricing.aged}/acc`, callback_data: "type_aged" }]] : [[{ text: t("notify_aged", lang), callback_data: `alert_stock_${code}_aged` }]]),
          [{ text: t("change_country", lang), callback_data: "start" }, { text: t("btn_menu", lang), callback_data: "home" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 📦 Type Selection → Quantity
    // ════════════════════════════════════════════
    if (input === "type_regular" || input === "type_aged") {
      const type = input === "type_aged" ? "aged" : "regular";
      const selectedCountry = state?.selected_country || "IN";
      const pricing = PRICING[selectedCountry] || { regular: 50, aged: 100 };
      const price = pricing[type as "regular" | "aged"];
      const label = type === "aged" ? "👑 Aged" : "📦 Regular";
      const country = COUNTRIES.find(c => c.code === selectedCountry);

      await supabase.from("conversation_states").update({ state: "awaiting_quantity", selected_type: type, updated_at: new Date().toISOString() }).eq("chat_id", chatId);

      await sendMsg(BOT_TOKEN, chatId,
        `${country?.flag || ""} *${country?.name}* → ${label}\n\n` +
        `${stepIndicator(3, lang)}\n\n` +
        `💰 Price: *${SYMBOL}${price}* ${t("per_account", lang)}\n\n` +
        `╔══════════════════╗\n` +
        `║  ${t("price_calc", lang)}          ║\n` +
        `╠══════════════════╣\n` +
        `║  1 acc  →  ${SYMBOL}${price}                         ║\n` +
        `║  5 acc  →  ${SYMBOL}${price * 5}                     ║\n` +
        `║  10 acc →  ${SYMBOL}${price * 10}                   ║\n` +
        `║  25 acc →  ${SYMBOL}${price * 25}                   ║\n` +
        `║  50 acc →  ${SYMBOL}${price * 50}                   ║\n` +
        `║  100 acc → ${SYMBOL}${price * 100}                 ║\n` +
        `╚══════════════════╝\n\n` +
        t("how_many", lang),
        { inline_keyboard: [
          [{ text: "1️⃣ 1", callback_data: "qty_1" }, { text: "2️⃣ 2", callback_data: "qty_2" }, { text: "3️⃣ 3", callback_data: "qty_3" }, { text: "5️⃣ 5", callback_data: "qty_5" }],
          [{ text: "🔟 10", callback_data: "qty_10" }, { text: "📦 25", callback_data: "qty_25" }, { text: "📦 50", callback_data: "qty_50" }, { text: "💯 100", callback_data: "qty_100" }],
          [{ text: t("change_type", lang), callback_data: `country_${selectedCountry}` }, { text: t("btn_menu", lang), callback_data: "home" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 🔢 Quantity — Quick Buttons
    // ════════════════════════════════════════════
    if (input.startsWith("qty_")) {
      const qty = parseInt(input.replace("qty_", ""));
      if (!isNaN(qty) && qty >= 1 && qty <= 100) {
        return await processQuantity(qty, state, chatId, username, firstName, supabase, BOT_TOKEN, PRICING, ADMIN_CHAT_ID, lang);
      }
    }

    // ════════════════════════════════════════════
    // 🔢 Quantity — Manual Input
    // ════════════════════════════════════════════
    if (state?.state === "awaiting_quantity") {
      const qty = parseInt(input);
      if (isNaN(qty) || qty < 1 || qty > 100) {
        await sendMsg(BOT_TOKEN, chatId, t("invalid_qty", lang),
          { inline_keyboard: [[{ text: t("go_back", lang), callback_data: `country_${state.selected_country || "IN"}` }]] }, lang);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      return await processQuantity(qty, state, chatId, username, firstName, supabase, BOT_TOKEN, PRICING, ADMIN_CHAT_ID, lang);
    }

    // ════════════════════════════════════════════
    // 💳 Payment Method Selection
    // ════════════════════════════════════════════
    if (input.startsWith("pay_upi_")) {
      const orderId = input.replace("pay_upi_", "").toUpperCase();
      await supabase.from("orders").update({ payment_method: "UPI" }).eq("order_id", orderId);
      await handleUpiPayment(orderId, chatId, BOT_TOKEN, supabase, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (input.startsWith("pay_crypto_")) {
      const orderId = input.replace("pay_crypto_", "").toUpperCase();
      await supabase.from("orders").update({ payment_method: "Crypto" }).eq("order_id", orderId);
      await handleCryptoPayment(orderId, chatId, BOT_TOKEN, supabase, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // ✅ Payment Confirmation
    // ════════════════════════════════════════════
    if (input === "paid" || input.includes("i have paid") || input.includes("payment done") || input.includes("paid done")) {
      if (state?.pending_order_id) {
        await supabase.from("orders").update({ status: "payment_received" }).eq("order_id", state.pending_order_id);
        await supabase.from("conversation_states").update({ state: "payment_review", updated_at: new Date().toISOString() }).eq("chat_id", chatId);

        await sendMsg(BOT_TOKEN, chatId,
          `╔═══════════════════════╗\n` +
          `║   ${t("payment_received_title", lang)}           ║\n` +
          `╚═══════════════════════╝\n\n` +
          `🆔 Order: \`${state.pending_order_id}\`\n\n` +
          t("payment_next", lang),
          { inline_keyboard: [
            [{ text: t("btn_track", lang), callback_data: "check_status" }],
            [{ text: t("btn_main_menu", lang), callback_data: "start" }],
          ]}, lang);

        // Notify admin
        const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
        if (ADMIN_CHAT_ID && ADMIN_BOT_TOKEN) {
          const { data: order } = await supabase.from("orders").select("*").eq("order_id", state.pending_order_id).single();
          if (order) {
            const ci = COUNTRIES.find(c => c.code === order.country);
            await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: ADMIN_CHAT_ID,
                text: `🚨 *PAYMENT CLAIMED*\n\n🆔 \`${order.order_id}\`\n👤 @${username} (${firstName})\n🌍 ${ci?.flag || ""} ${order.country}\n📦 ${order.quantity}x ${order.account_type}\n💵 *${SYMBOL}${order.amount}*\n\n⚠️ No screenshot sent — please verify!`,
                parse_mode: "Markdown",
                reply_markup: JSON.stringify({ inline_keyboard: [
                  [{ text: `✅ Approve`, callback_data: `approve_${order.order_id}` },
                   { text: `❌ Reject`, callback_data: `reject_${order.order_id}` }]
                ]}),
              }),
            });
          }
        }
      } else {
        await sendMsg(BOT_TOKEN, chatId, "❓ No pending order.", { inline_keyboard: [[{ text: t("btn_new_order", lang), callback_data: "start" }]] }, lang);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // ❌ Cancel Order
    // ════════════════════════════════════════════
    if (input === "cancel") {
      if (state?.pending_order_id) {
        await supabase.from("orders").update({ status: "cancelled" }).eq("order_id", state.pending_order_id);
        await sendMsg(BOT_TOKEN, chatId, t("cancelled", lang), undefined, lang);
      } else {
        await sendMsg(BOT_TOKEN, chatId, t("no_cancel", lang), undefined, lang);
      }
      await supabase.from("conversation_states").update({ state: "idle", pending_order_id: null, updated_at: new Date().toISOString() }).eq("chat_id", chatId);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 📊 My Orders
    // ════════════════════════════════════════════
    if (input === "/status" || input === "check_status" || input === "/myorders") {
      const limit = input === "/myorders" ? 20 : 5;
      const { data: orders } = await supabase.from("orders").select("*").eq("customer_id", chatId).order("created_at", { ascending: false }).limit(limit);

      if (orders && orders.length > 0) {
        const statusLabels: Record<string, string> = {
          payment_received: t("status_review", lang), delivered: t("status_delivered", lang),
          approved: t("status_approved", lang), rejected: t("status_rejected", lang),
          cancelled: t("status_cancelled", lang), pending: t("status_pending", lang),
        };

        let msg = `╔═══════════════════════╗\n║   ${t("orders_title", lang)}                    ║\n╚═══════════════════════╝\n\n`;
        let totalSpent = 0, delivered = 0;

        for (const o of orders) {
          const emoji = o.status === "delivered" ? "🟢" : o.status === "pending" ? "🟡" : o.status === "payment_received" ? "🔵" : o.status === "approved" ? "🟢" : o.status === "rejected" ? "🔴" : "⚪";
          const ci = COUNTRIES.find(c => c.code === o.country);
          const date = new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

          msg += `${emoji} \`${o.order_id}\` • ${date}\n`;
          msg += `    ${ci?.flag || "🌍"} ${o.quantity}× ${o.account_type} — *${SYMBOL}${o.amount}*\n`;
          msg += `    Status: *${statusLabels[o.status] || o.status}*\n\n`;

          if (o.status === "delivered") { totalSpent += o.amount; delivered++; }
        }

        msg += `┌─────────────────────┐\n`;
        msg += `│ 📈 ${orders.length} ${t("orders_total", lang)} │ ✅ ${delivered} ${t("orders_delivered", lang)} │\n`;
        msg += `│ 💰 ${t("total_spent", lang)}: *${SYMBOL}${totalSpent}*    │\n`;
        msg += `└─────────────────────┘`;

        await sendMsg(BOT_TOKEN, chatId, msg, { inline_keyboard: [
          [{ text: t("btn_refresh", lang), callback_data: "check_status" }, { text: t("btn_full_history", lang), callback_data: "/myorders" }],
          [{ text: t("btn_reorder_last", lang), callback_data: "/reorder" }],
          [{ text: t("btn_new_order", lang), callback_data: "start" }, { text: t("btn_menu", lang), callback_data: "home" }],
        ]}, lang);
      } else {
        await sendMsg(BOT_TOKEN, chatId, t("no_orders", lang),
          { inline_keyboard: [[{ text: t("btn_buy_first", lang), callback_data: "start" }]] }, lang);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 🔍 /track ORDER_ID
    // ════════════════════════════════════════════
    if (input.startsWith("/track ") || input.startsWith("track_")) {
      const trackId = input.startsWith("track_") ? input.replace("track_", "").toUpperCase() : input.replace("/track ", "").toUpperCase();
      
      const { data: order } = await supabase.from("orders").select("*").eq("order_id", trackId).eq("customer_id", chatId).single();
      
      if (!order) {
        await sendMsg(BOT_TOKEN, chatId, t("track_not_found", lang),
          { inline_keyboard: [
            [{ text: t("kb_orders", lang), callback_data: "check_status" }],
            [{ text: t("btn_menu", lang), callback_data: "home" }],
          ]}, lang);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const ci = COUNTRIES.find(c => c.code === order.country);
      const createdDate = new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const deliveredDate = order.delivered_at ? new Date(order.delivered_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

      const statusEmoji: Record<string, string> = { pending: "🟡", payment_received: "🔵", approved: "🟢", delivered: "✅", rejected: "🔴", cancelled: "⚪" };
      const statusLabel: Record<string, string> = { 
        pending: t("status_pending", lang), payment_received: t("status_review", lang), 
        approved: t("status_approved", lang), delivered: t("status_delivered", lang), 
        rejected: t("status_rejected", lang), cancelled: t("status_cancelled", lang) 
      };

      const steps = [t("prog_ordered", lang), t("prog_paid", lang), t("prog_verified", lang), t("prog_delivered", lang)];
      const stepMap: Record<string, number> = { pending: 1, payment_received: 2, approved: 3, delivered: 4, rejected: 2, cancelled: 0 };
      const currentStep = stepMap[order.status] || 0;
      const progress = steps.map((s, i) => i < currentStep ? `✅ ${s}` : i === currentStep ? `▸ *${s}*` : `○ ${s}`).join(" → ");

      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║   ${t("track_title", lang)}               ║\n` +
        `╚═══════════════════════╝\n\n` +
        `🆔 Order: \`${order.order_id}\`\n\n` +
        `┌─── 📦 *${t("details", lang)}* ───┐\n` +
        `│  ${ci?.flag || "🌍"} Country: *${ci?.name || order.country}*\n` +
        `│  📦 Type: *${order.account_type}*\n` +
        `│  🔢 Qty: *${order.quantity}* accounts\n` +
        `│  💰 Amount: *${SYMBOL}${order.amount}*\n` +
        `│  💳 Payment: ${order.payment_method || "—"}\n` +
        `└─────────────────────┘\n\n` +
        `${statusEmoji[order.status] || "⚪"} Status: *${statusLabel[order.status] || order.status}*\n\n` +
        `📊 *${t("progress", lang)}:*\n${progress}\n\n` +
        `📅 ${t("ordered_on", lang)}: ${createdDate}\n` +
        `📥 ${t("delivered_on", lang)}: ${deliveredDate}`,
        { inline_keyboard: [
          [{ text: t("btn_refresh", lang), callback_data: `track_${order.order_id}` }],
          [{ text: t("btn_all_orders", lang), callback_data: "check_status" }],
          [{ text: t("btn_new_order", lang), callback_data: "start" }, { text: t("btn_menu", lang), callback_data: "home" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 🔄 Reorder
    // ════════════════════════════════════════════
    if (input === "/reorder" || input === "reorder") {
      const { data: lastOrder } = await supabase.from("orders").select("*")
        .eq("customer_id", chatId).eq("status", "delivered")
        .order("created_at", { ascending: false }).limit(1).single();

      if (!lastOrder) {
        await sendMsg(BOT_TOKEN, chatId, t("no_prev_orders", lang),
          { inline_keyboard: [[{ text: t("btn_buy", lang), callback_data: "start" }]] }, lang);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const ci = COUNTRIES.find(c => c.code === lastOrder.country);
      const type = lastOrder.account_type?.toLowerCase() === "aged" ? "aged" : "regular";
      const pricing = PRICING[lastOrder.country] || { regular: 50, aged: 100 };
      const price = pricing[type as "regular" | "aged"];
      const total = price * lastOrder.quantity;
      const label = type === "aged" ? "👑 Aged" : "📦 Regular";

      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║   ${t("reorder_title", lang)}                 ║\n` +
        `╚═══════════════════════╝\n\n` +
        `${t("reorder_last", lang)}\n\n` +
        `┌─── 📦 *${t("details", lang)}* ───┐\n` +
        `│  ${ci?.flag || "🌍"} *${ci?.name || lastOrder.country}*\n` +
        `│  ${label}\n` +
        `│  🔢 *${lastOrder.quantity}* accounts\n` +
        `│  💰 *${SYMBOL}${total}* total\n` +
        `└─────────────────────┘\n\n` +
        t("reorder_confirm", lang),
        { inline_keyboard: [
          [{ text: `${t("btn_reorder", lang)} — ${SYMBOL}${total}`, callback_data: `reorder_confirm_${lastOrder.country}_${type}_${lastOrder.quantity}` }],
          [{ text: t("btn_modify", lang), callback_data: `country_${lastOrder.country}` }],
          [{ text: t("btn_new_order", lang), callback_data: "start" }, { text: t("btn_menu", lang), callback_data: "home" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Handle reorder confirmation
    if (input.startsWith("reorder_confirm_")) {
      const parts = input.replace("reorder_confirm_", "").split("_");
      const reCountry = parts[0].toUpperCase();
      const reType = parts[1] || "regular";
      const reQty = parseInt(parts[2]) || 1;

      await supabase.from("conversation_states").update({
        state: "awaiting_quantity", selected_country: reCountry, selected_type: reType, updated_at: new Date().toISOString(),
      }).eq("chat_id", chatId);

      const { data: updatedState } = await supabase.from("conversation_states").select("*").eq("chat_id", chatId).single();
      return await processQuantity(reQty, updatedState, chatId, username, firstName, supabase, BOT_TOKEN, PRICING, ADMIN_CHAT_ID, lang);
    }

    // ════════════════════════════════════════════
    // 🔔 Stock Alert Subscription
    // ════════════════════════════════════════════
    if (input.startsWith("alert_stock_")) {
      const parts = input.replace("alert_stock_", "").split("_");
      const alertCountry = parts[0].toUpperCase();
      const alertType = parts[1] || "regular";
      const ci = COUNTRIES.find(c => c.code === alertCountry);

      await supabase.from("stock_alerts").upsert({
        chat_id: chatId, country: alertCountry, account_type: alertType, notified: false,
      }, { onConflict: "chat_id,country,account_type" });

      await sendMsg(BOT_TOKEN, chatId,
        `${t("stock_alert_set", lang).replace("stock is back", `${ci?.flag || "🌍"} *${ci?.name || alertCountry}* — ${alertType === "aged" ? "👑 Aged" : "📦 Regular"}\nis back in stock`)}`,
        { inline_keyboard: [
          [{ text: t("btn_browse", lang), callback_data: "start" }],
          [{ text: t("btn_menu", lang), callback_data: "home" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 🎁 Referral Program
    // ════════════════════════════════════════════
    if (input === "/refer") {
      let { data: customer } = await supabase.from("customers").select("referral_code").eq("telegram_id", chatId).single();
      let refCode = customer?.referral_code;
      if (!refCode) {
        refCode = "REF" + chatId.slice(-6) + Math.random().toString(36).slice(-3).toUpperCase();
        await supabase.from("customers").update({ referral_code: refCode }).eq("telegram_id", chatId);
      }

      const { data: refs } = await supabase.from("referrals").select("commission").eq("referrer_telegram_id", chatId);
      const totalEarned = (refs || []).reduce((s: number, r: any) => s + (r.commission || 0), 0);
      const totalRefs = refs?.length || 0;

      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║   ${t("referral_title", lang)}           ║\n` +
        `╚═══════════════════════╝\n\n` +
        `${t("referral_earn", lang)}\n\n` +
        `┌──── 📊 *${t("your_stats", lang)}* ────┐\n` +
        `│  👥 ${t("referrals_count", lang)}: *${totalRefs}*                   │\n` +
        `│  💰 ${t("earned", lang)}: *${SYMBOL}${totalEarned}*               │\n` +
        `└─────────────────────┘\n\n` +
        `${t("your_link", lang)}\n\`https://t.me/airdro12pbot?start=${refCode}\`\n\n` +
        `📋 *Code:* \`${refCode}\`\n\n` +
        t("how_it_works", lang),
        { inline_keyboard: [
          [{ text: t("btn_back_shop", lang), callback_data: "start" }, { text: t("btn_menu", lang), callback_data: "home" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 🧑‍💻 Support
    // ════════════════════════════════════════════
    if (input.includes("support") || input.includes("human") || input.includes("help me") || input === "/support" || input === "/help") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║   ${t("support_title", lang)}          ║\n` +
        `╚═══════════════════════╝\n\n` +
        t("support_msg", lang),
        { inline_keyboard: [
          [{ text: t("btn_check_status", lang), callback_data: "check_status" }],
          [{ text: t("btn_place_order", lang), callback_data: "start" }],
          [{ text: t("btn_referral", lang), callback_data: "/refer" }],
          [{ text: t("btn_main_menu", lang), callback_data: "home" }],
        ]}, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 📲 Manual Login — Show delivered orders
    // ════════════════════════════════════════════
    if (input === "/manuallogin" || input === "manual_login") {
      const { data: deliveredOrders } = await supabase.from("orders").select("*")
        .eq("customer_id", chatId).eq("status", "delivered")
        .order("created_at", { ascending: false }).limit(10);

      if (!deliveredOrders || deliveredOrders.length === 0) {
        await sendMsg(BOT_TOKEN, chatId, t("ml_no_orders", lang),
          { inline_keyboard: [[{ text: t("btn_buy", lang), callback_data: "start" }]] }, lang);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      let msg = `╔═══════════════════════╗\n` +
        `║   ${t("ml_title", lang)}               ║\n` +
        `╚═══════════════════════╝\n\n` +
        `${t("ml_select_order", lang)}\n\n`;

      const buttons: any[][] = [];
      for (const o of deliveredOrders) {
        const ci = COUNTRIES.find(c => c.code === o.country);
        const date = new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        msg += `🆔 \`${o.order_id}\` • ${ci?.flag || "🌍"} ${o.quantity}× ${o.account_type} • ${date}\n`;
        buttons.push([{ text: `📲 ${o.order_id} — ${ci?.flag || "🌍"} ${o.quantity}× ${o.account_type}`, callback_data: `ml_order_${o.order_id}_0` }]);
      }
      buttons.push([{ text: t("btn_main_menu", lang), callback_data: "home" }]);

      await sendMsg(BOT_TOKEN, chatId, msg, { inline_keyboard: buttons }, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 📲 Manual Login — Show number from order
    // ════════════════════════════════════════════
    if (input.startsWith("ml_order_")) {
      const parts = input.replace("ml_order_", "").split("_");
      const orderId = parts[0].toUpperCase();
      const index = parseInt(parts[1]) || 0;

      // Get allocated inventory for this order
      const { data: inventory } = await supabase.from("account_inventory").select("*")
        .eq("order_id", orderId).order("created_at");

      if (!inventory || inventory.length === 0) {
        await sendMsg(BOT_TOKEN, chatId, t("ml_no_numbers", lang),
          { inline_keyboard: [[{ text: t("btn_main_menu", lang), callback_data: "home" }]] }, lang);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      if (index >= inventory.length) {
        await sendMsg(BOT_TOKEN, chatId, t("ml_done", lang),
          { inline_keyboard: [
            [{ text: "🔄 Start Over", callback_data: `ml_order_${orderId}_0` }],
            [{ text: t("btn_main_menu", lang), callback_data: "home" }],
          ] }, lang);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const item = inventory[index];
      // Extract phone number from file_name (assuming format: +1234567890.session or number.tdata etc)
      const phoneNumber = item.file_name.replace(/\.(session|zip|tdata|txt|json)$/i, "").trim();

      const buttons: any[][] = [
        [{ text: `${t("ml_request_otp", lang)} 🔑`, callback_data: `ml_reqotp_${orderId}_${index}_${item.id}` }],
      ];
      if (index + 1 < inventory.length) {
        buttons.push([{ text: `${t("ml_next_number", lang)} (${index + 2}/${inventory.length})`, callback_data: `ml_order_${orderId}_${index + 1}` }]);
      }
      buttons.push([{ text: "📲 Back to Orders", callback_data: "manual_login" }]);
      buttons.push([{ text: t("btn_main_menu", lang), callback_data: "home" }]);

      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║   ${t("ml_title", lang)}               ║\n` +
        `╚═══════════════════════╝\n\n` +
        `🆔 Order: \`${orderId}\`\n` +
        `📊 Number *${index + 1}* of *${inventory.length}*\n\n` +
        `${t("ml_number", lang)}\n\`${phoneNumber}\`\n\n` +
        `_Enter this number in Telegram app,\nthen tap "Request OTP" below._`,
        { inline_keyboard: buttons }, lang);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 🔑 Request OTP — Notify Admin
    // ════════════════════════════════════════════
    if (input.startsWith("ml_reqotp_")) {
      const parts = input.replace("ml_reqotp_", "").split("_");
      const orderId = parts[0].toUpperCase();
      const index = parseInt(parts[1]) || 0;
      const inventoryId = parts[2];

      // Get inventory item
      const { data: item } = await supabase.from("account_inventory").select("*").eq("id", inventoryId).single();
      const phoneNumber = item ? item.file_name.replace(/\.(session|zip|tdata|txt|json)$/i, "").trim() : "Unknown";

      // Create login request
      const { data: loginReq } = await supabase.from("login_requests").insert({
        customer_chat_id: chatId,
        order_id: orderId,
        phone_number: phoneNumber,
        inventory_id: inventoryId,
        status: "pending",
      }).select().single();

      // Notify customer
      await sendMsg(BOT_TOKEN, chatId, t("ml_otp_requested", lang),
        { inline_keyboard: [
          ...(index + 1 < 100 ? [[{ text: t("ml_next_number", lang), callback_data: `ml_order_${orderId}_${index + 1}` }]] : []),
          [{ text: t("btn_main_menu", lang), callback_data: "home" }],
        ] }, lang);

      // Notify admin
      const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
      if (ADMIN_CHAT_ID && ADMIN_BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: `🔑 *OTP REQUEST*\n\n` +
              `👤 @${username} (${firstName})\n` +
              `🆔 Order: \`${orderId}\`\n` +
              `📱 Number: \`${phoneNumber}\`\n` +
              `🔗 Request ID: \`${loginReq?.id || "N/A"}\`\n\n` +
              `Reply with:\n\`/sendotp ${loginReq?.id} OTP_CODE 2FA_CODE\``,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [
              [{ text: "✅ Send OTP", callback_data: `admin_sendotp_${loginReq?.id}` }],
            ]}),
          }),
        });
      }

      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 🏠 Fallback — Main Menu
    // ════════════════════════════════════════════
    await sendMsg(BOT_TOKEN, chatId,
      `╔═══════════════════════╗\n` +
      `║   ${t("welcome_title", lang)}       ║\n` +
      `╚═══════════════════════╝\n\n` +
      `Hey *${firstName}*! 👋\n\n${t("fallback_msg", lang)}`,
      { inline_keyboard: [
        [{ text: t("btn_buy", lang), callback_data: "start" }],
        [{ text: t("kb_orders", lang), callback_data: "check_status" }, { text: t("btn_referrals", lang), callback_data: "/refer" }],
        [{ text: t("kb_support", lang), callback_data: "support" }],
      ]}, lang);
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

  } catch (error) {
    console.error("Bot error:", error);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }
});

// ════════════════════════════════════════════
// Process Quantity & Create Order
// ════════════════════════════════════════════
async function processQuantity(qty: number, state: any, chatId: string, username: string, firstName: string, supabase: any, BOT_TOKEN: string, PRICING: any, ADMIN_CHAT_ID?: string, lang: Lang = "en") {
  const type = state?.selected_type || "regular";
  const country = state?.selected_country || "IN";
  const ci = COUNTRIES.find(c => c.code === country);
  const pricing = PRICING[country] || { regular: 50, aged: 100 };
  const pricePerAcc = pricing[type as "regular" | "aged"];
  const totalPrice = qty * pricePerAcc;
  const label = type === "aged" ? "👑 Aged" : "📦 Regular";
  const orderId = "ORD" + Date.now().toString().slice(-6);

  await supabase.from("orders").insert({
    order_id: orderId, customer_id: chatId, username, country,
    account_type: type === "aged" ? "Aged" : "Regular",
    quantity: qty, currency: "INR", amount: totalPrice, status: "pending",
  });

  await supabase.from("conversation_states").update({
    state: "awaiting_payment", selected_quantity: qty, pending_order_id: orderId, updated_at: new Date().toISOString(),
  }).eq("chat_id", chatId);

  await sendMsg(BOT_TOKEN, chatId,
    `╔═══════════════════════╗\n` +
    `║   ${t("order_created", lang)}                ║\n` +
    `╚═══════════════════════╝\n\n` +
    `${stepIndicator(4, lang)}\n\n` +
    `🆔 *Order:* \`${orderId}\`\n\n` +
    `┌─── 🧾 *${t("details", lang)}* ───┐\n` +
    `│                                                │\n` +
    `│  🌍 ${ci?.flag || ""} *${ci?.name || country}*             │\n` +
    `│  📦 ${label}                              │\n` +
    `│  🔢 *${qty}* account${qty > 1 ? "s" : ""}                    │\n` +
    `│  💵 ${SYMBOL}${pricePerAcc} × ${qty}                  │\n` +
    `│                                                │\n` +
    `│  ━━━━━━━━━━━━━━━━━━       │\n` +
    `│  💰 *${t("total", lang)}: ${SYMBOL}${totalPrice.toLocaleString()}*       │\n` +
    `│                                                │\n` +
    `└─────────────────────┘\n\n` +
    t("choose_payment", lang),
    { inline_keyboard: [
      [{ text: t("btn_upi", lang), callback_data: `pay_upi_${orderId}` }],
      [{ text: t("btn_crypto", lang), callback_data: `pay_crypto_${orderId}` }],
      [{ text: t("btn_cancel", lang), callback_data: "cancel" }],
    ]}, lang);

  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
}

// ════════════════════════════════════════════
// 💳 UPI Payment Handler
// ════════════════════════════════════════════
async function handleUpiPayment(orderId: string, chatId: string, BOT_TOKEN: string, supabase: any, lang: Lang = "en") {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const { data: order } = await supabase.from("orders").select("amount").eq("order_id", orderId).single();
  if (!order) return;

  const { data: upiWallets } = await supabase.from("upi_wallets").select("*").eq("is_active", true).order("created_at").limit(1);
  const upiId = upiWallets && upiWallets.length > 0 ? upiWallets[0].upi_id : "venkat342@fam";
  const upiName = upiWallets && upiWallets.length > 0 ? upiWallets[0].display_name : "";

  const qrUrl = `${SUPABASE_URL}/storage/v1/object/public/bot-assets/upi-scanner.jpg`;
  await sendPhoto(BOT_TOKEN, chatId, qrUrl,
    `${t("upi_title", lang)}\n\n` +
    `📱 UPI ID: \`${upiId}\`\n` +
    (upiName ? `👤 Name: ${upiName}\n` : "") +
    `💰 Amount: *${SYMBOL}${order.amount.toLocaleString()}*\n\n` +
    t("upi_scan", lang),
    { inline_keyboard: [
      [{ text: t("btn_paid", lang), callback_data: "paid" }],
      [{ text: t("btn_switch_crypto", lang), callback_data: `pay_crypto_${orderId}` }],
      [{ text: t("btn_cancel", lang), callback_data: "cancel" }, { text: t("btn_help", lang), callback_data: "support" }],
    ]}, lang);
}

// ════════════════════════════════════════════
// ₿ Crypto Payment Handler
// ════════════════════════════════════════════
async function handleCryptoPayment(orderId: string, chatId: string, BOT_TOKEN: string, supabase: any, lang: Lang = "en") {
  const { data: order } = await supabase.from("orders").select("amount, country, account_type, quantity").eq("order_id", orderId).single();
  if (!order) return;

  const { data: countryPricing } = await supabase.from("country_pricing").select("regular_price_usdt, aged_price_usdt").eq("country_code", order.country).single();
  const type = order.account_type?.toLowerCase() === "aged" ? "aged" : "regular";
  const usdtPrice = countryPricing ? (type === "aged" ? Number(countryPricing.aged_price_usdt) : Number(countryPricing.regular_price_usdt)) : 0;
  const totalUsdt = usdtPrice * order.quantity;

  const { data: wallets } = await supabase.from("crypto_wallets").select("*").eq("is_active", true).order("coin_symbol");

  if (!wallets || wallets.length === 0) {
    await sendMsg(BOT_TOKEN, chatId, t("crypto_not_available", lang),
      { inline_keyboard: [
        [{ text: t("btn_switch_upi", lang), callback_data: `pay_upi_${orderId}` }],
        [{ text: t("btn_cancel", lang), callback_data: "cancel" }],
      ]}, lang);
    return;
  }

  let msg = `╔═══════════════════════╗\n` +
    `║   ${t("crypto_title", lang)}                ║\n` +
    `╚═══════════════════════╝\n\n` +
    `🆔 Order: \`${orderId}\`\n` +
    `💰 Amount (INR): *${SYMBOL}${order.amount.toLocaleString()}*\n`;

  if (totalUsdt > 0) {
    msg += `💲 Amount (USDT): *$${totalUsdt.toFixed(2)}*\n`;
  }

  msg += `\n`;

  const coinEmojis: Record<string, string> = { BTC: "₿", ETH: "⟠", USDT: "💲", USDC: "💵", BNB: "🔶", SOL: "◎", XRP: "✕", DOGE: "🐕", LTC: "Ł", TRX: "🔺" };

  for (const w of wallets) {
    const emoji = coinEmojis[w.coin_symbol] || "🪙";
    msg += `${emoji} *${w.coin_symbol}*${w.network ? ` (${w.network})` : ""}\n`;
    msg += `\`${w.wallet_address}\`\n\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `${t("crypto_send_screenshot", lang)}\n\n`;
  if (totalUsdt > 0) {
    msg += `💲 *Send exactly $${totalUsdt.toFixed(2)} USDT*\n\n`;
  }
  msg += t("crypto_verify", lang);

  await sendMsg(BOT_TOKEN, chatId, msg, {
    inline_keyboard: [
      [{ text: t("btn_paid", lang), callback_data: "paid" }],
      [{ text: t("btn_switch_upi", lang), callback_data: `pay_upi_${orderId}` }],
      [{ text: t("btn_cancel", lang), callback_data: "cancel" }, { text: t("btn_help", lang), callback_data: "support" }],
    ],
  }, lang);
}
