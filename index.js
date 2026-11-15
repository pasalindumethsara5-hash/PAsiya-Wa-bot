const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const config = require("./config");
const { handleMessages } = require("./handler");
const { importSession } = require("./session-manager");
const { handleGroupParticipants } = require("./lib/group-events");

// ☁️ Cloud deploy: restore session from env variable if available
importSession();

const SESSION_PATH = path.join(__dirname, "session");

// Console Banner
console.clear();
console.log(`
\x1b[36m========================================================\x1b[0m
\x1b[1m\x1b[32m  ██████╗  █████╗ ███████╗██╗██╗   ██╗ █████╗     ███╗   ███╗██████╗\x1b[0m
\x1b[1m\x1b[32m  ██╔══██╗██╔══██╗██╔════╝██║╚██╗ ██╔╝██╔══██╗    ████╗████╔╝██╔══██╗\x1b[0m
\x1b[1m\x1b[32m  ██████╔╝███████║███████╗██║ ╚████╔╝ ███████║    ██╔████╔██║██║  ██║\x1b[0m
\x1b[1m\x1b[32m  ██╔═══╝ ██╔══██║╚════██║██║  ╚██╔╝  ██╔══██║    ██║╚██╔╝██║██║  ██║\x1b[0m
\x1b[1m\x1b[32m  ██║     ██║  ██║███████║██║   ██║   ██║  ██║    ██║ ╚═╝ ██║██████╔╝\x1b[0m
\x1b[1m\x1b[32m  ╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝   ╚═╝   ╚═╝  ╚═╝    ╚═╝     ╚═╝╚═════╝\x1b[0m
\x1b[36m========================================================\x1b[0m
\x1b[33m 👑 Bot Name : ${config.botName}\x1b[0m
\x1b[33m 👤 Owner    : ${config.ownerName}\x1b[0m
\x1b[33m ⚡ Prefix   : ${config.prefix}\x1b[0m
\x1b[36m========================================================\x1b[0m
`);

// Question prompt helper
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// Auto-clear corrupted session
function clearSession() {
  try {
    if (fs.existsSync(SESSION_PATH)) {
      fs.rmSync(SESSION_PATH, { recursive: true, force: true });
      console.log(`\x1b[33m[AUTO-FIX] Corrupted session cleared!\x1b[0m`);
    }
  } catch (e) {
    console.error("[AUTO-FIX] Could not clear session:", e.message);
  }
}

// Track Bad MAC errors for auto-fix
let badMacCount = 0;
let isConnected = false;
const BAD_MAC_LIMIT = 5; // Auto-fix after 5 Bad MAC errors

async function startPasiyaBot() {
  badMacCount = 0;

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
  const { version } = await fetchLatestBaileysVersion();

  // Get phone number BEFORE creating socket (only if not already registered)
  let phoneNumber = "";
  if (!state.creds.registered) {
    console.log(`\x1b[33m\n[PAIRING] No active session. Enter your number to get Pairing Code.\x1b[0m`);
    const input = await question(`\x1b[32m👉 Enter WhatsApp number with country code (e.g. 94712345678): \x1b[0m`);
    phoneNumber = input.replace(/[^0-9]/g, "");
    console.log(`\x1b[34m[INFO] Number saved: ${phoneNumber}. Connecting...\x1b[0m\n`);
  }

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.ubuntu("Chrome"),
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,       // 🛡️ Less frequent keepalive
    markOnlineOnConnect: false,       // 🛡️ Don't force online
    syncFullHistory: false,           // 🛡️ Don't sync history
    generateHighQualityLinkPreview: false, // 🛡️ Less API calls
    getMessage: async () => ({ conversation: "" }), // 🛡️ Prevent retry floods
    // Intercept logger to detect Bad MAC errors
    logger: pino({ level: "silent" }).child({}, {
      serializers: {
        err: (err) => {
          if (err && err.message && err.message.includes("Bad MAC")) {
            badMacCount++;
            console.log(`\x1b[31m[BAD MAC] Error #${badMacCount}/${BAD_MAC_LIMIT}\x1b[0m`);
            if (badMacCount >= BAD_MAC_LIMIT && isConnected) {
              console.log(`\x1b[33m[AUTO-FIX] Too many Bad MAC errors! Auto-fixing session...\x1b[0m`);
              autoFixSession(sock);
            }
          }
          return err;
        }
      }
    })
  });

  // Auto-fix function
  async function autoFixSession(sock) {
    try {
      console.log(`\x1b[33m[AUTO-FIX] Sending notification to owner...\x1b[0m`);
      const userJid = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
      if (userJid && userJid !== "undefined@s.whatsapp.net") {
        await sock.sendMessage(userJid, {
          text: `⚠️ *PASIYA-MD AUTO-FIX TRIGGERED*\n\nBot eke session eka corrupt unaa!\n🔄 Auto-fixing...\n\n📱 *Restart vela pairing code ekak ganna ona wenawa.*\nBot eka restart karanna CMD eke:\n\`node index.js\``
        }).catch(() => {});
      }
      await sock.logout().catch(() => {});
    } catch (e) {}

    setTimeout(() => {
      clearSession();
      console.log(`\x1b[32m[AUTO-FIX] Session cleared! Please restart bot with: node index.js\x1b[0m`);
      process.exit(0);
    }, 2000);
  }

  // Request pairing code with retry
  if (phoneNumber && !state.creds.registered) {
    let attempts = 0;
    const tryPairing = async () => {
      attempts++;
      try {
        console.log(`\x1b[33m[PAIRING] Requesting code (attempt ${attempts})...\x1b[0m`);
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\n\x1b[42m\x1b[30m ✅ YOUR PAIRING CODE: ${code} \x1b[0m\n`);
        console.log(`\x1b[36m📱 Steps:\x1b[0m`);
        console.log(`   1. Open WhatsApp`);
        console.log(`   2. 3 dots → Linked Devices → Link a Device`);
        console.log(`   3. "Link with phone number instead"`);
        console.log(`   4. Enter: \x1b[1m\x1b[32m${code}\x1b[0m\n`);
      } catch (err) {
        if (attempts < 5) {
          console.log(`\x1b[31m[PAIRING] Attempt ${attempts} failed. Retrying in 5s...\x1b[0m`);
          setTimeout(tryPairing, 5000);
        } else {
          console.log(`\x1b[31m[ERROR] Could not get pairing code.\x1b[0m`);
          console.log(`💡 Restart bot: node index.js`);
        }
      }
    };
    setTimeout(tryPairing, 5000);
  }

  // Connection events
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      isConnected = false;
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log(`\x1b[31m[DISCONNECT] Reason: ${reason}\x1b[0m`);

      if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
        console.log(`❌ Session invalid! Auto-clearing and restarting...`);
        clearSession();
        console.log(`✅ Done! Run: node index.js`);
        process.exit(0);
      } else {
        console.log(`🔄 Reconnecting in 3s...`);
        setTimeout(startPasiyaBot, 3000);
      }

    } else if (connection === "open") {
      isConnected = true;
      badMacCount = 0; // Reset on successful connection
      console.log(`\n\x1b[42m\x1b[30m 🚀 PASIYA-MD IS NOW CONNECTED TO WHATSAPP! 🚀 \x1b[0m\n`);
      console.log(`👑 Bot active! Type ${config.prefix}menu in WhatsApp.\n`);

      // Send welcome message to owner
      try {
        const userJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
        await sock.sendMessage(userJid, {
          text: `╭───「 *👑 PASIYA-MD CONNECTED* 」───\n│ 🤖 *Bot:* ${config.botName}\n│ 👑 *Owner:* ${config.ownerName}\n│ ⚡ *Status:* Online & Active\n│ 📌 *Prefix:* ${config.prefix}\n│ 🛡️ *Auto-Fix:* Enabled ✅\n╰───────────────────────────\n\n✨ Type *${config.prefix}menu* to begin!\n\n> ${config.footer}`
        });
      } catch (e) {}

    } else if (connection === "connecting") {
      console.log(`\x1b[34m[INFO] Connecting to WhatsApp...\x1b[0m`);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // Group join/leave events for Welcome & Goodbye
  sock.ev.on("group-participants.update", async (event) => {
    try {
      await handleGroupParticipants(sock, event);
    } catch (err) {
      console.error("[GROUP EVENT ERROR]", err.message);
    }
  });

  // Catch Bad MAC errors from message events
  sock.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      await handleMessages(sock, chatUpdate);
    } catch (err) {
      if (err.message && err.message.includes("Bad MAC")) {
        badMacCount++;
        console.log(`\x1b[31m[BAD MAC] Error #${badMacCount}/${BAD_MAC_LIMIT} detected\x1b[0m`);
        if (badMacCount >= BAD_MAC_LIMIT) {
          console.log(`\x1b[33m[AUTO-FIX] Triggering auto session fix...\x1b[0m`);
          await autoFixSession(sock);
        }
      }
    }
  });

  // Listen for ANY unhandled error that contains "Bad MAC"
  process.removeAllListeners("uncaughtException");
  process.on("uncaughtException", (err) => {
    if (err.message && err.message.includes("Bad MAC")) {
      badMacCount++;
      console.log(`\x1b[31m[BAD MAC] Uncaught error #${badMacCount}/${BAD_MAC_LIMIT}\x1b[0m`);
      if (badMacCount >= BAD_MAC_LIMIT && isConnected) {
        autoFixSession(sock);
      }
    } else {
      console.error("[UNCAUGHT ERROR]", err.message);
    }
  });
}

startPasiyaBot().catch((err) => {
  console.error("Fatal Error:", err);
});
