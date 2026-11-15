const config = require("../config");
const fs = require("fs");
const path = require("path");

module.exports = {
  savecontacts: {
    name: "savecontacts",
    alias: ["getcontacts", "vcf", "saveall"],
    category: "group",
    desc: "Export all group members as a VCF contact file to save to phone",
    async execute(sock, m, args) {
      if (!m.isGroup) {
        return sock.sendMessage(
          m.chat,
          { text: "❌ *This command can only be used inside a WhatsApp Group!*" },
          { quoted: m }
        );
      }

      await sock.sendMessage(
        m.chat,
        { text: "📋 *Fetching group members and generating contact file... Please wait!*" },
        { quoted: m }
      );

      try {
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const groupName = groupMetadata.subject || "Group";

        let vcfContent = "";
        let count = 0;

        for (const participant of participants) {
          const number = participant.id.split("@")[0];
          
          // Skip the bot's own number
          const botNumber = sock.user.id.split(":")[0].split("@")[0];
          if (number === botNumber) continue;

          // Skip the requester's number (they already have themselves saved)
          const senderNumber = m.sender ? m.sender.split("@")[0] : "";
          if (number === senderNumber) continue;

          const isAdmin = participant.admin ? " [Admin]" : "";
          const displayName = `WA${isAdmin} - ${number}`;

          vcfContent += `BEGIN:VCARD\n`;
          vcfContent += `VERSION:3.0\n`;
          vcfContent += `FN:${displayName}\n`;
          vcfContent += `TEL;TYPE=CELL:+${number}\n`;
          vcfContent += `NOTE:Saved from ${groupName} via PASIYA-MD Bot\n`;
          vcfContent += `END:VCARD\n\n`;

          count++;
        }

        if (count === 0) {
          return sock.sendMessage(
            m.chat,
            { text: "⚠️ *No contacts found to save (all members are already in your contact list or group is empty).*" },
            { quoted: m }
          );
        }

        // Save VCF file temporarily
        const fileName = `PASIYA-MD-${groupName.replace(/[^a-zA-Z0-9]/g, "_")}-contacts.vcf`;
        const filePath = path.join(__dirname, "..", fileName);
        fs.writeFileSync(filePath, vcfContent, "utf8");

        // Send VCF as document
        await sock.sendMessage(
          m.chat,
          {
            document: fs.readFileSync(filePath),
            mimetype: "text/vcard",
            fileName: fileName,
            caption: `📱 *PASIYA-MD Contact Exporter* 📱\n\n👥 *Group:* ${groupName}\n✅ *Contacts:* ${count} members\n\n*How to import:*\n1️⃣ Download this file\n2️⃣ Open it on your phone\n3️⃣ Tap "Import" or "Add all contacts"\n4️⃣ All ${count} numbers saved! ✅\n\n> ${config.footer}`,
          },
          { quoted: m }
        );

        // Clean up temp file
        fs.unlinkSync(filePath);

      } catch (err) {
        console.error("SaveContacts Error:", err);
        await sock.sendMessage(
          m.chat,
          { text: "❌ *Failed to generate contact file. Please try again!*" },
          { quoted: m }
        );
      }
    },
  },

  getmembers: {
    name: "getmembers",
    alias: ["members", "memberlist"],
    category: "group",
    desc: "Get list of all group member numbers",
    async execute(sock, m) {
      if (!m.isGroup) {
        return sock.sendMessage(m.chat, { text: "❌ *Group only!*" }, { quoted: m });
      }

      try {
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const groupName = groupMetadata.subject || "Group";

        let text = `📋 *${groupName} - Member List*\n`;
        text += `👥 *Total: ${participants.length} members*\n\n`;

        let i = 1;
        for (const p of participants) {
          const num = p.id.split("@")[0];
          const role = p.admin === "superadmin" ? " 👑" : p.admin === "admin" ? " ⭐" : "";
          text += `${i}. +${num}${role}\n`;
          i++;
        }

        text += `\n👑 = Group Creator | ⭐ = Admin\n> ${config.footer}`;

        await sock.sendMessage(m.chat, { text }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "❌ *Failed to get members list!*" }, { quoted: m });
      }
    },
  },
};
