const config = require("../config");
const { getAntiBanStats } = require("../lib/antiban");

module.exports = {
  antiban: {
    name: "antiban",
    alias: ["antibann", "banstats", "protection"],
    category: "owner",
    desc: "Check anti-ban protection status",
    async execute(sock, m) {
      if (!m.isOwner) {
        return sock.sendMessage(m.chat, { text: "❌ *Owner only!*" }, { quoted: m });
      }
      const stats = getAntiBanStats();
      const text = `🛡️ *ANTI-BAN PROTECTION STATUS*

📊 *Messages Sent:*
├ Per Minute: ${stats.globalPerMinute}/25
├ Per Hour: ${stats.globalPerHour}/200
└ Today: ${stats.globalToday}/1000

💬 Auto-Replies (this hour): ${stats.autoRepliesThisHour}/20
🚫 Active Spam Blocks: ${stats.activeSpamBlocks}
🌙 Night Mode: ${stats.isNight ? "ON 🔵" : "OFF ⚪"}
👥 Tracked Users: ${stats.trackedUsers}
💭 Tracked Chats: ${stats.trackedChats}

✅ *All protections ACTIVE*

> ${config.footer}`;
      await sock.sendMessage(m.chat, { text }, { quoted: m });
    },
  },


  restart: {
    name: "restart",
    alias: ["reboot"],
    category: "owner",
    desc: "Restart the bot process",
    async execute(sock, m) {
      if (!m.isOwner) {
        return sock.sendMessage(m.chat, { text: "❌ *This command is only for the bot owner (PASIYA)!*" }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "🔄 *Restarting PASIYA-MD... Please wait!*" }, { quoted: m });
      setTimeout(() => {
        process.exit(0);
      }, 1500);
    },
  },

  setprefix: {
    name: "setprefix",
    alias: ["prefix"],
    category: "owner",
    desc: "Change command prefix",
    async execute(sock, m, args) {
      if (!m.isOwner) {
        return sock.sendMessage(m.chat, { text: "❌ *Owner only!*" }, { quoted: m });
      }
      if (!args[0]) {
        return sock.sendMessage(m.chat, { text: `⚠️ *Provide new prefix! Current:* ${config.prefix}` }, { quoted: m });
      }
      config.prefix = args[0];
      await sock.sendMessage(m.chat, { text: `✅ *Prefix successfully changed to:* ${config.prefix}` }, { quoted: m });
    },
  },

  mode: {
    name: "mode",
    alias: ["workmode"],
    category: "owner",
    desc: "Switch between public and private mode",
    async execute(sock, m, args) {
      if (!m.isOwner) return sock.sendMessage(m.chat, { text: "❌ *Owner only!*" }, { quoted: m });
      const targetMode = args[0] ? args[0].toLowerCase() : "";

      if (targetMode === "public" || targetMode === "private") {
        config.workMode = targetMode;
        await sock.sendMessage(m.chat, { text: `✅ *Bot work mode set to:* ${config.workMode.toUpperCase()}` }, { quoted: m });
      } else {
        await sock.sendMessage(
          m.chat,
          { text: `⚠️ *Usage:* ${config.prefix}mode public OR ${config.prefix}mode private\n*Current:* ${config.workMode}` },
          { quoted: m }
        );
      }
    },
  },
};
