export type Lang = "en" | "hi" | "es" | "ar";

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "हिंदी", flag: "🇮🇳" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

const translations: Record<string, Record<Lang, string>> = {
  // ── Nav / General ──
  "site.title": { en: "RIOX Accounts Pro", hi: "RIOX Accounts Pro", es: "RIOX Accounts Pro", ar: "RIOX Accounts Pro" },
  "site.tagline": { en: "Premium Telegram accounts for airdrop farming", hi: "एयरड्रॉप फार्मिंग के लिए प्रीमियम टेलीग्राम अकाउंट", es: "Cuentas premium de Telegram para airdrop farming", ar: "حسابات تيليجرام متميزة لزراعة الإيردروب" },

  // ── Hero ──
  "hero.badge": { en: "Live & Operational — Instant Delivery Active", hi: "लाइव और ऑपरेशनल — इंस्टेंट डिलीवरी सक्रिय", es: "Activo y Operativo — Entrega Instantánea", ar: "مباشر وتشغيلي — التسليم الفوري نشط" },
  "hero.subtitle": { en: "Bulk virtual Telegram accounts for airdrop farming. Instant auto-delivery via bot. Multi-currency payments. Aged & regular accounts available.", hi: "एयरड्रॉप फार्मिंग के लिए बल्क वर्चुअल टेलीग्राम अकाउंट। बॉट के ज़रिए इंस्टेंट ऑटो-डिलीवरी। मल्टी-करेंसी पेमेंट। पुराने और रेगुलर अकाउंट उपलब्ध।", es: "Cuentas virtuales de Telegram a granel para airdrop farming. Entrega automática instantánea vía bot. Pagos multi-moneda. Cuentas antiguas y regulares disponibles.", ar: "حسابات تيليجرام افتراضية بالجملة لزراعة الإيردروب. توصيل تلقائي فوري عبر البوت. مدفوعات متعددة العملات. حسابات قديمة وعادية متاحة." },
  "hero.cta": { en: "Open Bot on Telegram", hi: "टेलीग्राम पर बॉट खोलें", es: "Abrir Bot en Telegram", ar: "فتح البوت على تيليجرام" },
  "hero.pricing": { en: "View Pricing ↓", hi: "प्राइसिंग देखें ↓", es: "Ver Precios ↓", ar: "عرض الأسعار ↓" },
  "hero.stat.orders": { en: "Orders Delivered", hi: "ऑर्डर डिलीवर हुए", es: "Pedidos Entregados", ar: "الطلبات المسلمة" },
  "hero.stat.delivery": { en: "Auto Delivery", hi: "ऑटो डिलीवरी", es: "Entrega Automática", ar: "توصيل تلقائي" },
  "hero.stat.guarantee": { en: "Working Guarantee", hi: "वर्किंग गारंटी", es: "Garantía de Funcionamiento", ar: "ضمان العمل" },

  // ── Features ──
  "features.title.1": { en: "Why", hi: "क्यों", es: "¿Por qué", ar: "لماذا" },
  "features.title.2": { en: "RIOX Accounts", hi: "RIOX Accounts", es: "RIOX Accounts", ar: "RIOX Accounts" },
  "features.title.3": { en: "?", hi: "?", es: "?", ar: "؟" },
  "features.subtitle": { en: "Everything you need for successful airdrop farming at scale", hi: "स्केल पर सफल एयरड्रॉप फार्मिंग के लिए सब कुछ", es: "Todo lo que necesitas para airdrop farming exitoso a escala", ar: "كل ما تحتاجه لزراعة إيردروب ناجحة على نطاق واسع" },
  "features.bot.title": { en: "Fully Automated Bot", hi: "पूरी तरह ऑटोमेटेड बॉट", es: "Bot Totalmente Automatizado", ar: "بوت مؤتمت بالكامل" },
  "features.bot.desc": { en: "24/7 Telegram bot handles orders, payments, and delivery without human intervention.", hi: "24/7 टेलीग्राम बॉट बिना मानवीय हस्तक्षेप के ऑर्डर, पेमेंट और डिलीवरी संभालता है।", es: "Bot de Telegram 24/7 maneja pedidos, pagos y entregas sin intervención humana.", ar: "بوت تيليجرام يعمل 24/7 يتعامل مع الطلبات والمدفوعات والتوصيل بدون تدخل بشري." },
  "features.payment.title": { en: "Multi-Currency Payments", hi: "मल्टी-करेंसी पेमेंट", es: "Pagos Multi-Moneda", ar: "مدفوعات متعددة العملات" },
  "features.payment.desc": { en: "Pay with UPI (India), USDT (TRC20/BEP20), or Telegram Stars — your choice.", hi: "UPI (भारत), USDT (TRC20/BEP20), या Telegram Stars से भुगतान करें — आपकी पसंद।", es: "Paga con UPI (India), USDT (TRC20/BEP20), o Telegram Stars — tu elección.", ar: "ادفع بـ UPI (الهند)، USDT (TRC20/BEP20)، أو Telegram Stars — اختيارك." },
  "features.countries.title": { en: "8 Countries Supported", hi: "8 देश समर्थित", es: "8 Países Soportados", ar: "8 دول مدعومة" },
  "features.countries.desc": { en: "Accounts from India, USA, Pakistan, Nigeria, Bangladesh, Philippines, Brazil & Turkey.", hi: "भारत, USA, पाकिस्तान, नाइजीरिया, बांग्लादेश, फिलीपींस, ब्राज़ील और तुर्की से अकाउंट।", es: "Cuentas de India, USA, Pakistán, Nigeria, Bangladesh, Filipinas, Brasil y Turquía.", ar: "حسابات من الهند، الولايات المتحدة، باكستان، نيجيريا، بنغلاديش، الفلبين، البرازيل وتركيا." },
  "features.delivery.title": { en: "Instant ZIP Delivery", hi: "इंस्टेंट ZIP डिलीवरी", es: "Entrega ZIP Instantánea", ar: "توصيل ZIP فوري" },
  "features.delivery.desc": { en: "Receive your accounts as a ZIP file directly in Telegram within seconds after payment.", hi: "पेमेंट के बाद सेकंड में टेलीग्राम में सीधे ZIP फाइल के रूप में अपने अकाउंट प्राप्त करें।", es: "Recibe tus cuentas como archivo ZIP directamente en Telegram segundos después del pago.", ar: "استلم حساباتك كملف ZIP مباشرة في تيليجرام خلال ثوانٍ بعد الدفع." },
  "features.guarantee.title": { en: "100% Working Guarantee", hi: "100% वर्किंग गारंटी", es: "100% Garantía de Funcionamiento", ar: "ضمان عمل 100%" },
  "features.guarantee.desc": { en: "Every account is verified before delivery. Non-working accounts replaced for free.", hi: "हर अकाउंट डिलीवरी से पहले सत्यापित किया जाता है। काम न करने वाले अकाउंट मुफ्त में बदले जाते हैं।", es: "Cada cuenta se verifica antes de la entrega. Cuentas no funcionales reemplazadas gratis.", ar: "كل حساب يتم التحقق منه قبل التسليم. الحسابات غير العاملة يتم استبدالها مجاناً." },
  "features.aged.title": { en: "Aged Accounts Available", hi: "पुराने अकाउंट उपलब्ध", es: "Cuentas Antiguas Disponibles", ar: "حسابات قديمة متاحة" },
  "features.aged.desc": { en: "6+ month old accounts with higher trust scores for premium airdrop opportunities.", hi: "प्रीमियम एयरड्रॉप अवसरों के लिए उच्च विश्वास स्कोर वाले 6+ महीने पुराने अकाउंट।", es: "Cuentas de 6+ meses con puntuaciones de confianza más altas para airdrops premium.", ar: "حسابات عمرها 6+ أشهر بدرجات ثقة أعلى لفرص إيردروب المميزة." },

  // ── How It Works ──
  "how.title.1": { en: "How It", hi: "यह कैसे", es: "Cómo", ar: "كيف" },
  "how.title.2": { en: "Works", hi: "काम करता है", es: "Funciona", ar: "يعمل" },
  "how.step1.title": { en: "Open Our Bot", hi: "हमारा बॉट खोलें", es: "Abre Nuestro Bot", ar: "افتح البوت" },
  "how.step1.desc": { en: "Search @airdro12pbot on Telegram and tap /start", hi: "टेलीग्राम पर @airdro12pbot खोजें और /start दबाएं", es: "Busca @airdro12pbot en Telegram y toca /start", ar: "ابحث عن @airdro12pbot على تيليجرام واضغط /start" },
  "how.step2.title": { en: "Select Country & Quantity", hi: "देश और संख्या चुनें", es: "Selecciona País y Cantidad", ar: "اختر البلد والكمية" },
  "how.step2.desc": { en: "Choose your country, pick regular or aged, select quantity", hi: "अपना देश चुनें, रेगुलर या पुराना चुनें, संख्या चुनें", es: "Elige tu país, selecciona regular o antiguo, elige cantidad", ar: "اختر بلدك، اختر عادي أو قديم، حدد الكمية" },
  "how.step3.title": { en: "Make Payment", hi: "भुगतान करें", es: "Realiza el Pago", ar: "قم بالدفع" },
  "how.step3.desc": { en: "Pay via UPI, USDT, or Telegram Stars — instant confirmation", hi: "UPI, USDT, या Telegram Stars से भुगतान करें — तुरंत कन्फर्मेशन", es: "Paga vía UPI, USDT, o Telegram Stars — confirmación instantánea", ar: "ادفع عبر UPI، USDT، أو Telegram Stars — تأكيد فوري" },
  "how.step4.title": { en: "Get Your Accounts", hi: "अपने अकाउंट पाएं", es: "Obtén Tus Cuentas", ar: "احصل على حساباتك" },
  "how.step4.desc": { en: "ZIP file delivered automatically in seconds. Start farming!", hi: "ZIP फाइल सेकंड में ऑटोमैटिकली डिलीवर। फार्मिंग शुरू करें!", es: "Archivo ZIP entregado automáticamente en segundos. ¡Empieza a farmear!", ar: "ملف ZIP يُسلم تلقائياً في ثوانٍ. ابدأ الزراعة!" },

  // ── Video Guide ──
  "video.badge": { en: "Step-by-Step Tutorial", hi: "स्टेप-बाय-स्टेप ट्यूटोरियल", es: "Tutorial Paso a Paso", ar: "دليل خطوة بخطوة" },
  "video.title.1": { en: "How to", hi: "कैसे", es: "Cómo", ar: "كيفية" },
  "video.title.2": { en: "Buy Accounts", hi: "अकाउंट खरीदें", es: "Comprar Cuentas", ar: "شراء الحسابات" },
  "video.subtitle": { en: "Watch our quick video and follow the simple steps below", hi: "हमारा क्विक वीडियो देखें और नीचे दिए गए सरल चरणों का पालन करें", es: "Mira nuestro video rápido y sigue los simples pasos abajo", ar: "شاهد الفيديو السريع واتبع الخطوات البسيطة أدناه" },
  "video.caption": { en: "🎬 RIOX Accounts Pro — Quick Start Guide", hi: "🎬 RIOX Accounts Pro — क्विक स्टार्ट गाइड", es: "🎬 RIOX Accounts Pro — Guía de Inicio Rápido", ar: "🎬 RIOX Accounts Pro — دليل البدء السريع" },
  "video.caption.sub": { en: "Watch how to buy premium Telegram accounts in under a minute", hi: "एक मिनट से कम में प्रीमियम टेलीग्राम अकाउंट खरीदने का तरीका देखें", es: "Mira cómo comprar cuentas premium de Telegram en menos de un minuto", ar: "شاهد كيفية شراء حسابات تيليجرام المميزة في أقل من دقيقة" },
  "video.step1": { en: "Find Our Bot", hi: "हमारा बॉट खोजें", es: "Encuentra Nuestro Bot", ar: "ابحث عن البوت" },
  "video.step1.desc": { en: "Search @airdro12pbot on Telegram or tap the button above", hi: "टेलीग्राम पर @airdro12pbot खोजें या ऊपर बटन दबाएं", es: "Busca @airdro12pbot en Telegram o toca el botón arriba", ar: "ابحث عن @airdro12pbot على تيليجرام أو اضغط الزر أعلاه" },
  "video.step2": { en: "Tap /start", hi: "/start दबाएं", es: "Toca /start", ar: "اضغط /start" },
  "video.step2.desc": { en: "The bot greets you and shows the main menu", hi: "बॉट आपका स्वागत करता है और मुख्य मेनू दिखाता है", es: "El bot te saluda y muestra el menú principal", ar: "البوت يرحب بك ويعرض القائمة الرئيسية" },
  "video.step3": { en: "Pick Country & Type", hi: "देश और प्रकार चुनें", es: "Elige País y Tipo", ar: "اختر البلد والنوع" },
  "video.step3.desc": { en: "Select your country, choose Regular or Aged accounts", hi: "अपना देश चुनें, रेगुलर या पुराना अकाउंट चुनें", es: "Selecciona tu país, elige cuentas Regulares o Antiguas", ar: "اختر بلدك، اختر حسابات عادية أو قديمة" },
  "video.step4": { en: "Choose Quantity", hi: "संख्या चुनें", es: "Elige Cantidad", ar: "اختر الكمية" },
  "video.step4.desc": { en: "Pick how many accounts you need (1 to 100+)", hi: "आपको कितने अकाउंट चाहिए चुनें (1 से 100+)", es: "Elige cuántas cuentas necesitas (1 a 100+)", ar: "اختر عدد الحسابات التي تحتاجها (1 إلى 100+)" },
  "video.step5": { en: "Pay & Receive", hi: "भुगतान करें और प्राप्त करें", es: "Paga y Recibe", ar: "ادفع واستلم" },
  "video.step5.desc": { en: "Pay via UPI/USDT/Stars — ZIP file delivered instantly!", hi: "UPI/USDT/Stars से भुगतान करें — ZIP फाइल तुरंत डिलीवर!", es: "Paga vía UPI/USDT/Stars — ¡archivo ZIP entregado instantáneamente!", ar: "ادفع عبر UPI/USDT/Stars — ملف ZIP يُسلم فوراً!" },
  "video.cta": { en: "Start Buying Now", hi: "अभी खरीदना शुरू करें", es: "Empieza a Comprar Ahora", ar: "ابدأ الشراء الآن" },

  // ── Pricing ──
  "pricing.title.1": { en: "Simple", hi: "सरल", es: "Precios", ar: "أسعار" },
  "pricing.title.2": { en: "Pricing", hi: "प्राइसिंग", es: "Simples", ar: "بسيطة" },
  "pricing.subtitle": { en: "Pay per account — order any quantity from 1 to 100", hi: "प्रति अकाउंट भुगतान — 1 से 100 तक कोई भी संख्या ऑर्डर करें", es: "Paga por cuenta — ordena cualquier cantidad de 1 a 100", ar: "ادفع لكل حساب — اطلب أي كمية من 1 إلى 100" },
  "pricing.regular": { en: "Regular Accounts", hi: "रेगुलर अकाउंट", es: "Cuentas Regulares", ar: "حسابات عادية" },
  "pricing.regular.desc": { en: "Fresh accounts, ready to use", hi: "नए अकाउंट, उपयोग के लिए तैयार", es: "Cuentas frescas, listas para usar", ar: "حسابات جديدة، جاهزة للاستخدام" },
  "pricing.per": { en: "per account", hi: "प्रति अकाउंट", es: "por cuenta", ar: "لكل حساب" },
  "pricing.regular.f1": { en: "Min 1 account, Max 100", hi: "न्यूनतम 1, अधिकतम 100", es: "Mín 1, Máx 100", ar: "حد أدنى 1، حد أقصى 100" },
  "pricing.regular.f2": { en: "Instant delivery via ZIP", hi: "ZIP के ज़रिए इंस्टेंट डिलीवरी", es: "Entrega instantánea vía ZIP", ar: "توصيل فوري عبر ZIP" },
  "pricing.regular.f3": { en: "100% working guaranteed", hi: "100% वर्किंग गारंटी", es: "100% garantía de funcionamiento", ar: "ضمان عمل 100%" },
  "pricing.aged": { en: "Aged Accounts (6mo+)", hi: "पुराने अकाउंट (6 महीने+)", es: "Cuentas Antiguas (6m+)", ar: "حسابات قديمة (6 أشهر+)" },
  "pricing.aged.badge": { en: "3x SUCCESS RATE", hi: "3x सफलता दर", es: "3x TASA DE ÉXITO", ar: "3x معدل نجاح" },
  "pricing.aged.desc": { en: "Higher trust score, better for premium airdrops", hi: "उच्च विश्वास स्कोर, प्रीमियम एयरड्रॉप्स के लिए बेहतर", es: "Mayor puntuación de confianza, mejor para airdrops premium", ar: "درجة ثقة أعلى، أفضل للإيردروبات المميزة" },
  "pricing.aged.f1": { en: "6+ months account history", hi: "6+ महीने का अकाउंट इतिहास", es: "6+ meses de historial", ar: "سجل حساب 6+ أشهر" },
  "pricing.aged.f2": { en: "Min 1 account, Max 100", hi: "न्यूनतम 1, अधिकतम 100", es: "Mín 1, Máx 100", ar: "حد أدنى 1، حد أقصى 100" },
  "pricing.aged.f3": { en: "Ideal for high-value airdrops", hi: "उच्च-मूल्य एयरड्रॉप्स के लिए आदर्श", es: "Ideal para airdrops de alto valor", ar: "مثالي للإيردروبات عالية القيمة" },
  "pricing.cta": { en: "Order Now via Telegram", hi: "अभी टेलीग्राम से ऑर्डर करें", es: "Ordena Ahora vía Telegram", ar: "اطلب الآن عبر تيليجرام" },

  // ── FAQ ──
  "faq.title.1": { en: "Frequently Asked", hi: "अक्सर पूछे जाने वाले", es: "Preguntas", ar: "الأسئلة" },
  "faq.title.2": { en: "Questions", hi: "प्रश्न", es: "Frecuentes", ar: "الشائعة" },
  "faq.q1": { en: "What are these accounts used for?", hi: "ये अकाउंट किसके लिए उपयोग किए जाते हैं?", es: "¿Para qué se usan estas cuentas?", ar: "ما هي استخدامات هذه الحسابات؟" },
  "faq.a1": { en: "These are virtual Telegram accounts used for airdrop farming — participating in crypto airdrops that require multiple Telegram accounts.", hi: "ये वर्चुअल टेलीग्राम अकाउंट हैं जो एयरड्रॉप फार्मिंग के लिए उपयोग किए जाते हैं — क्रिप्टो एयरड्रॉप में भाग लेना जिसमें कई टेलीग्राम अकाउंट की आवश्यकता होती है।", es: "Son cuentas virtuales de Telegram usadas para airdrop farming — participar en airdrops crypto que requieren múltiples cuentas de Telegram.", ar: "هذه حسابات تيليجرام افتراضية تُستخدم لزراعة الإيردروب — المشاركة في إيردروبات الكريبتو التي تتطلب حسابات تيليجرام متعددة." },
  "faq.q2": { en: "How quickly will I receive my accounts?", hi: "मुझे अपने अकाउंट कितनी जल्दी मिलेंगे?", es: "¿Qué tan rápido recibiré mis cuentas?", ar: "كم من الوقت سأحتاج لاستلام حساباتي؟" },
  "faq.a2": { en: "Delivery is instant and automated. Once your payment is confirmed, you'll receive a ZIP file containing your accounts within seconds.", hi: "डिलीवरी तुरंत और ऑटोमेटेड है। आपका भुगतान कन्फर्म होते ही, आपको सेकंड में अपने अकाउंट वाली ZIP फाइल मिल जाएगी।", es: "La entrega es instantánea y automatizada. Una vez confirmado tu pago, recibirás un archivo ZIP con tus cuentas en segundos.", ar: "التسليم فوري وآلي. بمجرد تأكيد الدفع، ستستلم ملف ZIP يحتوي على حساباتك في ثوانٍ." },
  "faq.q3": { en: "What payment methods do you accept?", hi: "आप कौन सी भुगतान विधियां स्वीकार करते हैं?", es: "¿Qué métodos de pago aceptan?", ar: "ما هي طرق الدفع المقبولة؟" },
  "faq.a3": { en: "We accept UPI (for Indian customers), USDT via TRC20 and BEP20 networks, and Telegram Stars.", hi: "हम UPI (भारतीय ग्राहकों के लिए), TRC20 और BEP20 नेटवर्क के माध्यम से USDT, और Telegram Stars स्वीकार करते हैं।", es: "Aceptamos UPI (para clientes indios), USDT vía redes TRC20 y BEP20, y Telegram Stars.", ar: "نقبل UPI (للعملاء الهنود)، USDT عبر شبكات TRC20 و BEP20، و Telegram Stars." },
  "faq.q4": { en: "What's the difference between Regular and Aged accounts?", hi: "रेगुलर और पुराने अकाउंट में क्या अंतर है?", es: "¿Cuál es la diferencia entre cuentas Regulares y Antiguas?", ar: "ما الفرق بين الحسابات العادية والقديمة؟" },
  "faq.a4": { en: "Aged accounts are 6+ months old with established history. They have higher trust scores and are 3x more successful for premium airdrops.", hi: "पुराने अकाउंट 6+ महीने पुराने होते हैं जिनका स्थापित इतिहास है। उनके पास उच्च विश्वास स्कोर हैं और वे प्रीमियम एयरड्रॉप के लिए 3 गुना अधिक सफल हैं।", es: "Las cuentas antiguas tienen 6+ meses con historial establecido. Tienen puntuaciones de confianza más altas y son 3x más exitosas para airdrops premium.", ar: "الحسابات القديمة عمرها 6+ أشهر مع سجل ثابت. لديها درجات ثقة أعلى وهي أكثر نجاحاً بـ 3 مرات للإيردروبات المميزة." },
  "faq.q5": { en: "What if some accounts don't work?", hi: "अगर कुछ अकाउंट काम नहीं करते तो?", es: "¿Qué pasa si algunas cuentas no funcionan?", ar: "ماذا لو لم تعمل بعض الحسابات؟" },
  "faq.a5": { en: "We offer a 100% working guarantee. Any non-working accounts will be replaced for free. Just contact support through the bot.", hi: "हम 100% वर्किंग गारंटी प्रदान करते हैं। काम न करने वाले किसी भी अकाउंट को मुफ्त में बदला जाएगा। बस बॉट के माध्यम से सपोर्ट से संपर्क करें।", es: "Ofrecemos 100% garantía de funcionamiento. Las cuentas no funcionales se reemplazarán gratis. Solo contacta soporte a través del bot.", ar: "نقدم ضمان عمل 100%. أي حسابات لا تعمل سيتم استبدالها مجاناً. فقط تواصل مع الدعم عبر البوت." },
  "faq.q6": { en: "Do you have a referral program?", hi: "क्या आपका कोई रेफरल प्रोग्राम है?", es: "¿Tienen programa de referidos?", ar: "هل لديكم برنامج إحالة؟" },
  "faq.a6": { en: "Yes! Use the /refer command in our bot to get your unique referral link. Earn 5% commission on every sale from your referrals.", hi: "हाँ! अपना यूनिक रेफरल लिंक पाने के लिए हमारे बॉट में /refer कमांड का उपयोग करें। अपने रेफरल की हर बिक्री पर 5% कमीशन कमाएं।", es: "¡Sí! Usa el comando /refer en nuestro bot para obtener tu link de referido único. Gana 5% de comisión en cada venta de tus referidos.", ar: "نعم! استخدم أمر /refer في البوت للحصول على رابط إحالتك الفريد. اكسب 5% عمولة على كل بيع من إحالاتك." },

  // ── Footer ──
  "footer.copy": { en: "Premium Telegram accounts for airdrop farming.", hi: "एयरड्रॉप फार्मिंग के लिए प्रीमियम टेलीग्राम अकाउंट।", es: "Cuentas premium de Telegram para airdrop farming.", ar: "حسابات تيليجرام متميزة لزراعة الإيردروب." },

  // ── Chat Widget ──
  "chat.welcome": { en: "👋 Welcome to RIOX Accounts Pro!\n\nI can help you order premium Telegram accounts for airdrop farming. Tap below to get started!", hi: "👋 RIOX Accounts Pro में आपका स्वागत है!\n\nमैं आपको एयरड्रॉप फार्मिंग के लिए प्रीमियम टेलीग्राम अकाउंट ऑर्डर करने में मदद कर सकता हूं। शुरू करने के लिए नीचे टैप करें!", es: "👋 ¡Bienvenido a RIOX Accounts Pro!\n\nPuedo ayudarte a ordenar cuentas premium de Telegram para airdrop farming. ¡Toca abajo para comenzar!", ar: "👋 مرحبًا بك في RIOX Accounts Pro!\n\nيمكنني مساعدتك في طلب حسابات تيليجرام المميزة لزراعة الإيردروب. اضغط أدناه للبدء!" },
  "chat.browse": { en: "🛒 Browse Accounts", hi: "🛒 अकाउंट ब्राउज़ करें", es: "🛒 Explorar Cuentas", ar: "🛒 تصفح الحسابات" },
  "chat.online": { en: "Online", hi: "ऑनलाइन", es: "En línea", ar: "متصل" },
  "chat.placeholder": { en: "Type a message...", hi: "संदेश टाइप करें...", es: "Escribe un mensaje...", ar: "اكتب رسالة..." },
  "chat.error": { en: "⚠️ Connection error. Please try again.", hi: "⚠️ कनेक्शन एरर। कृपया फिर से प्रयास करें।", es: "⚠️ Error de conexión. Inténtalo de nuevo.", ar: "⚠️ خطأ في الاتصال. يرجى المحاولة مرة أخرى." },
};

export function useTranslation(lang: Lang) {
  return (key: string): string => {
    return translations[key]?.[lang] || translations[key]?.en || key;
  };
}

export function getStoredLang(): Lang {
  const stored = localStorage.getItem("riox_lang");
  if (stored && ["en", "hi", "es", "ar"].includes(stored)) return stored as Lang;
  return "en";
}

export function setStoredLang(lang: Lang) {
  localStorage.setItem("riox_lang", lang);
}
