const axios = require("axios");
const config = require("../config");

module.exports = {
  calc: {
    name: "calc",
    alias: ["math"],
    category: "tools",
    desc: "Calculate simple mathematical expressions",
    async execute(sock, m, args) {
      const exp = args.join(" ");
      if (!exp) return sock.sendMessage(m.chat, { text: "⚠️ *Provide an expression!* (e.g. .calc 25*4+10)" }, { quoted: m });
      try {
        // Safe evaluation
        const sanitized = exp.replace(/[^0-9+\-*/().]/g, "");
        const result = Function(`'use strict'; return (${sanitized})`)();
        await sock.sendMessage(m.chat, { text: `🧮 *Result:* ${result}` }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "❌ *Invalid calculation!*" }, { quoted: m });
      }
    },
  },

  tts: {
    name: "tts",
    alias: ["speak"],
    category: "tools",
    desc: "Convert text to speech audio",
    async execute(sock, m, args) {
      const text = args.join(" ");
      if (!text) return sock.sendMessage(m.chat, { text: `⚠️ *Provide text to speak!* (e.g. ${config.prefix}tts Hello Pasiya)` }, { quoted: m });

      try {
        await sock.sendMessage(m.chat, { text: "🎙️ *Generating voice...*" }, { quoted: m });
        const url = `https://api.voicerss.org/?key=demo&hl=en-us&src=${encodeURIComponent(text)}&c=MP3&f=16khz_16bit_stereo`;
        const res = await axios.get(url, { responseType: "arraybuffer" });
        const buffer = Buffer.from(res.data);
        await sock.sendMessage(m.chat, { audio: buffer, mimetype: "audio/mp4", ptt: true }, { quoted: m });
      } catch (err) {
        // Fallback - send as text with TTS link
        const ttsLink = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
        await sock.sendMessage(m.chat, { 
          text: `🎙️ *TTS Generated!*\n📝 *Text:* ${text}\n🔗 *Listen:* ${ttsLink}` 
        }, { quoted: m });
      }
    },
  },

  weather: {
    name: "weather",
    alias: ["climate"],
    category: "tools",
    desc: "Fetch real-time weather information",
    async execute(sock, m, args) {
      const city = args.join(" ") || "Colombo";
      try {
        const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
        const current = res.data.current_condition[0];
        const text = `
🌤️ *WEATHER REPORT - ${city.toUpperCase()}* 🌤️

🌡️ *Temperature:* ${current.temp_C}°C (${current.temp_F}°F)
🤔 *Feels Like:* ${current.FeelsLikeC}°C
💧 *Humidity:* ${current.humidity}%
🌬️ *Wind Speed:* ${current.windspeedKmph} km/h
☁️ *Condition:* ${current.weatherDesc[0].value}

> ${config.footer}`;
        await sock.sendMessage(m.chat, { text }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "❌ *City not found or service unavailable.*" }, { quoted: m });
      }
    },
  },

  joke: {
    name: "joke",
    alias: ["funny"],
    category: "tools",
    desc: "Get a funny joke",
    async execute(sock, m) {
      try {
        const res = await axios.get("https://official-joke-api.appspot.com/random_joke");
        const joke = `😂 *${res.data.setup}*\n\n👉 *${res.data.punchline}*`;
        await sock.sendMessage(m.chat, { text: joke }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "Why did the computer sneeze? It caught a virus! 🤧" }, { quoted: m });
      }
    },
  },

  fact: {
    name: "fact",
    alias: ["facts"],
    category: "tools",
    desc: "Get an interesting random fact",
    async execute(sock, m) {
      try {
        const res = await axios.get("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en");
        await sock.sendMessage(m.chat, { text: `🧠 *Did you know?*\n\n${res.data.text}` }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "🧠 *Did you know?* Honey never spoils!" }, { quoted: m });
      }
    },
  },

  qr: {
    name: "qr",
    alias: ["qrcode"],
    category: "tools",
    desc: "Generate a QR code image for any text or URL",
    async execute(sock, m, args) {
      const text = args.join(" ");
      if (!text) return sock.sendMessage(m.chat, { text: `⚠️ *Provide text or URL!* (e.g. ${config.prefix}qr https://google.com)` }, { quoted: m });
      try {
        const imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(text)}`;
        const res = await axios.get(imageUrl, { responseType: "arraybuffer" });
        const buffer = Buffer.from(res.data);
        await sock.sendMessage(m.chat, { image: buffer, caption: `📷 *QR Code generated for:*\n${text}` }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "❌ *Failed to generate QR code.*" }, { quoted: m });
      }
    },
  },

  shorturl: {
    name: "shorturl",
    alias: ["short", "shorten"],
    category: "tools",
    desc: "Shorten a long URL using TinyURL",
    async execute(sock, m, args) {
      const rawText = args.join(" ");
      const urlMatch = rawText.match(/https?:\/\/[^\s<>"]+/i);
      const url = urlMatch ? urlMatch[0] : (args[0] || "").replace(/^[<(\[]+/, "").replace(/[>)\]]+$/, "").trim();

      if (!url) return sock.sendMessage(m.chat, { text: `⚠️ *Provide a URL to shorten!* (e.g. ${config.prefix}shorturl https://google.com)` }, { quoted: m });
      try {
        const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        await sock.sendMessage(m.chat, {
          text: `🔗 *URL Shortened!*\n\n📌 *Original:* ${url}\n✂️ *Short URL:* ${res.data}`,
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "❌ *Failed to shorten URL. Make sure it's a valid URL.*" }, { quoted: m });
      }
    },
  },

  define: {
    name: "define",
    alias: ["dictionary", "dict", "meaning"],
    category: "tools",
    desc: "Get the definition of a word",
    async execute(sock, m, args) {
      const word = args[0];
      if (!word) return sock.sendMessage(m.chat, { text: `⚠️ *Provide a word!* (e.g. ${config.prefix}define serendipity)` }, { quoted: m });
      try {
        const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        const data = res.data[0];
        const phonetic = data.phonetic || (data.phonetics && data.phonetics[0] && data.phonetics[0].text) || "N/A";
        const meaningObj = data.meanings[0];
        const partOfSpeech = meaningObj.partOfSpeech || "N/A";
        const definition = meaningObj.definitions[0].definition || "N/A";
        const example = meaningObj.definitions[0].example || "No example available";

        const text = `📖 *DICTIONARY*\n\n` +
          `📝 *Word:* ${data.word}\n` +
          `🔊 *Phonetic:* ${phonetic}\n` +
          `🏷️ *Part of Speech:* ${partOfSpeech}\n\n` +
          `📌 *Definition:*\n${definition}\n\n` +
          `💬 *Example:*\n_${example}_\n\n` +
          `> ${config.footer}`;
        await sock.sendMessage(m.chat, { text }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: `❌ *No definition found for "${word}".*` }, { quoted: m });
      }
    },
  },

  news: {
    name: "news",
    alias: ["headlines"],
    category: "tools",
    desc: "Get the top 5 latest news headlines",
    async execute(sock, m) {
      try {
        let articles;
        try {
          const res = await axios.get("https://gnews.io/api/v4/top-headlines?lang=en&max=5&apikey=free");
          articles = res.data.articles;
        } catch {
          const res = await axios.get("https://saurav.tech/NewsAPI/top-headlines/category/general/in.json");
          articles = res.data.articles.slice(0, 5);
        }

        if (!articles || articles.length === 0) {
          return sock.sendMessage(m.chat, { text: "❌ *No news available right now.*" }, { quoted: m });
        }

        let text = `📰 *TOP NEWS HEADLINES*\n${"─".repeat(30)}\n\n`;
        articles.slice(0, 5).forEach((article, i) => {
          text += `*${i + 1}.* ${article.title}\n`;
          text += `🔗 ${article.url || article.link || "N/A"}\n\n`;
        });
        text += `> ${config.footer}`;
        await sock.sendMessage(m.chat, { text }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "❌ *Failed to fetch news. Try again later.*" }, { quoted: m });
      }
    },
  },

  remind: {
    name: "remind",
    alias: ["reminder"],
    category: "tools",
    desc: "Set a reminder after a specified time (e.g. 30s, 5m, 1h)",
    async execute(sock, m, args) {
      if (args.length < 2) {
        return sock.sendMessage(m.chat, { text: `⚠️ *Usage:* ${config.prefix}remind 5m Study!\n\n⏱️ Formats: 30s, 5m, 1h, 2h30m` }, { quoted: m });
      }

      const timeStr = args[0];
      const message = args.slice(1).join(" ");

      // Parse time string like "30s", "5m", "1h", "1h30m"
      let ms = 0;
      const hours = timeStr.match(/(\d+)h/);
      const minutes = timeStr.match(/(\d+)m/);
      const seconds = timeStr.match(/(\d+)s/);
      if (hours) ms += parseInt(hours[1]) * 3600000;
      if (minutes) ms += parseInt(minutes[1]) * 60000;
      if (seconds) ms += parseInt(seconds[1]) * 1000;

      if (ms === 0) {
        return sock.sendMessage(m.chat, { text: `⚠️ *Invalid time format!* Use 30s, 5m, 1h, etc.` }, { quoted: m });
      }

      const maxMs = 24 * 3600000; // 24 hour limit
      if (ms > maxMs) {
        return sock.sendMessage(m.chat, { text: "⚠️ *Maximum reminder time is 24 hours.*" }, { quoted: m });
      }

      await sock.sendMessage(m.chat, {
        text: `⏰ *Reminder set!*\n\n📌 *Message:* ${message}\n⏱️ *In:* ${timeStr}\n\nI'll remind you at the right time! ✅`,
      }, { quoted: m });

      setTimeout(async () => {
        try {
          await sock.sendMessage(m.chat, {
            text: `⏰ *REMINDER!*\n\n📌 ${message}\n\n> ${config.footer}`,
          }, { quoted: m });
        } catch (e) {
          // Chat may no longer be available
        }
      }, ms);
    },
  },

  lyrics: {
    name: "lyrics",
    alias: ["lyric"],
    category: "tools",
    desc: "Fetch song lyrics",
    async execute(sock, m, args) {
      const song = args.join(" ");
      if (!song) return sock.sendMessage(m.chat, { text: `⚠️ *Provide a song name!* (e.g. ${config.prefix}lyrics Shape of You)` }, { quoted: m });
      try {
        await sock.sendMessage(m.chat, { text: "🎵 *Fetching lyrics...*" }, { quoted: m });
        const res = await axios.get(`https://lyrist.vercel.app/api/${encodeURIComponent(song)}`);
        const data = res.data;

        if (!data || !data.lyrics) {
          return sock.sendMessage(m.chat, { text: `❌ *Lyrics not found for "${song}".*` }, { quoted: m });
        }

        const lyricsPreview = data.lyrics.length > 1000 ? data.lyrics.substring(0, 1000) + "\n\n... *(lyrics truncated)*" : data.lyrics;
        const text = `🎵 *${data.title || song}*\n` +
          `🎤 *Artist:* ${data.artist || "Unknown"}\n` +
          `${"─".repeat(30)}\n\n` +
          `${lyricsPreview}\n\n` +
          `> ${config.footer}`;
        await sock.sendMessage(m.chat, { text }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: `❌ *Could not fetch lyrics for "${song}". Try again later.*` }, { quoted: m });
      }
    },
  },

  color: {
    name: "color",
    alias: ["colour", "hex"],
    category: "tools",
    desc: "Get color information from a hex code",
    async execute(sock, m, args) {
      let hex = args[0];
      if (!hex) return sock.sendMessage(m.chat, { text: `⚠️ *Provide a hex color code!* (e.g. ${config.prefix}color FF5733)` }, { quoted: m });

      // Strip leading # if present
      hex = hex.replace(/^#/, "");

      if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(hex)) {
        return sock.sendMessage(m.chat, { text: "⚠️ *Invalid hex code! Use format like FF5733 or F53.*" }, { quoted: m });
      }

      try {
        const res = await axios.get(`https://www.thecolorapi.com/id?hex=${hex}`);
        const data = res.data;
        const name = data.name && data.name.value ? data.name.value : "Unknown";
        const rgb = data.rgb;
        const hsl = data.hsl;

        const text = `🎨 *COLOR INFO*\n\n` +
          `🏷️ *Name:* ${name}\n` +
          `🔵 *Hex:* #${hex.toUpperCase()}\n` +
          `🔴 *RGB:* R:${rgb.r}, G:${rgb.g}, B:${rgb.b}\n` +
          `🌈 *HSL:* H:${hsl.h}°, S:${hsl.s}%, L:${hsl.l}%\n` +
          `🖼️ *Preview:* https://singlecolorimage.com/get/${hex}/100x100\n\n` +
          `> ${config.footer}`;
        await sock.sendMessage(m.chat, { text }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: "❌ *Failed to fetch color info. Check the hex code.*" }, { quoted: m });
      }
    },
  },

  save: {
    name: "save",
    alias: ["status", "sw", "statussave"],
    category: "tools",
    desc: "Save or download any quoted WhatsApp status story (photo or video)",
    async execute(sock, m) {
      if (!m.quoted) {
        return sock.sendMessage(m.chat, {
          text: `💡 *Reply to a WhatsApp status (Photo or Video) with ${config.prefix}save to download it!*`
        }, { quoted: m });
      }

      const qMsg = m.quoted.message;
      if (!qMsg) {
        return sock.sendMessage(m.chat, { text: "❌ *Could not find quoted status media.*" }, { quoted: m });
      }

      const isImage = qMsg.imageMessage;
      const isVideo = qMsg.videoMessage;
      const isAudio = qMsg.audioMessage;

      if (!isImage && !isVideo && !isAudio) {
        const text = m.quoted.text || "";
        if (text) {
          return sock.sendMessage(m.chat, {
            text: `📝 *Status Text:*\n\n${text}\n\n> ${config.footer}`
          }, { quoted: m });
        }
        return sock.sendMessage(m.chat, { text: "⚠️ *Please reply to a status image or video!*" }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "📥 *Saving status media...*" }, { quoted: m });

      try {
        const { downloadMediaMessage } = require("@whiskeysockets/baileys");
        const buffer = await downloadMediaMessage(m.quoted, "buffer", {});
        const caption = m.quoted.text ? `📌 *Caption:* ${m.quoted.text}\n\n> ${config.footer}` : `> ${config.footer}`;

        if (isImage) {
          await sock.sendMessage(m.chat, { image: buffer, caption }, { quoted: m });
        } else if (isVideo) {
          await sock.sendMessage(m.chat, { video: buffer, caption }, { quoted: m });
        } else if (isAudio) {
          await sock.sendMessage(m.chat, { audio: buffer, mimetype: "audio/mp4" }, { quoted: m });
        }
      } catch (err) {
        await sock.sendMessage(m.chat, { text: `❌ *Failed to download status:* ${err.message}` }, { quoted: m });
      }
    }
  },
};
