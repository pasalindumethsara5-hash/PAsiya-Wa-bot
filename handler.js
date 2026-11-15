const fs = require("fs");
const path = require("path");
const config = require("./config");
const downloadModule = require("./commands/download");
const { checkAutoReply } = require("./lib/autoreply");
const { handleAntiLink } = require("./lib/group-events");
const {
  humanDelay,
  simulateTyping,
  waitForMessageQueue,
  isGlobalRateLimited,
  recordGlobalMessage,
  isUserOnCooldown,
  recordUserCommand,
  isAutoReplyThrottled,
  recordAutoReply,
  isSpammer,
  isChatFlooded,
  recordChatMessage,
  getStatusReadDelay,
  isNightTime,
} = require("./lib/antiban");

// Load all command modules
const commands = new Map();
const aliases = new Map();

function loadCommands() {
  const commandsDir = path.join(__dirname, "commands");
  const files = fs.readdirSync(commandsDir);

  for (const file of files) {
    if (file.endsWith(".js")) {
      try {
        const module = require(path.join(commandsDir, file));
        for (const key in module) {
          const cmd = module[key];
          if (cmd && cmd.name) {
            commands.set(cmd.name.toLowerCase(), cmd);
            if (cmd.alias && Array.isArray(cmd.alias)) {
              for (const al of cmd.alias) {
                aliases.set(al.toLowerCase(), cmd.name.toLowerCase());
              }
            }
          }
        }
      } catch (e) {
        console.error(`[LOAD ERROR] ${file}:`, e.message);
      }
    }
  }
  console.log(`[PASIYA-MD] ✅ Loaded ${commands.size} commands, ${aliases.size} aliases.`);
}

loadCommands();

/**
 * Diagnostic debug logger to console and bot_debug.log
 */
function debugLog(text) {
  const time = new Date().toLocaleTimeString();
  const line = `[${time}] ${text}`;
  console.log(line);
  try {
    fs.appendFileSync(path.join(__dirname, "bot_debug.log"), line + "\n");
  } catch (e) {}
}

/**
 * Robust extraction of message body from any WhatsApp message container
 */
function getMessageBody(m) {
  if (!m || !m.message) return "";

  let msg = m.message;

  // Unwrap containers
  if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message;
  if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message;
  if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message;
  if (msg.documentWithCaptionMessage) msg = msg.documentWithCaptionMessage.message;
  if (msg.editedMessage) {
    msg = msg.editedMessage.message?.protocolMessage?.editedMessage || msg.editedMessage.message;
  }

  if (!msg) return "";

  // Direct conversation
  if (typeof msg.conversation === "string" && msg.conversation) {
    return msg.conversation;
  }

  // Extended text
  if (typeof msg.extendedTextMessage?.text === "string" && msg.extendedTextMessage.text) {
    return msg.extendedTextMessage.text;
  }

  // Captions
  if (typeof msg.imageMessage?.caption === "string") return msg.imageMessage.caption;
  if (typeof msg.videoMessage?.caption === "string") return msg.videoMessage.caption;
  if (typeof msg.documentMessage?.caption === "string") return msg.documentMessage.caption;

  // Buttons / Interactive responses
  if (msg.buttonsResponseMessage?.selectedButtonId) return msg.buttonsResponseMessage.selectedButtonId;
  if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) return msg.listResponseMessage.singleSelectReply.selectedRowId;
  if (msg.templateButtonReplyMessage?.selectedId) return msg.templateButtonReplyMessage.selectedId;

  // Fallback scan across keys (ignoring metadata)
  for (const key of Object.keys(msg)) {
    if (key === "messageContextInfo") continue;
    if (msg[key] && typeof msg[key].text === "string") return msg[key].text;
    if (msg[key] && typeof msg[key].caption === "string") return msg[key].caption;
  }

  return "";
}

/**
 * Safe sendMessage: retries without quoted if quoted message fails (crucial for self-chat / LID)
 */
async function safeSend(sock, jid, content, options = {}) {
  try {
    return await sock.sendMessage(jid, content, options);
  } catch (err) {
    if (options && options.quoted) {
      try {
        const { quoted, ...fallbackOptions } = options;
        return await sock.sendMessage(jid, content, fallbackOptions);
      } catch (err2) {
        debugLog(`[SEND ERROR] ${err2.message}`);
      }
    } else {
      debugLog(`[SEND ERROR] ${err.message}`);
    }
  }
}

/**
 * Handle a single incoming or outgoing WhatsApp message
 */
async function processSingleMessage(sock, m, messageStore) {
  if (!m || !m.message) return;

  const from = m.key.remoteJid;
  if (!from) return;

  // Auto-read & Auto-react to WhatsApp status stories (with random human delay)
  if (from === "status@broadcast") {
    if (config.autoStatusRead) {
      const delay = getStatusReadDelay();
      setTimeout(async () => {
        try {
          await sock.readMessages([m.key]);

          // Auto Status React (with unpredictable mind-blowing emojis)
          if (config.autoStatusReact && m.key.participant) {
            const wildEmojis = [
              "🗿", // Sigma Moai
              "💀", // Dead / Skull
              "🤯", // Mind Blown
              "🫠", // Melting Face
              "🫡", // Respect Salute
              "🥷", // Stealth Ninja
              "👽", // Alien
              "🥶", // Ice Cold
              "🦇", // Batman Dark Knight
              "⚡", // Lightning Bolt
              "👑", // King Crown
              "😈", // Savage Devil
              "👻", // Ghost
              "🪐", // Planet Saturn
              "🚀", // Rocket
              "🔮", // Magic Crystal
              "🔥", // Pure Fire
              "✨", // Sparkles
              "💯", // 100 Legit
              "🖤", // Dark Heart
            ];
            const emoji = config.statusReactEmoji === "random"
              ? wildEmojis[Math.floor(Math.random() * wildEmojis.length)]
              : (config.statusReactEmoji || "🗿");

            await sock.sendMessage(
              "status@broadcast",
              { react: { text: emoji, key: m.key } },
              { statusJidList: [m.key.participant] }
            );
          }
        } catch (e) {}
      }, delay);
    }
    return;
  }

  let msgContent = m.message;
  if (msgContent.ephemeralMessage) msgContent = msgContent.ephemeralMessage.message;
  if (msgContent.viewOnceMessage) msgContent = msgContent.viewOnceMessage.message;
  if (msgContent.viewOnceMessageV2) msgContent = msgContent.viewOnceMessageV2.message;
  if (msgContent.documentWithCaptionMessage) msgContent = msgContent.documentWithCaptionMessage.message;

  const messageType = Object.keys(msgContent)[0];

  // ─── 🛡️ ANTI-DELETE DETECTOR ───────────────────────────────
  if (
    config.antiDelete &&
    msgContent.protocolMessage &&
    (msgContent.protocolMessage.type === 0 || msgContent.protocolMessage.type === "REVOKE")
  ) {
    const deletedKey = msgContent.protocolMessage.key;
    if (deletedKey && deletedKey.id) {
      const stored = messageStore?.get(deletedKey.id);
      if (stored) {
        const whoDeleted = m.key.participant || from;
        const whoDeletedNum = whoDeleted.split("@")[0].replace(/[^0-9]/g, "");
        const pushName = stored.pushName || whoDeletedNum;
        const originalBody = getMessageBody(stored);
        const ownerJid = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";

        const alertHeader = `╭───「 ⚠️ *ANTI-DELETE RECOVERY* 」───\n` +
          `│ 👤 *Deleted by:* @${whoDeletedNum} (${pushName})\n` +
          `│ 💬 *Chat:* ${from.endsWith("@g.us") ? "Group (" + from.split("@")[0] + ")" : "Private Chat"}\n` +
          `│ 🕒 *Time:* ${new Date().toLocaleTimeString()}\n` +
          `╰───────────────────────────\n\n` +
          `📝 *Original Message:*\n${originalBody || "[Media message - Recovering...]"}`;

        try {
          await safeSend(sock, ownerJid, { text: alertHeader, mentions: [whoDeleted] });

          // If deleted message was media, recover and send it to owner
          const innerMsg = stored.message;
          if (innerMsg?.imageMessage || innerMsg?.videoMessage || innerMsg?.audioMessage || innerMsg?.stickerMessage) {
            const { downloadMediaMessage } = require("@whiskeysockets/baileys");
            const buffer = await downloadMediaMessage(stored, "buffer", {});
            if (innerMsg.imageMessage) {
              await safeSend(sock, ownerJid, { image: buffer, caption: `🖼️ Deleted Image from @${whoDeletedNum}`, mentions: [whoDeleted] });
            } else if (innerMsg.videoMessage) {
              await safeSend(sock, ownerJid, { video: buffer, caption: `🎥 Deleted Video from @${whoDeletedNum}`, mentions: [whoDeleted] });
            } else if (innerMsg.audioMessage) {
              await safeSend(sock, ownerJid, { audio: buffer, mimetype: "audio/mp4" });
            } else if (innerMsg.stickerMessage) {
              await safeSend(sock, ownerJid, { sticker: buffer });
            }
          }
        } catch (delErr) {
          debugLog(`[ANTI-DELETE ERROR] ${delErr.message}`);
        }
      }
    }
    return;
  }

  if (
    messageType === "protocolMessage" ||
    messageType === "senderKeyDistributionMessage" ||
    messageType === "reactionMessage" ||
    messageType === "pollUpdateMessage" ||
    messageType === "peerDataOperationRequestMessage"
  ) {
    return;
  }

  const body = getMessageBody(m).trim();
  if (!body) return;

  const isGroup = from.endsWith("@g.us");
  const isFromMe = Boolean(m.key.fromMe);

  const botNumber = sock.user?.id?.split(":")[0]?.replace(/[^0-9]/g, "") || "";
  const botLid = sock.user?.lid?.split(":")[0]?.replace(/[^0-9]/g, "") || "";

  // Determine sender
  let sender = isGroup ? m.key.participant : m.key.remoteJid;
  if (isFromMe && botNumber) {
    sender = `${botNumber}@s.whatsapp.net`;
  }
  const senderNumber = sender ? sender.split("@")[0].replace(/[^0-9]/g, "") : "";
  const pushName = m.pushName || senderNumber || "Friend";

  // Check if sender is owner (isFromMe or bot number or bot LID or configured owner)
  const isOwner =
    isFromMe ||
    (botNumber && senderNumber === botNumber) ||
    (botLid && senderNumber === botLid) ||
    (botNumber && from.startsWith(botNumber)) ||
    (botLid && from.startsWith(botLid)) ||
    config.ownerNumber.some(
      (num) => num.replace(/[^0-9]/g, "") === senderNumber
    );

  // Build message properties
  m.chat = from;
  m.sender = sender;
  m.isGroup = isGroup;
  m.isOwner = isOwner;
  m.body = body;
  m.pushName = pushName;

  debugLog(`📨 [MSG IN] From: ${from} | Body: "${body.slice(0, 30)}" | isFromMe: ${isFromMe} | isOwner: ${isOwner}`);

  // Private mode
  if (config.workMode === "private" && !isOwner) return;

  // ─── 🛡️ ANTI-BAN GATE (owner & fromMe bypass) ───────────────
  if (!isOwner && !isFromMe) {
    if (isSpammer(senderNumber)) return;
    if (isGlobalRateLimited()) return;
    if (isChatFlooded(from)) return;
  }

  const prefix = config.prefix;
  const isCmd = body.startsWith(prefix);

  // ─── MENTION / TAG DETECTION ─────────────────────────────────
  const contextInfo =
    msgContent[messageType]?.contextInfo ||
    msgContent.extendedTextMessage?.contextInfo;
  const mentionedJids = contextInfo?.mentionedJid || [];
  const isBotMentioned = mentionedJids.some(
    (jid) => jid.split("@")[0] === botNumber
  );

  if (isBotMentioned && !isCmd) {
    if (!isOwner && isAutoReplyThrottled(senderNumber, isGroup)) return;

    await simulateTyping(sock, from);
    await humanDelay();
    await waitForMessageQueue();
    recordGlobalMessage();
    recordChatMessage(from);
    recordAutoReply(senderNumber);

    const tagReply = `👋 *Hey ${pushName}!*\n\n🤖 Mama *PASIYA-MD* Bot!\n\nMata msg karannada? Oya meka type karanna:\n\n📋 *Commands:* *.menu*\n🤖 *AI Chat:* *.ai <question>*\n🎵 *Music:* *.song <name>*\n😂 *Joke:* *.joke*\n\n> 👑 ${config.footer}`;
    await safeSend(sock, from, { text: tagReply }, { quoted: m });
    return;
  }

  // ─── NON-COMMAND MESSAGES ────────────────────────────────────
  if (!isCmd) {
    if (isGroup && !isOwner) {
      const linkCaught = await handleAntiLink(
        sock,
        { chat: from, sender, key: m.key, isGroup },
        body
      ).catch(() => false);
      if (linkCaught) return;
    }

    // Check if message is a reply to pending download (mp3 / mp4 / mb4 / 1 / 2)
    const handled = await downloadModule
      .handleDownloadReply(sock, m, body)
      .catch(() => false);
    if (handled) {
      recordGlobalMessage();
      recordChatMessage(from);
      return;
    }

    if (isFromMe) return;
    if (isAutoReplyThrottled(senderNumber, isGroup)) return;

    const autoResponse = checkAutoReply(body, pushName);
    if (autoResponse) {
      await simulateTyping(sock, from);
      await humanDelay();
      await waitForMessageQueue();
      recordGlobalMessage();
      recordChatMessage(from);
      recordAutoReply(senderNumber);
      await safeSend(sock, from, { text: autoResponse }, { quoted: m });
    }
    return;
  }

  // ─── COMMAND HANDLER ─────────────────────────────────────────
  const cleanBody = body.slice(prefix.length).trim();
  const args = cleanBody.split(/ +/);
  const rawCommandName = args.shift().toLowerCase();
  if (!rawCommandName) return;

  // Clean brackets if user typed e.g. .song<name>
  const commandName = rawCommandName.replace(/[<>]/g, "");

  const actualCmdName = commands.has(commandName)
    ? commandName
    : aliases.get(commandName);

  if (!actualCmdName) {
    debugLog(`❓ Unknown command: ${commandName}`);
    return;
  }

  const command = commands.get(actualCmdName);
  if (!command) return;

  if (!isOwner && isUserOnCooldown(senderNumber, isGroup)) {
    debugLog(`⏳ [COOLDOWN] ${senderNumber}`);
    return;
  }

  if (contextInfo) {
    m.quoted = {
      sender: contextInfo.participant,
      message: contextInfo.quotedMessage,
      text:
        contextInfo.quotedMessage?.conversation ||
        contextInfo.quotedMessage?.[Object.keys(contextInfo.quotedMessage || {})[0]]?.caption ||
        contextInfo.quotedMessage?.[Object.keys(contextInfo.quotedMessage || {})[0]]?.text ||
        "",
    };
    m.mentionedJid = mentionedJids;
  } else {
    m.quoted = null;
    m.mentionedJid = [];
  }

  if (!isOwner) {
    await simulateTyping(sock, from);
    await humanDelay();
  }

  // Auto React
  if (config.autoReact) {
    setTimeout(() => {
      sock.sendMessage(from, { react: { text: "⚡", key: m.key } }).catch(() => {});
    }, 200 + Math.random() * 500);
  }

  recordUserCommand(senderNumber);
  recordGlobalMessage();
  recordChatMessage(from);
  await waitForMessageQueue();

  debugLog(`⚡ [CMD EXEC] ${prefix}${actualCmdName} | ${pushName} (${senderNumber}) | ${isGroup ? "Group" : "PM"}`);

  // Wrap sock with safeSend so any command calling sock.sendMessage is protected
  const safeSock = {
    ...sock,
    sendMessage: (jid, content, opt) => safeSend(sock, jid, content, opt),
  };

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Command timeout (30s)")), 30000)
  );

  try {
    await Promise.race([command.execute(safeSock, m, args), timeout]);
    debugLog(`✅ [CMD DONE] ${prefix}${actualCmdName}`);
  } catch (err) {
    debugLog(`❌ [CMD ERROR] ${actualCmdName}: ${err.message}`);
    await safeSend(
      sock,
      from,
      { text: `❌ *Error!*\n\n\`${err.message}\`` },
      { quoted: m }
    );
  }
}

/**
 * Main Baileys message event handler
 */
async function handleMessages(sock, chatUpdate, messageStore) {
  try {
    const messages = chatUpdate.messages;
    if (!messages || !Array.isArray(messages)) return;

    for (const m of messages) {
      await processSingleMessage(sock, m, messageStore);
    }
  } catch (err) {
    if (!err.message?.includes("Bad MAC")) {
      console.error("[HANDLER ERROR]", err.message);
    }
  }
}

module.exports = { handleMessages, commands, safeSend };
