const config = require("../config");

module.exports = {
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
};
