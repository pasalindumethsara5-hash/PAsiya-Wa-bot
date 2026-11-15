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
};
