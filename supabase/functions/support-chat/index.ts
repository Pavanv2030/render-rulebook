import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FAQ: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["what", "account", "used for", "purpose", "why"],
    answer: "📦 These are virtual Telegram accounts used for *airdrop farming* — participating in crypto airdrops that require multiple Telegram accounts.",
  },
  {
    keywords: ["delivery", "how long", "receive", "time", "when"],
    answer: "⚡ Delivery is *instant and automated*! Once your payment is confirmed, you'll receive a ZIP file containing your accounts within seconds.",
  },
  {
    keywords: ["payment", "pay", "upi", "usdt", "method"],
    answer: "💳 We accept *UPI* (for Indian customers), *USDT* via TRC20 and BEP20 networks, and *Telegram Stars*.",
  },
  {
    keywords: ["regular", "aged", "difference", "type"],
    answer: "📊 *Regular accounts* are fresh and ready to use.\n*Aged accounts* (6+ months) have higher trust scores and are 3x more successful for premium airdrops.",
  },
  {
    keywords: ["not work", "broken", "guarantee", "replace", "refund"],
    answer: "✅ We offer a *100% working guarantee*. Any non-working accounts will be replaced for free. Just let us know!",
  },
  {
    keywords: ["referral", "refer", "commission", "earn"],
    answer: "🎁 Yes! Use the */refer* command in our Telegram bot to get your unique referral link. Earn *5% commission* on every sale from your referrals.",
  },
  {
    keywords: ["price", "cost", "how much", "pricing", "rate"],
    answer: "💰 *Pricing:*\n• Regular: ₹50/account\n• Aged (6mo+): ₹100/account\n\nOrder any quantity from 1 to 100. Volume discounts available via Telegram bot!",
  },
  {
    keywords: ["order", "status", "track", "where"],
    answer: "📊 To check your order status, use the */status* command in our Telegram bot @airdro12pbot.",
  },
  {
    keywords: ["bot", "telegram", "start", "how to buy", "buy"],
    answer: "🤖 To buy accounts:\n1. Open @airdro12pbot on Telegram\n2. Tap /start\n3. Select country & type\n4. Choose quantity & pay\n5. Get your ZIP instantly!",
  },
  {
    keywords: ["hello", "hi", "hey", "help", "support"],
    answer: "👋 Hi there! I'm here to help. You can ask me about:\n• Pricing & payment methods\n• Account types (Regular vs Aged)\n• Delivery process\n• Order status\n• Referral program\n\nOr type your question and I'll connect you with our team!",
  },
];

function findFaqAnswer(input: string): string | null {
  const lower = input.toLowerCase();
  for (const faq of FAQ) {
    const matchCount = faq.keywords.filter(kw => lower.includes(kw)).length;
    if (matchCount >= 2 || (faq.keywords.length <= 2 && matchCount >= 1)) {
      return faq.answer;
    }
  }
  // Check for greetings specifically
  if (/^(hi|hey|hello|help|support|start)$/i.test(lower.trim())) {
    return FAQ[FAQ.length - 1].answer;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { message, sessionId, action } = await req.json();

    // Action: fetch messages (for polling/initial load)
    if (action === "fetch") {
      const { data: msgs } = await supabase
        .from("support_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      return new Response(JSON.stringify({ messages: msgs || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!message || !sessionId) {
      return new Response(JSON.stringify({ error: "message and sessionId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save user message
    await supabase.from("support_messages").insert({
      session_id: sessionId, sender: "user", message,
    });

    // Check FAQ
    const faqAnswer = findFaqAnswer(message);

    if (faqAnswer) {
      // Auto-reply with FAQ
      await supabase.from("support_messages").insert({
        session_id: sessionId, sender: "bot", message: faqAnswer,
      });

      return new Response(JSON.stringify({ reply: faqAnswer, type: "faq" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No FAQ match — forward to admin via Telegram
    const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
    const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");

    if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
      const adminText =
        `💬 *NEW SUPPORT MESSAGE (Web)*\n\n` +
        `🆔 Session: \`${sessionId.slice(0, 8)}...\`\n` +
        `💬 Message: ${message}\n\n` +
        `Reply with:\n\`/reply ${sessionId} Your reply here\``;

      await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: adminText,
          parse_mode: "Markdown",
        }),
      });
    }

    const waitReply = "🔄 Your message has been sent to our support team. They'll reply shortly!\n\n_You can also reach us on Telegram @airdro12pbot for faster assistance._";

    await supabase.from("support_messages").insert({
      session_id: sessionId, sender: "bot", message: waitReply,
    });

    return new Response(JSON.stringify({ reply: waitReply, type: "forwarded" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Support chat error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
