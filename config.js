/**
 * 👑 PASIYA-MD WHATSAPP BOT CONFIGURATION 👑
 * Customize your bot settings here!
 */

module.exports = {
  // Bot & Owner Details
  botName: "PASIYA-MD",
  ownerName: "PASIYA",
  ownerNumber: ["94700000000"], // Add your WhatsApp number with country code (e.g., 94712345678)
  prefix: ".", // Command prefix (e.g., .menu , !menu)
  
  // Linking Method:
  // "code" = 8-digit Pairing Code (Recommended - no 2nd phone needed!)
  // "qr" = Terminal QR Code (Scan with phone camera)
  authMethod: "code",

  // Features Settings
  autoStatusRead: true, // Automatically views WhatsApp statuses
  alwaysOnline: true,   // Shows bot as always active
  autoTyping: false,    // Simulates typing when processing
  autoReact: true,      // Reacts with emojis to commands
  workMode: "public",   // "public" (everyone can use) or "private" (only owner)

  // Appearance & UI
  footer: "© 2026 PASIYA-MD | Created with ❤️ by PASIYA",
  aliveMsg: `👋 *Hello bro! I am PASIYA-MD WhatsApp Bot!*
  
⚡ *Status:* Online & Active
👑 *Owner:* PASIYA
🚀 *Version:* 1.0.0
⏱️ *Uptime:* {uptime}
✨ Type *.menu* to view all commands!`
};
