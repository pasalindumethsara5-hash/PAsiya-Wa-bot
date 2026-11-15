/**
 * 🛡️ PASIYA-MD ULTIMATE ANTI-BAN PROTECTION SYSTEM
 * Maximum safety — banned wenne nathi wenna puluwan hodama tricks tika
 *
 * Features:
 * 1. Per-user command cooldown
 * 2. Global rate limit (per minute)
 * 3. Daily message cap
 * 4. Human-like random delays
 * 5. Typing simulation (composing presence)
 * 6. Auto-reply throttle per user
 * 7. Group auto-reply off
 * 8. Spam detection & auto-block
 * 9. Night mode (reduced activity at night)
 * 10. Message queue (sequential sending, no burst)
 * 11. Per-chat flood protection
 * 12. Read receipt delay
 * 13. Memory cleanup (no memory leaks)
 */

// ─── SETTINGS ────────────────────────────────────────────
const SETTINGS = {
  // Per-user command cooldown (seconds)
  userCooldown: 5,

  // Auto-reply cooldown per user (seconds)
  autoReplyCooldown: 300, // 5 minutes per user

  // Global rate limits
  globalMaxPerMinute: 25,
  globalMaxPerHour: 200,
  globalMaxPerDay: 1000,

  // Random delay range before replying (milliseconds)
  minDelay: 1000,
  maxDelay: 3000,

  // Typing simulation duration range (milliseconds)
  minTypingDuration: 1500,
  maxTypingDuration: 4000,

  // Group settings
  enableGroupAutoReply: false,
  groupCommandCooldown: 8, // seconds — groups wala thawa slow

  // Max auto-replies per hour (total)
  maxAutoRepliesPerHour: 20,

  // Spam detection — if someone sends X messages in Y seconds, ignore them
  spamThreshold: 8,        // messages count
  spamWindow: 15,          // seconds
  spamBlockDuration: 300,  // block for 5 minutes

  // Night mode (reduced activity) — Sri Lanka time (UTC+5:30)
  nightModeEnabled: true,
  nightStartHour: 23,  // 11 PM
  nightEndHour: 6,     // 6 AM
  nightMaxPerMinute: 10,
  nightExtraDelay: 2000, // extra 2s delay at night

  // Per-chat flood protection
  chatMaxPerMinute: 5,  // max 5 messages to same chat per minute

  // Status read delay range (ms)
  statusReadMinDelay: 3000,
  statusReadMaxDelay: 8000,

  // Message queue — minimum gap between any two outgoing messages (ms)
  messageQueueGap: 1500,
};

// ─── TRACKING DATA ───────────────────────────────────────
const userCooldowns = new Map();        // senderNumber -> last command timestamp
const autoReplyCooldowns = new Map();   // senderNumber -> last auto-reply timestamp
const globalMinuteMessages = [];        // timestamps of sent messages (last 60s)
const globalHourMessages = [];          // timestamps of sent messages (last 3600s)
let globalDayCount = 0;                 // total messages today
let dayResetTimestamp = Date.now();

let autoReplyHourCount = 0;
let autoReplyHourReset = Date.now();

const spamTracker = new Map();          // senderNumber -> { timestamps: [], blockedUntil: null }
const chatFloodTracker = new Map();     // chatId -> [timestamps]

let lastMessageSentAt = 0;             // timestamp of last outgoing message (for queue gap)

// ─── HELPERS ─────────────────────────────────────────────
function getRandomDelay() {
  return Math.floor(
    Math.random() * (SETTINGS.maxDelay - SETTINGS.minDelay) + SETTINGS.minDelay
  );
}

function getRandomTypingDuration() {
  return Math.floor(
    Math.random() * (SETTINGS.maxTypingDuration - SETTINGS.minTypingDuration) + SETTINGS.minTypingDuration
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNightTime() {
  if (!SETTINGS.nightModeEnabled) return false;
  const now = new Date();
  // Convert to Sri Lanka time (UTC+5:30)
  const sriLankaOffset = 5.5 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const slMinutes = (utcMinutes + sriLankaOffset) % (24 * 60);
  const slHour = Math.floor(slMinutes / 60);
  return slHour >= SETTINGS.nightStartHour || slHour < SETTINGS.nightEndHour;
}

function cleanOldEntries(arr, maxAgeMs) {
  const now = Date.now();
  while (arr.length > 0 && now - arr[0] > maxAgeMs) {
    arr.shift();
  }
}

// ─── HUMAN-LIKE DELAY ────────────────────────────────────
async function humanDelay() {
  let delay = getRandomDelay();
  if (isNightTime()) {
    delay += SETTINGS.nightExtraDelay;
  }
  await sleep(delay);
}

// ─── TYPING SIMULATION ──────────────────────────────────
/**
 * Show "typing..." indicator before sending a message
 * Makes bot look more human to WhatsApp's detection
 */
async function simulateTyping(sock, chatId) {
  try {
    await sock.sendPresenceUpdate("composing", chatId);
    const duration = getRandomTypingDuration();
    await sleep(duration);
    await sock.sendPresenceUpdate("paused", chatId);
  } catch (e) {
    // Silently ignore — presence errors shouldn't break the bot
  }
}

// ─── MESSAGE QUEUE GAP ──────────────────────────────────
/**
 * Ensure minimum gap between outgoing messages
 * Prevents burst sending which WhatsApp detects
 */
async function waitForMessageQueue() {
  const now = Date.now();
  const elapsed = now - lastMessageSentAt;
  if (elapsed < SETTINGS.messageQueueGap) {
    await sleep(SETTINGS.messageQueueGap - elapsed + Math.random() * 500);
  }
  lastMessageSentAt = Date.now();
}

// ─── SAFE SEND MESSAGE WRAPPER ──────────────────────────
/**
 * Wraps sock.sendMessage with all anti-ban protections
 * Use this instead of sock.sendMessage directly
 */
async function safeSendMessage(sock, chatId, content, options = {}) {
  // Wait for queue gap
  await waitForMessageQueue();

  // Record the message
  recordGlobalMessage();

  // Send
  return sock.sendMessage(chatId, content, options);
}

/**
 * Full protected send: typing + delay + queue + send
 * Use this for command replies and auto-replies
 */
async function safeSendText(sock, chatId, text, quoted, isOwner = false) {
  if (!isOwner) {
    await simulateTyping(sock, chatId);
    await humanDelay();
  }
  await waitForMessageQueue();
  recordGlobalMessage();
  return sock.sendMessage(chatId, { text }, quoted ? { quoted } : undefined);
}

// ─── GLOBAL RATE LIMIT ──────────────────────────────────
function isGlobalRateLimited() {
  const now = Date.now();

  // Clean old entries
  cleanOldEntries(globalMinuteMessages, 60000);
  cleanOldEntries(globalHourMessages, 3600000);

  // Reset daily counter
  if (now - dayResetTimestamp > 86400000) {
    globalDayCount = 0;
    dayResetTimestamp = now;
  }

  const perMinLimit = isNightTime() ? SETTINGS.nightMaxPerMinute : SETTINGS.globalMaxPerMinute;

  if (globalMinuteMessages.length >= perMinLimit) return true;
  if (globalHourMessages.length >= SETTINGS.globalMaxPerHour) return true;
  if (globalDayCount >= SETTINGS.globalMaxPerDay) return true;

  return false;
}

function recordGlobalMessage() {
  const now = Date.now();
  globalMinuteMessages.push(now);
  globalHourMessages.push(now);
  globalDayCount++;
}

// ─── PER-USER COMMAND COOLDOWN ──────────────────────────
function isUserOnCooldown(senderNumber, isGroup) {
  const last = userCooldowns.get(senderNumber);
  if (!last) return false;
  const cooldown = isGroup ? SETTINGS.groupCommandCooldown : SETTINGS.userCooldown;
  return (Date.now() - last) < (cooldown * 1000);
}

function recordUserCommand(senderNumber) {
  userCooldowns.set(senderNumber, Date.now());
}

function getUserCooldownRemaining(senderNumber, isGroup) {
  const last = userCooldowns.get(senderNumber);
  if (!last) return 0;
  const cooldown = isGroup ? SETTINGS.groupCommandCooldown : SETTINGS.userCooldown;
  const remaining = (cooldown * 1000) - (Date.now() - last);
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

// ─── AUTO-REPLY THROTTLE ────────────────────────────────
function isAutoReplyThrottled(senderNumber, isGroup) {
  if (isGroup && !SETTINGS.enableGroupAutoReply) return true;

  // Hourly auto-reply limit
  const now = Date.now();
  if (now - autoReplyHourReset > 3600000) {
    autoReplyHourCount = 0;
    autoReplyHourReset = now;
  }
  if (autoReplyHourCount >= SETTINGS.maxAutoRepliesPerHour) return true;

  // Per-user cooldown
  const last = autoReplyCooldowns.get(senderNumber);
  if (!last) return false;
  return (now - last) < (SETTINGS.autoReplyCooldown * 1000);
}

function recordAutoReply(senderNumber) {
  autoReplyCooldowns.set(senderNumber, Date.now());
  autoReplyHourCount++;
}

// ─── SPAM DETECTION ─────────────────────────────────────
/**
 * Detect if a user is spamming the bot
 * If they send too many messages too fast, block them temporarily
 */
function isSpammer(senderNumber) {
  const now = Date.now();
  let tracker = spamTracker.get(senderNumber);

  if (!tracker) {
    tracker = { timestamps: [], blockedUntil: null };
    spamTracker.set(senderNumber, tracker);
  }

  // Check if currently blocked
  if (tracker.blockedUntil && now < tracker.blockedUntil) {
    return true;
  } else if (tracker.blockedUntil && now >= tracker.blockedUntil) {
    // Unblock
    tracker.blockedUntil = null;
    tracker.timestamps = [];
  }

  // Record this message
  tracker.timestamps.push(now);

  // Clean old timestamps
  tracker.timestamps = tracker.timestamps.filter(
    (t) => now - t < SETTINGS.spamWindow * 1000
  );

  // Check threshold
  if (tracker.timestamps.length >= SETTINGS.spamThreshold) {
    tracker.blockedUntil = now + SETTINGS.spamBlockDuration * 1000;
    console.log(`[ANTI-BAN] 🚫 SPAMMER BLOCKED: ${senderNumber} for ${SETTINGS.spamBlockDuration}s`);
    return true;
  }

  return false;
}

// ─── PER-CHAT FLOOD PROTECTION ──────────────────────────
/**
 * Prevent sending too many messages to the same chat in a short time
 */
function isChatFlooded(chatId) {
  const now = Date.now();
  let timestamps = chatFloodTracker.get(chatId);

  if (!timestamps) {
    timestamps = [];
    chatFloodTracker.set(chatId, timestamps);
  }

  // Clean entries older than 60 seconds
  while (timestamps.length > 0 && now - timestamps[0] > 60000) {
    timestamps.shift();
  }

  return timestamps.length >= SETTINGS.chatMaxPerMinute;
}

function recordChatMessage(chatId) {
  const now = Date.now();
  let timestamps = chatFloodTracker.get(chatId);
  if (!timestamps) {
    timestamps = [];
    chatFloodTracker.set(chatId, timestamps);
  }
  timestamps.push(now);
}

// ─── STATUS READ DELAY ──────────────────────────────────
function getStatusReadDelay() {
  return Math.floor(
    Math.random() * (SETTINGS.statusReadMaxDelay - SETTINGS.statusReadMinDelay) + SETTINGS.statusReadMinDelay
  );
}

// ─── MEMORY CLEANUP (every 15 min) ──────────────────────
setInterval(() => {
  const now = Date.now();

  for (const [key, time] of userCooldowns) {
    if (now - time > 300000) userCooldowns.delete(key);
  }
  for (const [key, time] of autoReplyCooldowns) {
    if (now - time > 600000) autoReplyCooldowns.delete(key);
  }
  for (const [key, tracker] of spamTracker) {
    if (tracker.blockedUntil && now > tracker.blockedUntil + 60000) {
      spamTracker.delete(key);
    } else if (!tracker.blockedUntil && tracker.timestamps.length === 0) {
      spamTracker.delete(key);
    }
  }
  for (const [key, timestamps] of chatFloodTracker) {
    if (timestamps.length === 0) chatFloodTracker.delete(key);
  }

  cleanOldEntries(globalMinuteMessages, 60000);
  cleanOldEntries(globalHourMessages, 3600000);
}, 15 * 60 * 1000);

// ─── STATS (for owner debug command) ────────────────────
function getAntiBanStats() {
  return {
    globalPerMinute: globalMinuteMessages.length,
    globalPerHour: globalHourMessages.length,
    globalToday: globalDayCount,
    autoRepliesThisHour: autoReplyHourCount,
    activeSpamBlocks: [...spamTracker.values()].filter((t) => t.blockedUntil && Date.now() < t.blockedUntil).length,
    isNight: isNightTime(),
    trackedUsers: userCooldowns.size,
    trackedChats: chatFloodTracker.size,
  };
}

// ─── EXPORT ──────────────────────────────────────────────
module.exports = {
  SETTINGS,
  humanDelay,
  sleep,
  simulateTyping,
  waitForMessageQueue,
  safeSendMessage,
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
  getAntiBanStats,
};
