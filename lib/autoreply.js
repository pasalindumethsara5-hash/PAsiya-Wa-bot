/**
 * 🤖 PASIYA-MD AUTO REPLY SYSTEM
 * Bot eka keywords detect karala automatically respond karanawa
 * Prefix epa - normal messages wala work karanawa
 */

const autoReplies = [
  // Greetings
  {
    keywords: ["hello", "hi", "hii", "hey", "helo", "hai"],
    response: (name) => `👋 *Hello ${name}!*\n\nMama *PASIYA-MD* Bot!\n\n✨ Commands balanna type karanna:\n👉 *.menu*`,
  },
  {
    keywords: ["ayubowan", "ආයුබෝවන්", "ayubovan"],
    response: (name) => `🙏 *ආයුබෝවන් ${name}!*\n\n👑 *PASIYA-MD* Bot eke walakalin!\n✨ *.menu* kiyala commands balanna!`,
  },
  {
    keywords: ["kohomada", "කොහොමද", "kohomad", "how are you", "how r u"],
    response: () => `😄 *Mama hodatama innawa!*\n\n⚡ Full power eken online!\n🤖 Commands use karanna *.menu* gahanna!`,
  },
  {
    keywords: ["subha dawasak", "good morning", "gudmrng", "morning", "good mrng"],
    response: (name) => `🌅 *Subha Dawasak ${name}!* ☀️\n\n⚡ PASIYA-MD bot eka ready!\n✨ *.menu* kiyala commands balanna!`,
  },
  {
    keywords: ["good night", "gudnight", "good nyt", "subha rathriyak", "subha rathri"],
    response: (name) => `🌙 *Subha Rathriyak ${name}!* 🌟\n\n😴 Hondatama nindaganna!\n👑 PASIYA-MD always online!`,
  },
  {
    keywords: ["thank you", "thanks", "thx", "sthuthi", "ස්තූතියි", "bohoma sthuthi"],
    response: () => `😊 *Welcome!*\n\n🙏 Oya eka PASIYA-MD walakalin!\n✨ Thawa mokak hari ona nam kiyanna!`,
  },
  {
    keywords: ["bot", "bot eka", "bot neda", "bot da"],
    response: () => `🤖 *Ow! Mama PASIYA-MD Bot!*\n\n👑 *Owner:* PASIYA\n⚡ *Status:* Online\n✨ Type *.menu* for commands!`,
  },
  {
    keywords: ["owner", "hadapu aya", "creator", "developer"],
    response: () => `👑 *PASIYA-MD Owner/Creator:*\n\n📱 This bot was made by *PASIYA*\n💻 Powered by Baileys WhatsApp API\n\n> © 2026 PASIYA-MD`,
  },
  {
    keywords: ["love you", "love u", "adarei", "ආදරෙයි"],
    response: (name) => `❤️ *Awww ${name}!*\n\nMamata oyata adarei neme, bot kenek!\n😂 Commands use karanna *.menu* gahanna!`,
  },
  {
    keywords: ["mokakda", "what", "mokada", "whats up", "wassup"],
    response: () => `🤔 *Mama PASIYA-MD Bot!*\n\n✨ Full featured WhatsApp bot!\n📋 Commands: *.menu*\n🤖 AI: *.ai <question>*\n🎵 Music: *.song <name>*`,
  },
  {
    keywords: ["help", "udaw", "uda", "udawu"],
    response: () => `🆘 *Help needed? No problem!*\n\n📋 Full command list: *.menu*\n🤖 Ask AI: *.ai <your question>*\n🎵 Download song: *.song <name>*\n☀️ Weather: *.weather <city>*\n😂 Joke: *.joke*`,
  },
  {
    keywords: ["haha", "lol", "😂", "😂😂", "hehe", "hihi"],
    response: () => `😂 *Haha mama hithuwe honde!*\n\n😄 Oya widihata have fun!\n👉 *.joke* kiyala thawa jokes balanna!`,
  },
  {
    keywords: ["sad", "dukkai", "dukai", "😢", "😭", "crying"],
    response: (name) => `🤗 *Ah ${name}, dukata epa!*\n\n😊 PASIYA-MD oya ekka innawa!\n😂 Hina wenna: *.joke*\n🧠 Interesting: *.fact*`,
  },
  {
    keywords: ["bored", "bore", "bor", "belhi", "belhi innawa"],
    response: () => `😪 *Bore da?*\n\nMeka try karanna:\n😂 *.joke* - Funny jokes\n🧠 *.fact* - Cool facts\n🤖 *.ai* - Chat with AI\n🎵 *.song* - Music download!`,
  },
];

/**
 * Check if a message matches any auto-reply keyword
 * Returns response text or null
 */
function checkAutoReply(text, senderName) {
  if (!text || text.length === 0) return null;

  const lowerText = text.toLowerCase().trim();

  for (const rule of autoReplies) {
    for (const keyword of rule.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return rule.response(senderName || "Machan");
      }
    }
  }
  return null;
}

module.exports = { checkAutoReply, autoReplies };
