const axios = require("axios");
const config = require("../config");

// Store pending download states: key = userJID, value = { videoId, title, thumbnail }
const pendingDownloads = new Map();

/**
 * Search YouTube for a song using free API
 */
async function searchYouTube(query) {
  try {
    // Use YouTube search via invidious public API (no key needed)
    const res = await axios.get(
      `https://inv.nadeko.net/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,lengthSeconds,videoThumbnails`,
      { timeout: 10000 }
    );
    if (res.data && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  } catch (err) {
    // Fallback invidious instance
    try {
      const res2 = await axios.get(
        `https://invidious.privacydev.net/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,lengthSeconds,videoThumbnails`,
        { timeout: 10000 }
      );
      if (res2.data && res2.data.length > 0) return res2.data[0];
    } catch (e) {}
    return null;
  }
}

/**
 * Download using cobalt.tools free API
 */
async function downloadMedia(videoUrl, format) {
  try {
    const response = await axios.post(
      "https://api.cobalt.tools/",
      {
        url: videoUrl,
        downloadMode: format === "mp3" ? "audio" : "auto",
        audioFormat: "mp3",
        videoQuality: "720",
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.url) {
      return response.data.url;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Format seconds into mm:ss
 */
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

module.exports = {
  // Export pendingDownloads so handler.js can access it
  pendingDownloads,

  song: {
    name: "song",
    alias: ["play", "music", "mp3"],
    category: "download",
    desc: "Search and download a song (MP3 or MP4)",
    async execute(sock, m, args) {
      const query = args.join(" ");
      if (!query) {
        return sock.sendMessage(
          m.chat,
          { text: `🎵 *Song name ekak denna!*\n\n*Example:* ${config.prefix}song Manike Mage Hithe` },
          { quoted: m }
        );
      }

      await sock.sendMessage(m.chat, { text: `🔍 *Searching for:* ${query}...` }, { quoted: m });

      const result = await searchYouTube(query);

      if (!result) {
        return sock.sendMessage(
          m.chat,
          { text: `❌ *Song not found!* Try another name.\n\n*Example:* ${config.prefix}song Shape of You Ed Sheeran` },
          { quoted: m }
        );
      }

      const videoId = result.videoId;
      const title = result.title || "Unknown Title";
      const author = result.author || "Unknown Artist";
      const duration = result.lengthSeconds ? formatDuration(result.lengthSeconds) : "N/A";
      const thumbnail = result.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Store the pending state for this user
      const userKey = `${m.sender}_${m.chat}`;
      pendingDownloads.set(userKey, {
        videoId,
        videoUrl,
        title,
        author,
        duration,
        thumbnail,
        expires: Date.now() + 2 * 60 * 1000, // 2 minute expiry
      });

      // Send song info and ask format
      const infoText = `🎵 *SONG FOUND!* 🎵

🎬 *Title:* ${title}
👤 *Artist:* ${author}
⏱️ *Duration:* ${duration}
🔗 *YouTube:* ${videoUrl}

━━━━━━━━━━━━━━━━━━━━
📥 *Format ekak choose karanna:*

Reply with👇
  🎵 *mp3* — Audio only (Small file)
  🎬 *mp4* — Video with audio (Larger file)
━━━━━━━━━━━━━━━━━━━━
⏳ *2 minutes athule reply karanna!*`;

      try {
        await sock.sendMessage(
          m.chat,
          {
            image: { url: thumbnail },
            caption: infoText,
          },
          { quoted: m }
        );
      } catch (e) {
        // If image fails, send text only
        await sock.sendMessage(m.chat, { text: infoText }, { quoted: m });
      }
    },
  },

  video: {
    name: "video",
    alias: ["ytmp4", "mp4"],
    category: "download",
    desc: "Search and download a YouTube video",
    async execute(sock, m, args) {
      const query = args.join(" ");
      if (!query) {
        return sock.sendMessage(
          m.chat,
          { text: `🎬 *Video name ekak denna!*\n\n*Example:* ${config.prefix}video Funny cats` },
          { quoted: m }
        );
      }

      await sock.sendMessage(m.chat, { text: `🔍 *Searching for:* ${query}...` }, { quoted: m });

      const result = await searchYouTube(query);

      if (!result) {
        return sock.sendMessage(m.chat, { text: `❌ *Video not found!*` }, { quoted: m });
      }

      const videoId = result.videoId;
      const title = result.title || "Unknown";
      const author = result.author || "Unknown";
      const duration = result.lengthSeconds ? formatDuration(result.lengthSeconds) : "N/A";
      const thumbnail = result.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      const userKey = `${m.sender}_${m.chat}`;
      pendingDownloads.set(userKey, {
        videoId,
        videoUrl,
        title,
        author,
        duration,
        thumbnail,
        expires: Date.now() + 2 * 60 * 1000,
      });

      const infoText = `🎬 *VIDEO FOUND!* 🎬

📌 *Title:* ${title}
👤 *Channel:* ${author}
⏱️ *Duration:* ${duration}
🔗 *YouTube:* ${videoUrl}

━━━━━━━━━━━━━━━━━━━━
📥 *Format ekak choose karanna:*

Reply with👇
  🎵 *mp3* — Audio only
  🎬 *mp4* — Full Video
━━━━━━━━━━━━━━━━━━━━`;

      try {
        await sock.sendMessage(m.chat, { image: { url: thumbnail }, caption: infoText }, { quoted: m });
      } catch (e) {
        await sock.sendMessage(m.chat, { text: infoText }, { quoted: m });
      }
    },
  },

  yts: {
    name: "yts",
    alias: ["ytsearch", "search"],
    category: "download",
    desc: "Search YouTube videos",
    async execute(sock, m, args) {
      const query = args.join(" ");
      if (!query) {
        return sock.sendMessage(
          m.chat,
          { text: `⚠️ *Search query ekak denna!* (e.g. ${config.prefix}yts Alan Walker Faded)` },
          { quoted: m }
        );
      }

      await sock.sendMessage(m.chat, { text: "🔍 *Searching YouTube...*" }, { quoted: m });

      const result = await searchYouTube(query);

      if (result) {
        const videoId = result.videoId;
        const text = `🎬 *YOUTUBE RESULT* 🎬

📌 *Title:* ${result.title || "N/A"}
👤 *Channel:* ${result.author || "N/A"}
⏱️ *Duration:* ${result.lengthSeconds ? formatDuration(result.lengthSeconds) : "N/A"}
🔗 *Link:* https://www.youtube.com/watch?v=${videoId}

💡 *Download:*
  ${config.prefix}song ${query} → MP3/MP4 choice`;

        try {
          const thumb = result.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          await sock.sendMessage(m.chat, { image: { url: thumb }, caption: text }, { quoted: m });
        } catch (e) {
          await sock.sendMessage(m.chat, { text }, { quoted: m });
        }
      } else {
        await sock.sendMessage(
          m.chat,
          { text: `🔎 *Search:* https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` },
          { quoted: m }
        );
      }
    },
  },

  // Internal handler for mp3/mp4 reply processing
  handleDownloadReply: async function (sock, m, text) {
    const userKey = `${m.sender}_${m.chat}`;
    const pending = pendingDownloads.get(userKey);

    if (!pending) return false;

    // Check expiry
    if (Date.now() > pending.expires) {
      pendingDownloads.delete(userKey);
      return false;
    }

    const format = text.trim().toLowerCase();
    if (format !== "mp3" && format !== "mp4") return false;

    // Clear pending state
    pendingDownloads.delete(userKey);

    await sock.sendMessage(
      m.chat,
      {
        text: `⬇️ *Downloading ${format.toUpperCase()}...*\n🎵 *${pending.title}*\n⏳ Please wait...`,
      },
      { quoted: m }
    );

    try {
      const downloadUrl = await downloadMedia(pending.videoUrl, format);

      if (!downloadUrl) {
        return await sock.sendMessage(
          m.chat,
          {
            text: `❌ *Download failed!*\n\n🔗 Manual download: ${pending.videoUrl}\n\n💡 Try: *${config.prefix}song ${pending.title}* again`,
          },
          { quoted: m }
        ) || true;
      }

      if (format === "mp3") {
        await sock.sendMessage(
          m.chat,
          {
            audio: { url: downloadUrl },
            mimetype: "audio/mpeg",
            fileName: `${pending.title}.mp3`,
            caption: `🎵 *${pending.title}*\n👤 ${pending.author}\n\n> ${config.footer}`,
          },
          { quoted: m }
        );
      } else {
        await sock.sendMessage(
          m.chat,
          {
            video: { url: downloadUrl },
            caption: `🎬 *${pending.title}*\n👤 ${pending.author}\n\n> ${config.footer}`,
            fileName: `${pending.title}.mp4`,
          },
          { quoted: m }
        );
      }
    } catch (err) {
      console.error("Download error:", err);
      await sock.sendMessage(
        m.chat,
        { text: `❌ *Download failed. Please try again!*\n🔗 *Manual:* ${pending.videoUrl}` },
        { quoted: m }
      );
    }

    return true;
  },
};
