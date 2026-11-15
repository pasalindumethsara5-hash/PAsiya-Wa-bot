const config = require("../config");
const { runtime } = require("../lib/functions");
const os = require("os");

module.exports = {
  menu: {
    name: "menu",
    alias: ["help", "list", "commands"],
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
│ 🔹 ${config.prefix}alive - Check bot online status
│ 🔹 ${config.prefix}ping - Response latency test
│ 🔹 ${config.prefix}menu - Display this command list
│ 🔹 ${config.prefix}owner - Show owner contact card
│ 🔹 ${config.prefix}botinfo - Bot specifications & OS
╰───────────────────────────

╭───「 *🤖 AI & TRANSLATION* 」
│ 🔹 ${config.prefix}ai <query> - Chat with smart AI
│ 🔹 ${config.prefix}voiceai <prompt> - Talking AI voice note
│ 🔹 ${config.prefix}vision - Reply to photo to inspect
│ 🔹 ${config.prefix}imagine <prompt> - Generate AI image
│ 🔹 ${config.prefix}translate <text> - Translate to Sinhala
│ 🔹 ${config.prefix}tr <lang> <text> - Translate to any language
╰───────────────────────────

╭───「 *🎙️ AUDIO EFFECTS & VOICE CHANGER* 」
│ 🔹 ${config.prefix}bass - Heavy bass boost audio
│ 🔹 ${config.prefix}nightcore - Fast nightcore remix
│ 🔹 ${config.prefix}slow - Slowed + reverb lofi vibe
│ 🔹 ${config.prefix}robot - Robotic synth voice
│ 🔹 ${config.prefix}deep - Deep pitch voice effect
│ 🔹 ${config.prefix}reverse - Play audio in reverse
│ 🔹 ${config.prefix}fast - 1.4x speed up audio
│ 🔹 ${config.prefix}tomp3 - Convert VN/video to MP3
╰───────────────────────────

╭───「 *🎨 MEDIA & STICKERS* 」
│ 🔹 ${config.prefix}sticker (or ${config.prefix}s) - Quoted image to sticker
│ 🔹 ${config.prefix}take <pack> | <author> - Steal & rename sticker
│ 🔹 ${config.prefix}toimg - Quoted sticker to image
│ 🔹 ${config.prefix}attp <text> - Text to animated sticker
│ 🔹 ${config.prefix}emojimix <😀> <🔥> - Mix two emojis
│ 🔹 ${config.prefix}tts <text> - Text to speech voice note
╰───────────────────────────

╭───「 *📥 DOWNLOADERS & STATUS* 」
│ 🔹 ${config.prefix}save - Reply to status to download
│ 🔹 ${config.prefix}song <name> - Search & download audio (MP3/MP4)
│ 🔹 ${config.prefix}video <name> - Search & download YouTube video
│ 🔹 ${config.prefix}yts <query> - Search YouTube videos
│ 🔹 ${config.prefix}tiktok <url> - Download TikTok (No Watermark)
│ 🔹 ${config.prefix}ig <url> - Download Instagram Reels / Post
╰───────────────────────────

╭───「 *👥 GROUP MANAGEMENT* 」
│ 🔹 ${config.prefix}tagall <text> - Mention all members
│ 🔹 ${config.prefix}hidetag <text> - Ghost broadcast to all
│ 🔹 ${config.prefix}antilink on/off - Block links in group
│ 🔹 ${config.prefix}welcome on/off - Set welcome message
│ 🔹 ${config.prefix}goodbye on/off - Set goodbye message
│ 🔹 ${config.prefix}poll Q | Opt1 | Opt2 - Create group poll
│ 🔹 ${config.prefix}mute - Close group (Admin only)
│ 🔹 ${config.prefix}unmute - Open group (Admin only)
│ 🔹 ${config.prefix}kick @user - Remove member
│ 🔹 ${config.prefix}promote @user - Make admin
│ 🔹 ${config.prefix}demote @user - Dismiss admin
│ 🔹 ${config.prefix}groupinfo - View group details
│ 🔹 ${config.prefix}savecontacts - Export members to VCF file
│ 🔹 ${config.prefix}getmembers - View all member numbers
╰───────────────────────────

╭───「 *🛠️ UTILITIES & TOOLS* 」
│ 🔹 ${config.prefix}qr <text/url> - Generate QR Code image
│ 🔹 ${config.prefix}shorturl <url> - Shorten long web link
│ 🔹 ${config.prefix}define <word> - English dictionary definition
│ 🔹 ${config.prefix}news - Latest top news headlines
│ 🔹 ${config.prefix}remind 5m <task> - Set a reminder timer
│ 🔹 ${config.prefix}lyrics <song> - Search song lyrics
│ 🔹 ${config.prefix}color <hex> - Color hex details & preview
│ 🔹 ${config.prefix}calc <math> - Calculate math expression
│ 🔹 ${config.prefix}weather <city> - Real-time weather report
│ 🔹 ${config.prefix}fact - Random mind-blowing fact
│ 🔹 ${config.prefix}joke - Funny random joke
╰───────────────────────────

╭───「 *🎮 FUN & GAMES* 」
│ 🔹 ${config.prefix}8ball <question> - Magic 8-Ball oracle
│ 🔹 ${config.prefix}roast [@user] - Savage roast delivery
│ 🔹 ${config.prefix}ship @p1 @p2 - Love match percentage
│ 🔹 ${config.prefix}quote - Inspiring quote of the day
│ 🔹 ${config.prefix}meme - Random trending meme
│ 🔹 ${config.prefix}truth - Truth or Dare: Truth question
│ 🔹 ${config.prefix}dare - Truth or Dare: Dare challenge
│ 🔹 ${config.prefix}rps <rock/paper/scissors> - Play vs bot
│ 🔹 ${config.prefix}flip - Flip a coin (Heads/Tails)
│ 🔹 ${config.prefix}dice - Roll a 6-sided dice
╰───────────────────────────

╭───「 *👑 OWNER CONTROLS* 」
│ 🔹 ${config.prefix}antiban - Live anti-ban protection stats
│ 🔹 ${config.prefix}restart - Reboot the bot process
│ 🔹 ${config.prefix}setprefix <sym> - Change command prefix
│ 🔹 ${config.prefix}mode <public/private> - Switch bot mode
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
      await sock.sendMessage(m.chat, { text: "⚡ *Testing ping...*" }, { quoted: m });
      const lat = Date.now() - start;
      await sock.sendMessage(
        m.chat,
        { text: `🚀 *Pong!*\n⚡ *Latency:* ${lat}ms\n👑 *Bot:* ${config.botName}` },
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
