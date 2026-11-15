const fs = require("fs");
const path = require("path");
const config = require("./config");
const downloadModule = require("./commands/download");
const { checkAutoReply } = require("./lib/autoreply");
const {
  humanDelay,
  simulateTyping,
  waitForMessageQueue,
  safeSendText,
  isGlobalRateLimited,
  recordGlobalMessage,
  isUserOnCooldown,
  recordUserCommand,
  getUserCooldownRemaining,
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
 * Handle incoming WhatsApp messages
 * 🛡️ Ultimate Anti-Ban Protection Integrated
 */
async function handleMessages(sock, chatUpdate) {
  try {
    const m = chatUpdate.messages[0];
    if (!m || !m.message) return;

    // Auto-read WhatsApp status stories (with random delay)
    if (m.key && m.key.remoteJid === "status@broadcast") {
      if (config.autoStatusRead) {
        // 🛡️ Random delay for status reads
        const delay = getStatusReadDelay();
        setTimeout(() => {
          sock.readMessages([m.key]).catch(() => {});
        }, delay);
      }
      return;
    }

    // Unwrap nested message containers (ephemeral, viewOnce, etc.)
    let msgContent = m.message;
    if (msgContent.ephemeralMessage) {
      msgContent = msgContent.ephemeralMessage.message;
      m.message = msgContent;
    }
    if (msgContent.viewOnceMessage) {
      msgContent = msgContent.viewOnceMessage.message;
      m.message = msgContent;
    }
    if (msgContent.viewOnceMessageV2) {
      msgContent = msgContent.viewOnceMessageV2.message;
      m.message = msgContent;
    }
    if (msgContent.documentWithCaptionMessage) {
      msgContent = msgContent.documentWithCaptionMessage.message;
      m.message = msgContent;
    }

    // Ignore protocol/system messages
    const messageType = Object.keys(msgContent)[0];
    if (
      messageType === "protocolMessage" ||
      messageType === "senderKeyDistributionMessage" ||
      messageType === "reactionMessage" ||
      messageType === "pollUpdateMessage" ||
      messageType === "peerDataOperationRequestMessage"
    ) return;

    // Extract text content from all message types
    let body =
      msgContent.conversation ||
      msgContent.extendedTextMessage?.text ||
      msgContent[messageType]?.text ||
      msgContent[messageType]?.caption ||
      msgContent[messageType]?.description ||
      "";

    if (!body) return;

    const from = m.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const sender = isGroup ? m.key.participant : m.key.remoteJid;
    const senderNumber = sender ? sender.split("@")[0].replace(/[^0-9]/g, "") : "";
    const pushName = m.pushName || senderNumber || "Friend";

    const botNumber = sock.user?.id?.split(":")[0]?.split("@")[0] || "";
    const isFromMe = m.key.fromMe;

    // Check if sender is owner
    const isOwner = config.ownerNumber.some(
      (num) => num.replace(/[^0-9]/g, "") === senderNumber
    );

    // Private mode
    if (config.workMode === "private" && !isOwner) return;

    // ─── 🛡️ ANTI-BAN GATE ─────────────────────────────────────
    // All protections checked here before any response is sent
    if (!isOwner && !isFromMe) {
      // 1. Spam detection — is this person flooding the bot?
      if (isSpammer(senderNumber)) {
        return; // Silent ignore
      }

      // 2. Global rate limit
      if (isGlobalRateLimited()) {
        console.log(`[ANTI-BAN] 🛑 Global rate limit! Ignoring ${senderNumber}`);
        return;
      }

      // 3. Per-chat flood check
      if (isChatFlooded(from)) {
        console.log(`[ANTI-BAN] 🛑 Chat flooded: ${from.split("@")[0]}`);
        return;
      }
    }

    const prefix = config.prefix;
    const isCmd = body.startsWith(prefix);

    // ─── MENTION / TAG DETECTION ───────────────────────────────
    const contextInfo = msgContent[messageType]?.contextInfo || msgContent.extendedTextMessage?.contextInfo;
    const mentionedJids = contextInfo?.mentionedJid || [];
    const isBotMentioned = mentionedJids.some(
      (jid) => jid.split("@")[0] === botNumber
    );

    if (isBotMentioned && !isCmd) {
      if (!isOwner && isAutoReplyThrottled(senderNumber, isGroup)) return;

      // 🛡️ Typing + delay + send
      await simulateTyping(sock, from);
      await humanDelay();
      await waitForMessageQueue();
      recordGlobalMessage();
      recordChatMessage(from);
      recordAutoReply(senderNumber);

      const tagReply = `👋 *Hey ${pushName}!*\n\n🤖 Mama *PASIYA-MD* Bot!\n\nMata msg karannada? Oya meka type karanna:\n\n📋 *Commands:* *.menu*\n🤖 *AI Chat:* *.ai <question>*\n🎵 *Music:* *.song <name>*\n😂 *Joke:* *.joke*\n\n> 👑 ${config.footer}`;
      await sock.sendMessage(from, { text: tagReply }, { quoted: m });
      return;
    }

    // ─── NON-COMMAND MESSAGES ──────────────────────────────────
    if (!isCmd) {
      const handled = await downloadModule.handleDownloadReply(sock, m, body).catch(() => false);
      if (handled) {
        recordGlobalMessage();
        recordChatMessage(from);
        return;
      }

      // Skip auto-reply for own messages
      if (isFromMe) return;

      // 🛡️ Auto-reply with full throttling
      if (isAutoReplyThrottled(senderNumber, isGroup)) return;

      const autoResponse = checkAutoReply(body, pushName);
      if (autoResponse) {
        // 🛡️ Full protection: typing + delay + queue
        await simulateTyping(sock, from);
        await humanDelay();
        await waitForMessageQueue();
        recordGlobalMessage();
        recordChatMessage(from);
        recordAutoReply(senderNumber);
        console.log(`[AUTO-REPLY] 💬 ${pushName} (${senderNumber}) | Next in 5min`);
        await sock.sendMessage(from, { text: autoResponse }, { quoted: m });
      }
      return;
    }

    // ─── COMMAND HANDLER ───────────────────────────────────────
    const args = body.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    if (!commandName) return;

    const actualCmdName = commands.has(commandName)
      ? commandName
      : aliases.get(commandName);
    if (!actualCmdName) return;

    const command = commands.get(actualCmdName);
    if (!command) return;

    // 🛡️ Per-user command cooldown (owner bypasses)
    if (!isOwner && isUserOnCooldown(senderNumber, isGroup)) {
      console.log(`[ANTI-BAN] ⏳ Cooldown: ${senderNumber}`);
      return; // Silent ignore — safer than replying "wait"
    }

    // Build enhanced message object
    m.chat = from;
    m.sender = sender;
    m.isGroup = isGroup;
    m.isOwner = isOwner;
    m.body = body;
    m.pushName = pushName;

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

    // 🛡️ Typing simulation + human delay (owner gets faster)
    if (!isOwner) {
      await simulateTyping(sock, from);
      await humanDelay();
    }

    // Auto React (with slight delay)
    if (config.autoReact) {
      setTimeout(() => {
        sock.sendMessage(from, { react: { text: "⚡", key: m.key } }).catch(() => {});
      }, 300 + Math.random() * 700);
    }

    // 🛡️ Record everything
    recordUserCommand(senderNumber);
    recordGlobalMessage();
    recordChatMessage(from);
    await waitForMessageQueue();

    console.log(`[CMD] ${prefix}${actualCmdName} | ${pushName} (${senderNumber}) | ${isGroup ? "Group" : "PM"}${isNightTime() ? " | 🌙 Night" : ""}`);

    // Execute with timeout (30s)
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Command timeout")), 30000)
    );

    await Promise.race([
      command.execute(sock, m, args),
      timeout
    ]).catch(async (err) => {
      console.error(`[CMD ERROR] ${actualCmdName}:`, err.message);
      await sock.sendMessage(
        from,
        { text: `❌ *Error!*\n\n\`${err.message}\`` },
        { quoted: m }
      ).catch(() => {});
    });

  } catch (err) {
    if (!err.message?.includes("Bad MAC")) {
      console.error("[HANDLER ERROR]", err.message);
    }
  }
}

module.exports = { handleMessages, commands };
