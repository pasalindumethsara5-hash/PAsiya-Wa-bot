const config = require("../config");
const { runtime } = require("../lib/functions");
const os = require("os");

module.exports = {
  menu: {
    name: "menu",
    alias: ["help", "list"],
    category: "general",
    desc: "Display bot commands list",
    async execute(sock, m, args) {
      const uptime = runtime(process.uptime());
      const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
      const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);

      const menuText = `
╭───「 *👑 ${config.botName} 👑* 」───
│ 👤 *Owner:* ${config.ownerName}
│ ⚡ *Prefix:* [ ${config.prefix} ]
│ ⏱️ *Uptime:* ${uptime}
│ 💻 *RAM:* ${freeMem}GB / ${totalMem}GB
│ 🛡️ *Mode:* ${config.workMode}
╰───────────────────────────

╭───「 *🔰 GENERAL* 」
│ 🔹 ${config.prefix}alive - Check bot status
│ 🔹 ${config.prefix}ping - Check bot response speed
│ 🔹 ${config.prefix}menu - Display this help menu
│ 🔹 ${config.prefix}owner - Show owner contact
│ 🔹 ${config.prefix}botinfo - Bot specifications
╰───────────────────────────

╭───「 *🤖 AI TOOLS* 」
│ 🔹 ${config.prefix}ai <query> - Ask anything to AI
│ 🔹 ${config.prefix}gemini <query> - Chat with Google AI
│ 🔹 ${config.prefix}imagine <prompt> - Generate AI image
╰───────────────────────────

╭───「 *🎨 MEDIA & STICKER* 」
│ 🔹 ${config.prefix}sticker (or ${config.prefix}s) - Image to sticker
│ 🔹 ${config.prefix}tts <text> - Text to speech audio
│ 🔹 ${config.prefix}quote <text> - Create quote image
╰───────────────────────────

╭───「 *📥 DOWNLOADERS* 」
│ 🔹 ${config.prefix}song <name> - Search & download audio
│ 🔹 ${config.prefix}video <name> - Search & download video
│ 🔹 ${config.prefix}yts <query> - Search YouTube
╰───────────────────────────

╭───「 *👥 GROUP COMMANDS* 」
│ 🔹 ${config.prefix}tagall <text> - Tag all group members
│ 🔹 ${config.prefix}hidetag <text> - Invisible tag for all
│ 🔹 ${config.prefix}groupinfo - Get group information
│ 🔹 ${config.prefix}kick @user - Remove member (Admin only)
│ 🔹 ${config.prefix}promote @user - Make admin
│ 🔹 ${config.prefix}demote @user - Dismiss admin
│ 🔹 ${config.prefix}savecontacts - Save all group contacts to phone (VCF)
│ 🔹 ${config.prefix}getmembers - View all member numbers
╰───────────────────────────

╭───「 *🛠️ UTILITIES* 」
│ 🔹 ${config.prefix}calc <math> - Calculate math expression
│ 🔹 ${config.prefix}weather <city> - Weather information
│ 🔹 ${config.prefix}fact - Random interesting fact
│ 🔹 ${config.prefix}joke - Random funny joke
╰───────────────────────────

╭───「 *👑 OWNER* 」
│ 🔹 ${config.prefix}restart - Restart the bot
│ 🔹 ${config.prefix}setprefix <symbol> - Change prefix
│ 🔹 ${config.prefix}mode <public/private> - Switch mode
╰───────────────────────────

> ${config.footer}`;

      await sock.sendMessage(m.chat, { text: menuText }, { quoted: m });
    },
  },

  alive: {
    name: "alive",
    alias: ["bot"],
    category: "general",
    desc: "Check if PASIYA-MD is online",
    async execute(sock, m) {
      const uptime = runtime(process.uptime());
      const text = config.aliveMsg.replace("{uptime}", uptime);
      await sock.sendMessage(m.chat, { text }, { quoted: m });
    },
  },

  ping: {
    name: "ping",
    alias: ["speed"],
    category: "general",
    desc: "Check response latency",
    async execute(sock, m) {
      const start = Date.now();
      const testMsg = await sock.sendMessage(m.chat, { text: "⚡ *Testing ping...*" }, { quoted: m });
      const lat = Date.now() - start;
      await sock.sendMessage(
        m.chat,
        { text: `🚀 *Pong!* \n⚡ *Latency:* ${lat}ms\n👑 *Bot:* ${config.botName}` },
        { quoted: m }
      );
    },
  },

  owner: {
    name: "owner",
    alias: ["creator", "developer"],
    category: "general",
    desc: "Show owner contact",
    async execute(sock, m) {
      const ownerNum = config.ownerNumber[0] || "94700000000";
      const vcard =
        "BEGIN:VCARD\n" +
        "VERSION:3.0\n" +
        `FN:${config.ownerName}\n` +
        `ORG:${config.botName} Developer;\n` +
        `TEL;type=CELL;type=VOICE;waid=${ownerNum}:+${ownerNum}\n` +
        "END:VCARD";

      await sock.sendMessage(
        m.chat,
        {
          contacts: {
            displayName: config.ownerName,
            contacts: [{ vcard }],
          },
        },
        { quoted: m }
      );
    },
  },

  botinfo: {
    name: "botinfo",
    alias: ["info"],
    category: "general",
    desc: "Show system info",
    async execute(sock, m) {
      const uptime = runtime(process.uptime());
      const info = `
*👑 PASIYA-MD BOT INFORMATION 👑*

🤖 *Bot Name:* ${config.botName}
👑 *Developer:* ${config.ownerName}
⚙️ *Platform:* Node.js (${process.version})
💻 *OS:* ${os.type()} ${os.release()}
⏱️ *Uptime:* ${uptime}
📁 *Work Mode:* ${config.workMode}

> ${config.footer}`;
      await sock.sendMessage(m.chat, { text: info }, { quoted: m });
    },
  },
};
