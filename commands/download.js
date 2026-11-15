const axios = require("axios");
const config = require("../config");
const { Ytdl } = require("@distube/ytdl-core");
const { Downloader } = require("@tobyg74/tiktok-api-dl");

const yt = new Ytdl();

// Store pending download states: key = userJID, value = { videoId, title, thumbnail }
const pendingDownloads = new Map();

/**
 * Convert a readable stream into a single Buffer (with max size safeguard)
 */
function streamToBuffer(stream, maxBytes = 45 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalLength = 0;

    stream.on("data", (chunk) => {
      totalLength += chunk.length;
      if (totalLength > maxBytes) {
        stream.destroy();
        return reject(new Error("File size exceeds 45MB WhatsApp limit"));
      }
      chunks.push(chunk);
    });

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Search YouTube for a song or video using Invidious / scraper
 */
async function searchYouTube(query) {
  try {
    const searchRes = await yt.search(query, { limit: 1 });
    if (searchRes && searchRes.length > 0) {
      const item = searchRes[0];
      return {
        videoId: item.id,
        title: item.name || item.title,
        author: item.uploader?.name || item.author?.name || "YouTube Creator",
        lengthSeconds: item.duration || 0,
        thumbnail: item.thumbnail?.url || `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
      };
    }
  } catch (err) {
    // Fallback: invidious search
    try {
      const res = await axios.get(
        `https://invidious.nerdvpn.de/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
        { timeout: 8000 }
      );
      if (res.data && res.data.length > 0) {
        const item = res.data[0];
        return {
          videoId: item.videoId,
          title: item.title,
          author: item.author,
          lengthSeconds: item.lengthSeconds,
          thumbnail: item.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`,
        };
      }
    } catch (e2) {}
  }
  return null;
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
          { text: `❌ *Song not found!* Try another name or add the artist name.\n\n*Example:* ${config.prefix}song Shape of You Ed Sheeran` },
          { quoted: m }
        );
      }

      const videoId = result.videoId;
      const title = result.title || "Unknown Title";
      const author = result.author || "Unknown Artist";
      const duration = result.lengthSeconds ? formatDuration(result.lengthSeconds) : "N/A";
      const thumbnail = result.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      const userKey = `${m.sender}_${m.chat}`;
      const downloadState = {
        videoId,
        videoUrl,
        title,
        author,
        duration,
        thumbnail,
        expires: Date.now() + 3 * 60 * 1000,
      };
      pendingDownloads.set(userKey, downloadState);
      pendingDownloads.set(m.chat, downloadState);

      const infoText = `🎵 *SONG FOUND!* 🎵\n\n` +
        `🎬 *Title:* ${title}\n` +
        `👤 *Artist:* ${author}\n` +
        `⏱️ *Duration:* ${duration}\n` +
        `🔗 *YouTube:* ${videoUrl}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📥 *Format ekak choose karanna:*\n\n` +
        `Reply with👇\n` +
        `  🎵 *mp3* — Audio only (Fast)\n` +
        `  🎬 *mp4* — Video with audio\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⏳ *2 minutes athule reply karanna!*`;

      try {
        await sock.sendMessage(
          m.chat,
          { image: { url: thumbnail }, caption: infoText },
          { quoted: m }
        );
      } catch (e) {
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
      const thumbnail = result.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      const userKey = `${m.sender}_${m.chat}`;
      const downloadState = {
        videoId,
        videoUrl,
        title,
        author,
        duration,
        thumbnail,
        expires: Date.now() + 3 * 60 * 1000,
      };
      pendingDownloads.set(userKey, downloadState);
      pendingDownloads.set(m.chat, downloadState);

      const infoText = `🎬 *VIDEO FOUND!* 🎬\n\n` +
        `📌 *Title:* ${title}\n` +
        `👤 *Channel:* ${author}\n` +
        `⏱️ *Duration:* ${duration}\n` +
        `🔗 *YouTube:* ${videoUrl}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📥 *Format ekak choose karanna:*\n\n` +
        `Reply with👇\n` +
        `  🎵 *mp3* — Audio only\n` +
        `  🎬 *mp4* — Full Video\n` +
        `━━━━━━━━━━━━━━━━━━━━`;

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
        const text = `🎬 *YOUTUBE RESULT* 🎬\n\n` +
          `📌 *Title:* ${result.title || "N/A"}\n` +
          `👤 *Channel:* ${result.author || "N/A"}\n` +
          `⏱️ *Duration:* ${result.lengthSeconds ? formatDuration(result.lengthSeconds) : "N/A"}\n` +
          `🔗 *Link:* https://www.youtube.com/watch?v=${result.videoId}\n\n` +
          `💡 *Download:* \`${config.prefix}song ${query}\``;

        try {
          await sock.sendMessage(m.chat, { image: { url: result.thumbnail }, caption: text }, { quoted: m });
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

  tiktok: {
    name: "tiktok",
    alias: ["tt", "tiktokdl"],
    category: "download",
    desc: "Download TikTok video without watermark",
    async execute(sock, m, args) {
      const url = args[0];
      if (!url || !url.includes("tiktok.com")) {
        return sock.sendMessage(m.chat, {
          text: `⚠️ *Please provide a valid TikTok URL!*\n\n*Example:* ${config.prefix}tiktok https://vm.tiktok.com/...`
        }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "⏳ *Downloading TikTok video (No Watermark)...*" }, { quoted: m });

      try {
        const result = await Downloader(url, { version: "v1" });
        if (result.status === "success" && result.result) {
          const videoUrl = result.result.video?.playAddr?.[0] || result.result.videoUrl;
          const title = result.result.description || result.result.title || "TikTok Video";
          const author = result.result.author?.nickname || "TikTok User";

          if (videoUrl) {
            return await sock.sendMessage(m.chat, {
              video: { url: videoUrl },
              caption: `🎵 *${title}*\n👤 *Creator:* ${author}\n\n> ${config.footer}`
            }, { quoted: m });
          }
        }
        await sock.sendMessage(m.chat, { text: "❌ *Could not download TikTok video. Check if the link is public.*" }, { quoted: m });
      } catch (err) {
        console.error("TikTok error:", err.message);
        await sock.sendMessage(m.chat, { text: `❌ *Download failed:* ${err.message}` }, { quoted: m });
      }
    }
  },

  instagram: {
    name: "instagram",
    alias: ["ig", "igdl", "reels"],
    category: "download",
    desc: "Download Instagram Reels or post video",
    async execute(sock, m, args) {
      const url = args[0];
      if (!url || !url.includes("instagram.com")) {
        return sock.sendMessage(m.chat, {
          text: `⚠️ *Please provide a valid Instagram URL!*\n\n*Example:* ${config.prefix}ig https://www.instagram.com/reel/...`
        }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "⏳ *Fetching Instagram media...*" }, { quoted: m });

      try {
        // Fast online resolver
        const snapinstaLink = `https://snapinsta.app/?url=${encodeURIComponent(url)}`;
        await sock.sendMessage(m.chat, {
          text: `📸 *INSTAGRAM DOWNLOADER*\n\n` +
            `🔗 *Direct Post:* ${url}\n\n` +
            `✨ Instagram post direct link:\n${snapinstaLink}\n\n` +
            `> ${config.footer}`
        }, { quoted: m });
      } catch (err) {
        console.error("IG error:", err.message);
        await sock.sendMessage(m.chat, { text: `❌ *Download failed:* ${err.message}` }, { quoted: m });
      }
    }
  },

  // Internal handler for mp3/mp4 reply processing
  handleDownloadReply: async function (sock, m, text) {
    const raw = (text || "").trim().toLowerCase();

    // Flexible format matching (supports typos like mb4, mb3, 1, 2, audio, video)
    let format = null;
    if (["mp3", "mb3", "audio", "song", "music", "1"].includes(raw)) {
      format = "mp3";
    } else if (["mp4", "mb4", "video", "vid", "2"].includes(raw)) {
      format = "mp4";
    }

    if (!format) return false;

    const sender = m.sender || m.key?.participant || m.key?.remoteJid;
    const chat = m.chat || m.key?.remoteJid;

    // Check by userKey or chat
    const userKey = `${sender}_${chat}`;
    let pending = pendingDownloads.get(userKey) || pendingDownloads.get(chat) || pendingDownloads.get(sender);

    if (!pending) return false;

    // Check expiry
    if (Date.now() > pending.expires) {
      pendingDownloads.delete(userKey);
      pendingDownloads.delete(chat);
      pendingDownloads.delete(sender);
      return false;
    }

    // Clear pending state
    pendingDownloads.delete(userKey);
    pendingDownloads.delete(chat);
    pendingDownloads.delete(sender);

    await sock.sendMessage(
      chat,
      {
        text: `⬇️ *Downloading ${format.toUpperCase()}...*\n🎵 *${pending.title}*\n⏳ Please wait, streaming directly...`,
      },
      { quoted: m }
    );

    try {
      if (format === "mp3") {
        // High quality audio stream
        const audioStream = yt.download(pending.videoUrl, {
          filter: { hasAudio: true, hasVideo: false }
        });

        const audioBuffer = await streamToBuffer(audioStream, 40 * 1024 * 1024);

        await sock.sendMessage(
          chat,
          {
            audio: audioBuffer,
            mimetype: "audio/mp4",
            fileName: `${pending.title}.mp3`,
            caption: `🎵 *${pending.title}*\n👤 ${pending.author}\n\n> ${config.footer}`,
          },
          { quoted: m }
        );
      } else {
        // Video stream
        const videoStream = yt.download(pending.videoUrl, {
          quality: "lowest"
        });

        const videoBuffer = await streamToBuffer(videoStream, 45 * 1024 * 1024);

        await sock.sendMessage(
          chat,
          {
            video: videoBuffer,
            caption: `🎬 *${pending.title}*\n👤 ${pending.author}\n\n> ${config.footer}`,
            fileName: `${pending.title}.mp4`,
          },
          { quoted: m }
        );
      }
    } catch (err) {
      console.error("Download processing error:", err.message);
      await sock.sendMessage(
        chat,
        { text: `❌ *Download failed:*\n\`${err.message}\`\n\n🔗 *YouTube link:* ${pending.videoUrl}` },
        { quoted: m }
      );
    }

    return true;
  },
};
