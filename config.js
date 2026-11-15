/**
 * 👑 PASIYA-MD WHATSAPP BOT CONFIGURATION 👑
 * Customize your bot settings here!
 */

module.exports = {
  // Bot & Owner Details
  botName: "PASIYA-MD",
  ownerName: "PASIYA",
  ownerNumber: ["94728433928", "94700000000"], // Owner WhatsApp number
  prefix: ".", // Command prefix (e.g., .menu , !menu)
  
  // Linking Method:
  // "code" = 8-digit Pairing Code (Recommended - no 2nd phone needed!)
  // "qr" = Terminal QR Code (Scan with phone camera)
  authMethod: "code",

  // Features Settings
  autoReply: false,       // Auto-reply to normal messages (DISABLED)
  autoStatusRead: true,   // Automatically views WhatsApp statuses
  autoStatusReact: true,  // Automatically reacts to WhatsApp statuses
  statusReactEmoji: "random", // Mind-blowing unexpected emojis (🗿, 💀, 🤯, 🥷, 🫠, 👽, ⚡, 🦇, etc.)
  antiCall: true,         // Automatically rejects incoming calls to protect bot SIM
  antiDelete: true,       // Detects deleted messages and sends alert to owner
  alwaysOnline: true,     // Shows bot as always active
  autoTyping: false,      // Simulates typing when processing
  autoReact: true,        // Reacts with emojis to commands
  workMode: "public",     // "public" (everyone can use) or "private" (only owner)

  // Sticker Pack Settings
  stickerPack: "PASIYA-MD",
  stickerAuthor: "PASIYA",

  // Appearance & UI
  footer: "© 2026 PASIYA-MD | Created with ❤️ by PASIYA",
  aliveMsg: `👋 *Hello bro! I am PASIYA-MD WhatsApp Bot!*
  
⚡ *Status:* Online & Active
👑 *Owner:* PASIYA
🚀 *Version:* 1.0.0
⏱️ *Uptime:* {uptime}
✨ Type *.menu* to view all commands!`
};
