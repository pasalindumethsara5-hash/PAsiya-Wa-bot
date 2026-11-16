const axios = require("axios");
const config = require("../config");

// Singlish & Sinhala Specialized System Prompt
const AI_SYSTEM_PROMPT = `You are PASIYA AI, an ultra-smart, friendly AI assistant created by PASIYA for WhatsApp.
You have native-level fluency in:
1. Singlish (Sinhala language written using Latin/English letters, e.g. "machan", "kohomada", "mata meka kiyala denna", "mokakda karanna puluwan", "kiyapan", "hadaganne kohomada", "danna kenek kiyapan").
2. Pure Sinhala (සිංහල).
3. English.

CRITICAL RULES FOR LANGUAGE & UNDERSTANDING:
- ALWAYS accurately understand queries written in Singlish (phonetic Sinhala). Never mistake Singlish for gibberish, Spanish, or any other foreign language.
- If the user asks in Singlish: reply in friendly, natural Singlish (or easy-to-read Sinhala/English mix as Sri Lankans naturally chat on WhatsApp).
- If the user asks in Sinhala: reply in polite, fluent Sinhala.
- If the user asks in English: reply in fluent English.
- Always be helpful, respectful, and friendly like a true Sri Lankan friend ("machan", "bro").
- Format nicely for WhatsApp using emojis, bullet points, and bold text (*...*).
- Keep answers informative, concise, and easy to read on mobile screens.`;

/**
 * Master multi-tier AI query engine
 * Tier 1: Google Gemini Flash (if config.geminiApiKey or process.env.GEMINI_API_KEY)
 * Tier 2: Groq Cloud Llama 3.3 (if config.groqApiKey or process.env.GROQ_API_KEY)
 * Tier 3: Cloudflare Workers AI Edge (Free, No Key, 100,000 req/day)
 * Tier 4: Pollinations OpenAI model (Clean prompt fallback)
 * Tier 5: DuckDuckGo Instant Knowledge Base
 */
async function generateAIReply(query, options = {}) {
  const isVoice = Boolean(options.isVoice);
  const sysPrompt = isVoice
    ? "You are PASIYA AI. Answer concisely in 1-2 lively, friendly sentences suitable for a WhatsApp voice message. If user asks in Singlish, reply in Singlish. If in Sinhala, reply in Sinhala."
    : AI_SYSTEM_PROMPT;

  // 1. Google Gemini (Official Free API - Ultra Fast & Native Sinhala/Singlish)
  const geminiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await axios.post(
        url,
        {
          contents: [{ parts: [{ text: `${sysPrompt}\n\nUser Question: ${query}` }] }],
        },
        { timeout: 15000 }
      );
      const answer = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (answer && answer.trim()) return answer.trim();
    } catch (e) {
      console.log("[AI] Gemini API failed, trying next provider...", e.message);
    }
  }

  // 2. Groq Cloud (Free Llama 3.3 70B - 14,400 req/day)
  const groqKey = config.groqApiKey || process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: query },
          ],
          max_tokens: isVoice ? 100 : 600,
        },
        {
          headers: { Authorization: `Bearer ${groqKey}` },
          timeout: 12000,
        }
      );
      const answer = res.data?.choices?.[0]?.message?.content;
      if (answer && answer.trim()) return answer.trim();
    } catch (e) {
      console.log("[AI] Groq API failed, trying next provider...", e.message);
    }
  }

  // 3. Cloudflare Workers AI Edge (Free, No Key, 100,000 req/day)
  try {
    const prompt = `${sysPrompt}\n\nUser: ${query}`;
    const res = await axios.post(
      "https://devtoolbox-api.devtoolbox-api.workers.dev/ai/generate",
      {
        prompt,
        max_tokens: isVoice ? 120 : 500,
      },
      { timeout: 15000 }
    );
    if (res.data && res.data.response) {
      let text = res.data.response.trim();
      if (text.startsWith(prompt)) text = text.slice(prompt.length).trim();
      if (text) return text;
    }
  } catch (e) {
    console.log("[AI] Cloudflare Workers AI failed, trying next provider...", e.message);
  }

  // 4. Pollinations OpenAI (Clean prompt fallback)
  try {
    const pUrl = `https://text.pollinations.ai/${encodeURIComponent(query + " (Reply in friendly Singlish or Sinhala)")}`;
    const res = await axios.get(pUrl, { timeout: 8000 });
    if (res.data && typeof res.data === "string" && !res.data.includes("budget") && !res.data.includes("rate limit")) {
      return res.data.trim();
    }
  } catch (e) {
    console.log("[AI] Pollinations fallback failed, trying next provider...", e.message);
  }

  // 5. DuckDuckGo Instant Knowledge Fallback
  try {
    const ddgRes = await axios.get(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`,
      { timeout: 6000 }
    );
    const ans = ddgRes.data?.AbstractText || ddgRes.data?.Answer;
    if (ans && ans.trim()) {
      return `📌 *Knowledge Base:*\n${ans.trim()}`;
    }
  } catch (e) {}

  return null;
}

module.exports = {
  ai: {
    name: "ai",
    alias: ["gpt", "ask", "gemini", "chat"],
    category: "ai",
    desc: "Ask anything in Singlish, Sinhala, or English",
    async execute(sock, m, args) {
      const query = args.join(" ");
      if (!query) {
        return sock.sendMessage(
          m.chat,
          {
            text: `⚠️ *Please provide a question!*\n\n💡 *Examples:*\n• ${config.prefix}ai machan battery life eka wadi karaganne kohomada?\n• ${config.prefix}ai ශ්‍රී ලංකාවේ අගනුවර කුමක්ද?\n• ${config.prefix}ai What is artificial intelligence?`
          },
          { quoted: m }
        );
      }

      await sock.sendMessage(m.chat, { text: "💭 *PASIYA AI is thinking...*" }, { quoted: m });

      try {
        const reply = await generateAIReply(query);

        if (reply) {
          await sock.sendMessage(
            m.chat,
            {
              text: `🤖 *PASIYA AI*\n\n${reply}\n\n> 👑 *Powered by PASIYA-MD*`,
            },
            { quoted: m }
          );
        } else {
          await sock.sendMessage(
            m.chat,
            { text: "❌ *Server eka busy machan. Thawa vinadiyakata passe aye try karanna!*" },
            { quoted: m }
          );
        }
      } catch (err) {
        console.error("AI Error:", err.message);
        await sock.sendMessage(
          m.chat,
          { text: "❌ *Server eka busy machan. Thawa vinadiyakata passe aye try karanna!*" },
          { quoted: m }
        );
      }
    },
  },

  imagine: {
    name: "imagine",
    alias: ["dalle", "genimage", "photo"],
    category: "ai",
    desc: "Generate AI image from text prompt",
    async execute(sock, m, args) {
      const prompt = args.join(" ");
      if (!prompt) {
        return sock.sendMessage(
          m.chat,
          { text: `⚠️ *Please provide an image prompt!*\n\n*Example:* ${config.prefix}imagine a cute cyber cat in neon city` },
          { quoted: m }
        );
      }

      await sock.sendMessage(m.chat, { text: "🎨 *Generating image, please wait a moment...*" }, { quoted: m });

      try {
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
        
        await sock.sendMessage(
          m.chat,
          {
            image: { url: imageUrl },
            caption: `🎨 *Generated by PASIYA-MD AI*\n📝 *Prompt:* ${prompt}\n👑 *Owner:* ${config.ownerName}`,
          },
          { quoted: m }
        );
      } catch (err) {
        console.error("Image Gen Error:", err);
        await sock.sendMessage(m.chat, { text: "❌ *Failed to generate image. Please try again!*" }, { quoted: m });
      }
    },
  },

  translate: {
    name: "translate",
    alias: ["tr", "trans", "sinhala"],
    category: "ai",
    desc: "Translate text to Sinhala or any language",
    async execute(sock, m, args) {
      let text = args.join(" ");
      let targetLang = "si"; // default Sinhala

      if (m.quoted && m.quoted.text) {
        text = m.quoted.text;
        if (args[0] && args[0].length === 2) {
          targetLang = args[0].toLowerCase();
        }
      } else if (args.length >= 2 && args[0].length === 2) {
        targetLang = args[0].toLowerCase();
        text = args.slice(1).join(" ");
      }

      if (!text) {
        return sock.sendMessage(
          m.chat,
          { text: `⚠️ *Usage:* ${config.prefix}translate <text>\n*Or with target lang:* ${config.prefix}tr en කොහොමද\n*Example:* ${config.prefix}tr Good morning!` },
          { quoted: m }
        );
      }

      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await axios.get(url, { timeout: 10000 });
        
        let translated = "";
        if (res.data && res.data[0]) {
          translated = res.data[0].map(item => item[0]).join("");
        }

        if (!translated) {
          return sock.sendMessage(m.chat, { text: "❌ *Translation failed!*" }, { quoted: m });
        }

        const reply = `🌐 *PASIYA TRANSLATE*\n\n` +
          `📝 *Original:* ${text}\n` +
          `🎯 *Target Lang:* ${targetLang.toUpperCase()}\n\n` +
          `✨ *Translation:*\n${translated}\n\n` +
          `> ${config.footer}`;

        await sock.sendMessage(m.chat, { text: reply }, { quoted: m });
      } catch (err) {
        console.error("Translation error:", err.message);
        await sock.sendMessage(m.chat, { text: "❌ *Translation service temporarily unavailable!*" }, { quoted: m });
      }
    }
  },

  voiceai: {
    name: "voiceai",
    alias: ["vai", "talkai", "speakai"],
    category: "ai",
    desc: "AI answers your question with a spoken human voice note",
    async execute(sock, m, args) {
      const query = args.join(" ");
      if (!query) {
        return sock.sendMessage(m.chat, {
          text: `⚠️ *Please provide a question to speak!*\n\n*Example:* ${config.prefix}vai machan tell me a funny story`
        }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "🎙️ *PASIYA Voice AI is generating spoken response...*" }, { quoted: m });

      try {
        const rawAnswer = await generateAIReply(query, { isVoice: true });
        const answerText = (rawAnswer || "Hello bro, I am PASIYA AI!").slice(0, 300);

        // Convert answer to audio speech voice note
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(answerText)}&tl=en&client=tw-ob`;
        const audioRes = await axios.get(ttsUrl, { responseType: "arraybuffer", timeout: 15000 });
        const buffer = Buffer.from(audioRes.data);

        await sock.sendMessage(m.chat, {
          audio: buffer,
          mimetype: "audio/mp4",
          ptt: true
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: `❌ *Voice AI error:* ${err.message}` }, { quoted: m });
      }
    }
  },

  vision: {
    name: "vision",
    alias: ["look", "describe", "see"],
    category: "ai",
    desc: "AI inspects and describes a quoted photo",
    async execute(sock, m, args) {
      const prompt = args.join(" ") || "Describe what is in this image in detail.";

      if (!m.quoted || !m.quoted.message?.imageMessage) {
        return sock.sendMessage(m.chat, {
          text: `⚠️ *Please reply to an image with ${config.prefix}vision <optional question>!*`
        }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "👁️ *PASIYA Vision AI is analyzing image...*" }, { quoted: m });

      try {
        const { downloadMediaMessage } = require("@whiskeysockets/baileys");
        const buffer = await downloadMediaMessage(m.quoted, "buffer", {});
        const base64 = buffer.toString("base64");

        const visionRes = await axios.post("https://api.vreden.my.id/api/gemini-image", {
          image: `data:image/jpeg;base64,${base64}`,
          prompt: `${prompt}. Answer in friendly Singlish or English.`
        }, { timeout: 30000 }).catch(() => null);

        let desc = visionRes?.data?.result || visionRes?.data?.description;

        if (!desc) {
          desc = `🖼️ *Photo Inspected!*\n\n• File Size: ${(buffer.length / 1024).toFixed(1)} KB\n• Format: JPEG image\n• Query: "${prompt}"\n\n> 👑 ${config.footer}`;
        }

        await sock.sendMessage(m.chat, {
          text: `👁️ *PASIYA VISION AI*\n\n${desc}\n\n> 👑 *Powered by PASIYA-MD*`
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: `❌ *Vision error:* ${err.message}` }, { quoted: m });
      }
    }
  }
};
