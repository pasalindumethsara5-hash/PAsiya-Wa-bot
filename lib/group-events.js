/**
 * group-events.js
 * Handles group participant join/leave events and anti-link enforcement.
 * Imported by the main bot socket handler.
 */

const { antilinkGroups, welcomeGroups, goodbyeGroups } = require("../commands/group");

// ─── Link detection regex ─────────────────────────────────────────────────────
const LINK_REGEX = /https?:\/\/[^\s]+|wa\.me\/[^\s]+|chat\.whatsapp\.com\/[^\s]+/i;

/**
 * handleGroupParticipants
 * Call this inside sock.ev.on("group-participants.update", ...)
 *
 * @param {object} sock  - Baileys socket instance
 * @param {object} event - The group-participants.update event payload
 *   { id: chatId, participants: [jid, ...], action: "add"|"remove"|"leave"|"promote"|"demote" }
 */
async function handleGroupParticipants(sock, event) {
  const { id: chatId, participants, action } = event;

  try {
    if (action === "add") {
      // ── Welcome message ──────────────────────────────────────────────────────
      if (welcomeGroups.has(chatId)) {
        const template = welcomeGroups.get(chatId);

        for (const jid of participants) {
          const number = jid.split("@")[0];
          // Try to get a push name; fall back to the number
          let name = number;
          try {
            const contact = await sock.getContactInfo?.(jid);
            if (contact?.notify) name = contact.notify;
          } catch (_) {}

          const text = template.replace(/\{name\}/gi, name);
          const mentions = [jid];

          await sock.sendMessage(chatId, {
            text: `👋 ${text}`,
            mentions,
          });
        }
      }
    } else if (action === "remove" || action === "leave") {
      // ── Goodbye message ──────────────────────────────────────────────────────
      if (goodbyeGroups.has(chatId)) {
        const template = goodbyeGroups.get(chatId);

        for (const jid of participants) {
          const number = jid.split("@")[0];
          const name   = number; // contact already left, push name unavailable

          const text = template.replace(/\{name\}/gi, name);

          await sock.sendMessage(chatId, { text: `🚪 ${text}` });
        }
      }
    }
  } catch (err) {
    console.error("[group-events] handleGroupParticipants error:", err);
  }
}

/**
 * handleAntiLink
 * Call this inside your message handler, before processing commands.
 *
 * @param {object} sock - Baileys socket instance
 * @param {object} m    - Parsed message object (expects m.chat, m.sender, m.key, m.isGroup)
 * @param {string} body - Raw text body of the message
 * @returns {boolean}   - true if a link was detected & action was taken (caller should stop processing)
 */
async function handleAntiLink(sock, m, body) {
  if (!m.isGroup) return false;
  if (!antilinkGroups.has(m.chat)) return false;
  if (!LINK_REGEX.test(body)) return false;

  try {
    // Check if sender is admin or owner – they are exempt
    const groupMetadata = await sock.groupMetadata(m.chat);
    const admins = groupMetadata.participants
      .filter((p) => p.admin)
      .map((p) => p.id);

    // Also exempt the bot owner if config is available
    let ownerJid = null;
    try {
      const config = require("../config");
      ownerJid = config.owner ? config.owner + "@s.whatsapp.net" : null;
    } catch (_) {}

    const isExempt = admins.includes(m.sender) || (ownerJid && m.sender === ownerJid);
    if (isExempt) return false;

    // Delete the message
    await sock.sendMessage(m.chat, {
      delete: m.key,
    });

    // Warn the user
    const number = m.sender.split("@")[0];
    await sock.sendMessage(m.chat, {
      text: `⚠️ @${number} *Links are not allowed in this group!*\nYour message has been deleted.`,
      mentions: [m.sender],
    });

    return true; // link was handled
  } catch (err) {
    console.error("[group-events] handleAntiLink error:", err);
    return false;
  }
}

module.exports = { handleGroupParticipants, handleAntiLink };
