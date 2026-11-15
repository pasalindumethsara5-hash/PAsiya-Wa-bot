const config = require("../config");

// ─── Persistent Maps for group features ───────────────────────────────────────
const antilinkGroups = new Map(); // chatId -> true
const welcomeGroups  = new Map(); // chatId -> message string
const goodbyeGroups  = new Map(); // chatId -> message string

// ─── Helper: get group admins ─────────────────────────────────────────────────
async function getAdmins(sock, chatId) {
  const meta = await sock.groupMetadata(chatId);
  return meta.participants.filter((p) => p.admin).map((p) => p.id);
}

module.exports = {
  // ─── Existing commands ──────────────────────────────────────────────────────

  tagall: {
    name: "tagall",
    alias: ["everyone", "all"],
    category: "group",
    desc: "Tag all members in the group",
    async execute(sock, m, args) {
      if (!m.isGroup) {
        return sock.sendMessage(m.chat, { text: "❌ *This command can only be used in groups!*" }, { quoted: m });
      }

      try {
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants || [];
        const message = args.join(" ") || "Attention everyone!";

        let text = `📢 *PASIYA-MD GROUP MENTION* 📢\n\n💬 *Message:* ${message}\n👥 *Total Members:* ${participants.length}\n\n`;
        const mentions = [];

        for (let mem of participants) {
          text += `👉 @${mem.id.split("@")[0]}\n`;
          mentions.push(mem.id);
        }

        text += `\n> ${config.footer}`;

        await sock.sendMessage(m.chat, { text, mentions }, { quoted: m });
      } catch (err) {
        console.error("Tagall error:", err);
        await sock.sendMessage(m.chat, { text: "❌ *Failed to fetch group members!*" }, { quoted: m });
      }
    },
  },

  hidetag: {
    name: "hidetag",
    alias: ["htag"],
    category: "group",
    desc: "Broadcast message to all group members without showing the tag list",
    async execute(sock, m, args) {
      if (!m.isGroup) {
        return sock.sendMessage(m.chat, { text: "❌ *This command can only be used in groups!*" }, { quoted: m });
      }

      const text = args.join(" ");
      if (!text) {
        return sock.sendMessage(
          m.chat,
          { text: `⚠️ *Please provide a message!*\n\n*Example:* ${config.prefix}hidetag Good morning all!` },
          { quoted: m }
        );
      }

      try {
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants.map((p) => p.id);

        await sock.sendMessage(m.chat, { text, mentions: participants }, { quoted: m });
      } catch (err) {
        console.error("Hidetag error:", err);
      }
    },
  },

  groupinfo: {
    name: "groupinfo",
    alias: ["gcinfo"],
    category: "group",
    desc: "Display details about current group",
    async execute(sock, m) {
      if (!m.isGroup) {
        return sock.sendMessage(m.chat, { text: "❌ *This command can only be used in groups!*" }, { quoted: m });
      }

      try {
        const groupMetadata = await sock.groupMetadata(m.chat);
        const admins = groupMetadata.participants.filter((p) => p.admin).length;

        const info = `
╭───「 *GROUP DETAILS* 」───
│ 🏷️ *Name:* ${groupMetadata.subject}
│ 🆔 *ID:* ${groupMetadata.id}
│ 👥 *Members:* ${groupMetadata.participants.length}
│ 👑 *Admins:* ${admins}
│ 📅 *Created:* ${new Date(groupMetadata.creation * 1000).toDateString()}
│ 📝 *Description:*
│ ${groupMetadata.desc || "No description set"}
╰───────────────────────────

> ${config.footer}`;

        await sock.sendMessage(m.chat, { text: info }, { quoted: m });
      } catch (err) {
        console.error("Groupinfo error:", err);
      }
    },
  },

  kick: {
    name: "kick",
    alias: ["remove"],
    category: "group",
    desc: "Remove member from group",
    async execute(sock, m, args) {
      if (!m.isGroup) return sock.sendMessage(m.chat, { text: "❌ Group only!" }, { quoted: m });

      let user = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
      if (!user && args[0]) {
        user = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
      }

      if (!user) {
        return sock.sendMessage(m.chat, { text: "⚠️ *Please mention or quote the user to kick!*" }, { quoted: m });
      }

      try {
        await sock.groupParticipantsUpdate(m.chat, [user], "remove");
        await sock.sendMessage(m.chat, { text: `✅ *Successfully kicked:* @${user.split("@")[0]}`, mentions: [user] }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "❌ *Failed to kick user. Make sure PASIYA-MD is an admin!*" }, { quoted: m });
      }
    },
  },

  promote: {
    name: "promote",
    alias: ["admin"],
    category: "group",
    desc: "Promote member to group admin",
    async execute(sock, m) {
      if (!m.isGroup) return sock.sendMessage(m.chat, { text: "❌ Group only!" }, { quoted: m });
      let user = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
      if (!user) return sock.sendMessage(m.chat, { text: "⚠️ *Mention the user to promote!*" }, { quoted: m });

      try {
        await sock.groupParticipantsUpdate(m.chat, [user], "promote");
        await sock.sendMessage(m.chat, { text: `👑 *Promoted to Admin:* @${user.split("@")[0]}`, mentions: [user] }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "❌ *Failed. Ensure bot is admin!*" }, { quoted: m });
      }
    },
  },

  demote: {
    name: "demote",
    alias: ["unadmin"],
    category: "group",
    desc: "Demote admin to normal member",
    async execute(sock, m) {
      if (!m.isGroup) return sock.sendMessage(m.chat, { text: "❌ Group only!" }, { quoted: m });
      let user = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
      if (!user) return sock.sendMessage(m.chat, { text: "⚠️ *Mention the admin to demote!*" }, { quoted: m });

      try {
        await sock.groupParticipantsUpdate(m.chat, [user], "demote");
        await sock.sendMessage(m.chat, { text: `🔻 *Demoted from Admin:* @${user.split("@")[0]}`, mentions: [user] }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "❌ *Failed. Ensure bot is admin!*" }, { quoted: m });
      }
    },
  },

  // ─── New commands ───────────────────────────────────────────────────────────

  antilink: {
    name: "antilink",
    alias: ["antilnk"],
    category: "group",
    desc: "Toggle anti-link protection for this group (owner/admin only)",
    async execute(sock, m, args) {
      if (!m.isGroup) return sock.sendMessage(m.chat, { text: "❌ *Group only!*" }, { quoted: m });

      const admins = await getAdmins(sock, m.chat);
      const isAdmin = admins.includes(m.sender) || m.sender === config.owner + "@s.whatsapp.net";
      if (!isAdmin) return sock.sendMessage(m.chat, { text: "❌ *Owner/Admin only!*" }, { quoted: m });

      const toggle = (args[0] || "").toLowerCase();
      if (toggle === "on") {
        antilinkGroups.set(m.chat, true);
        await sock.sendMessage(m.chat, { text: "🔗 *Anti-link is now* *ON* ✅\n\nAny links shared will be deleted and the sender warned." }, { quoted: m });
      } else if (toggle === "off") {
        antilinkGroups.delete(m.chat);
        await sock.sendMessage(m.chat, { text: "🔗 *Anti-link is now* *OFF* ❌" }, { quoted: m });
      } else {
        const status = antilinkGroups.has(m.chat) ? "ON ✅" : "OFF ❌";
        await sock.sendMessage(
          m.chat,
          { text: `🔗 *Anti-link is currently:* ${status}\n\n*Usage:* ${config.prefix}antilink on/off` },
          { quoted: m }
        );
      }
    },
  },

  welcome: {
    name: "welcome",
    alias: ["setwelcome"],
    category: "group",
    desc: "Toggle welcome messages for new members (owner/admin only)",
    async execute(sock, m, args) {
      if (!m.isGroup) return sock.sendMessage(m.chat, { text: "❌ *Group only!*" }, { quoted: m });

      const admins = await getAdmins(sock, m.chat);
      const isAdmin = admins.includes(m.sender) || m.sender === config.owner + "@s.whatsapp.net";
      if (!isAdmin) return sock.sendMessage(m.chat, { text: "❌ *Owner/Admin only!*" }, { quoted: m });

      const toggle = (args[0] || "").toLowerCase();
      if (toggle === "on") {
        const customMsg = args.slice(1).join(" ") || "Welcome to the group, {name}! 🎉";
        welcomeGroups.set(m.chat, customMsg);
        await sock.sendMessage(
          m.chat,
          { text: `👋 *Welcome messages* *ON* ✅\n\n*Message:* ${customMsg}\n\n_Use {name} as placeholder for new member's name._` },
          { quoted: m }
        );
      } else if (toggle === "off") {
        welcomeGroups.delete(m.chat);
        await sock.sendMessage(m.chat, { text: "👋 *Welcome messages* *OFF* ❌" }, { quoted: m });
      } else {
        const current = welcomeGroups.get(m.chat);
        const status = current ? `ON ✅\n*Message:* ${current}` : "OFF ❌";
        await sock.sendMessage(
          m.chat,
          { text: `👋 *Welcome messages:* ${status}\n\n*Usage:* ${config.prefix}welcome on Hello {name}!` },
          { quoted: m }
        );
      }
    },
  },

  goodbye: {
    name: "goodbye",
    alias: ["setgoodbye", "bye"],
    category: "group",
    desc: "Toggle goodbye messages for leaving members (owner/admin only)",
    async execute(sock, m, args) {
      if (!m.isGroup) return sock.sendMessage(m.chat, { text: "❌ *Group only!*" }, { quoted: m });

      const admins = await getAdmins(sock, m.chat);
      const isAdmin = admins.includes(m.sender) || m.sender === config.owner + "@s.whatsapp.net";
      if (!isAdmin) return sock.sendMessage(m.chat, { text: "❌ *Owner/Admin only!*" }, { quoted: m });

      const toggle = (args[0] || "").toLowerCase();
      if (toggle === "on") {
        const customMsg = args.slice(1).join(" ") || "Goodbye {name}, we'll miss you! 👋";
        goodbyeGroups.set(m.chat, customMsg);
        await sock.sendMessage(
          m.chat,
          { text: `🚪 *Goodbye messages* *ON* ✅\n\n*Message:* ${customMsg}\n\n_Use {name} as placeholder for the member's name._` },
          { quoted: m }
        );
      } else if (toggle === "off") {
        goodbyeGroups.delete(m.chat);
        await sock.sendMessage(m.chat, { text: "🚪 *Goodbye messages* *OFF* ❌" }, { quoted: m });
      } else {
        const current = goodbyeGroups.get(m.chat);
        const status = current ? `ON ✅\n*Message:* ${current}` : "OFF ❌";
        await sock.sendMessage(
          m.chat,
          { text: `🚪 *Goodbye messages:* ${status}\n\n*Usage:* ${config.prefix}goodbye on Bye {name}!` },
          { quoted: m }
        );
      }
    },
  },

  poll: {
    name: "poll",
    alias: ["vote"],
    category: "group",
    desc: "Create a WhatsApp native poll",
    async execute(sock, m, args) {
      if (!m.isGroup) return sock.sendMessage(m.chat, { text: "❌ *Group only!*" }, { quoted: m });

      const input = args.join(" ");
      if (!input.includes("|")) {
        return sock.sendMessage(
          m.chat,
          { text: `📊 *Usage:* ${config.prefix}poll Question | Option1 | Option2 | Option3\n\n*Example:* ${config.prefix}poll Favourite color? | Red | Blue | Green` },
          { quoted: m }
        );
      }

      const parts = input.split("|").map((s) => s.trim()).filter(Boolean);
      if (parts.length < 3) {
        return sock.sendMessage(
          m.chat,
          { text: "⚠️ *A poll needs at least a question and 2 options!*" },
          { quoted: m }
        );
      }

      const question = parts[0];
      const options  = parts.slice(1);

      try {
        await sock.sendMessage(m.chat, {
          poll: { name: question, values: options, selectableCount: 1 },
        });
      } catch (err) {
        console.error("Poll error:", err);
        await sock.sendMessage(m.chat, { text: "❌ *Failed to create poll!*" }, { quoted: m });
      }
    },
  },

  mute: {
    name: "mute",
    alias: ["lock"],
    category: "group",
    desc: "Close group – only admins can send messages",
    async execute(sock, m) {
      if (!m.isGroup) return sock.sendMessage(m.chat, { text: "❌ *Group only!*" }, { quoted: m });

      const admins = await getAdmins(sock, m.chat);
      if (!admins.includes(m.sender)) {
        return sock.sendMessage(m.chat, { text: "❌ *Admin only!*" }, { quoted: m });
      }

      try {
        await sock.groupSettingUpdate(m.chat, "announcement");
        await sock.sendMessage(m.chat, { text: "🔇 *Group muted!* Only admins can send messages now." }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "❌ *Failed to mute group. Ensure bot is admin!*" }, { quoted: m });
      }
    },
  },

  unmute: {
    name: "unmute",
    alias: ["unlock"],
    category: "group",
    desc: "Open group – everyone can send messages",
    async execute(sock, m) {
      if (!m.isGroup) return sock.sendMessage(m.chat, { text: "❌ *Group only!*" }, { quoted: m });

      const admins = await getAdmins(sock, m.chat);
      if (!admins.includes(m.sender)) {
        return sock.sendMessage(m.chat, { text: "❌ *Admin only!*" }, { quoted: m });
      }

      try {
        await sock.groupSettingUpdate(m.chat, "not_announcement");
        await sock.sendMessage(m.chat, { text: "🔊 *Group unmuted!* Everyone can send messages now." }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "❌ *Failed to unmute group. Ensure bot is admin!*" }, { quoted: m });
      }
    },
  },

  // ─── Export Maps for external use ──────────────────────────────────────────
  antilinkGroups,
  welcomeGroups,
  goodbyeGroups,
};
