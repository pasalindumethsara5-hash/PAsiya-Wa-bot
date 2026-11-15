const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const config = require("../config");
const axios = require("axios");

/**
 * Helper: convert an emoji character to its lowercase hex codepoint string
 * e.g. "😀" -> "1f600"
 */
function emojiToHex(emoji) {
  const codePoint = emoji.codePointAt(0);
  return codePoint.toString(16).toLowerCase();
}

module.exports = {
  sticker: {
    name: "sticker",
    alias: ["s", "stiker"],
    category: "sticker",
    desc: "Convert a quoted image or video into a WhatsApp sticker.",
    async execute(sock, m, args) {
      try {
        // Must have a quoted message
        if (!m.quoted) {
          return await sock.sendMessage(
            m.chat,
            { text: "❌ Please quote an image or video to convert it into a sticker." },
            { quoted: m }
          );
        }

        const quotedMsg = m.quoted.message;
        const msgType = Object.keys(quotedMsg)[0];
        const isMedia =
          msgType === "imageMessage" ||
          msgType === "videoMessage" ||
          msgType === "stickerMessage";

        if (!isMedia) {
          return await sock.sendMessage(
            m.chat,
            { text: "❌ Please quote an *image* or *video* to convert it into a sticker." },
            { quoted: m }
          );
        }

        await sock.sendMessage(m.chat, { text: "⏳ Converting to sticker..." }, { quoted: m });

        let buffer;
        try {
          buffer = await downloadMediaMessage(m.quoted.message, "buffer", {});
        } catch (dlErr) {
          return await sock.sendMessage(
            m.chat,
            { text: `❌ Failed to download media: ${dlErr.message}` },
            { quoted: m }
          );
        }

        await sock.sendMessage(m.chat, { sticker: buffer }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(
          m.chat,
          { text: `❌ Error creating sticker: ${err.message}` },
          { quoted: m }
        );
      }
    },
  },

  toimg: {
    name: "toimg",
    alias: ["stickertoimg", "stoi"],
    category: "sticker",
    desc: "Convert a quoted sticker to an image.",
    async execute(sock, m, args) {
      try {
        if (!m.quoted) {
          return await sock.sendMessage(
            m.chat,
            { text: "❌ Please quote a sticker to convert it into an image." },
            { quoted: m }
          );
        }

        const quotedMsg = m.quoted.message;
        const msgType = Object.keys(quotedMsg)[0];

        if (msgType !== "stickerMessage") {
          return await sock.sendMessage(
            m.chat,
            { text: "❌ Please quote a *sticker* to convert it into an image." },
            { quoted: m }
          );
        }

        await sock.sendMessage(m.chat, { text: "⏳ Converting sticker to image..." }, { quoted: m });

        let buffer;
        try {
          buffer = await downloadMediaMessage(m.quoted.message, "buffer", {});
        } catch (dlErr) {
          return await sock.sendMessage(
            m.chat,
            { text: `❌ Failed to download sticker: ${dlErr.message}` },
            { quoted: m }
          );
        }

        await sock.sendMessage(
          m.chat,
          { image: buffer, caption: "🖼️ Here is your image!" },
          { quoted: m }
        );
      } catch (err) {
        await sock.sendMessage(
          m.chat,
          { text: `❌ Error converting sticker: ${err.message}` },
          { quoted: m }
        );
      }
    },
  },

  attp: {
    name: "attp",
    alias: ["text2sticker", "tt"],
    category: "sticker",
    desc: "Convert text into an animated sticker. Usage: .attp Hello World",
    async execute(sock, m, args) {
      try {
        const text = args.join(" ").trim();
        if (!text) {
          return await sock.sendMessage(
            m.chat,
            { text: "❌ Please provide text.\nUsage: `.attp Hello World`" },
            { quoted: m }
          );
        }

        await sock.sendMessage(m.chat, { text: "⏳ Generating animated sticker..." }, { quoted: m });

        const url = `https://api.lolhuman.xyz/api/ttp?apikey=lolhuman&text=${encodeURIComponent(text)}`;

        let buffer;
        try {
          const response = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
          buffer = Buffer.from(response.data);
        } catch (apiErr) {
          return await sock.sendMessage(
            m.chat,
            { text: "❌ Text-to-sticker API is currently unavailable. Please try again later." },
            { quoted: m }
          );
        }

        await sock.sendMessage(m.chat, { sticker: buffer }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(
          m.chat,
          { text: `❌ Error generating sticker: ${err.message}` },
          { quoted: m }
        );
      }
    },
  },

  emojimix: {
    name: "emojimix",
    alias: ["emix"],
    category: "sticker",
    desc: "Mix two emojis using Google Emoji Kitchen. Usage: .emojimix 😀 🔥",
    async execute(sock, m, args) {
      try {
        if (args.length < 2) {
          return await sock.sendMessage(
            m.chat,
            { text: "❌ Please provide two emojis.\nUsage: `.emojimix 😀 🔥`" },
            { quoted: m }
          );
        }

        const emoji1 = args[0].trim();
        const emoji2 = args[1].trim();

        // Basic validation: must be a single grapheme cluster (emoji)
        if (!emoji1 || !emoji2) {
          return await sock.sendMessage(
            m.chat,
            { text: "❌ Invalid emojis. Please provide two valid emojis.\nUsage: `.emojimix 😀 🔥`" },
            { quoted: m }
          );
        }

        const hex1 = emojiToHex(emoji1);
        const hex2 = emojiToHex(emoji2);

        const mixUrl = `https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u${hex1}/u${hex1}_u${hex2}.png`;

        await sock.sendMessage(m.chat, { text: "⏳ Mixing emojis..." }, { quoted: m });

        let buffer;
        try {
          const response = await axios.get(mixUrl, { responseType: "arraybuffer", timeout: 15000 });
          buffer = Buffer.from(response.data);
        } catch (apiErr) {
          // Try reversed order as fallback
          const mixUrlRev = `https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u${hex2}/u${hex2}_u${hex1}.png`;
          try {
            const response2 = await axios.get(mixUrlRev, { responseType: "arraybuffer", timeout: 15000 });
            buffer = Buffer.from(response2.data);
          } catch {
            return await sock.sendMessage(
              m.chat,
              {
                text: `❌ Could not mix ${emoji1} and ${emoji2}. This emoji combination may not be supported by Emoji Kitchen.\n\nTry a different pair of emojis!`,
              },
              { quoted: m }
            );
          }
        }

        await sock.sendMessage(
          m.chat,
          { image: buffer, caption: `${emoji1} + ${emoji2} = 🎉` },
          { quoted: m }
        );
      } catch (err) {
        await sock.sendMessage(
          m.chat,
          { text: `❌ Error mixing emojis: ${err.message}` },
          { quoted: m }
        );
      }
    },
  },
};
