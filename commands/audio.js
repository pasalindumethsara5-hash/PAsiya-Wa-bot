const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const fs = require("fs");
const path = require("path");
const os = require("os");
const config = require("../config");

try {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
} catch (e) {}

/**
 * Apply FFmpeg audio filter to a buffer and return the processed audio buffer
 */
function applyAudioFilter(inputBuffer, filterOptions) {
  return new Promise((resolve, reject) => {
    const tempId = Date.now() + "_" + Math.floor(Math.random() * 1000);
    const tempInput = path.join(os.tmpdir(), `audio_in_${tempId}.mp3`);
    const tempOutput = path.join(os.tmpdir(), `audio_out_${tempId}.mp3`);

    fs.writeFileSync(tempInput, inputBuffer);

    let command = ffmpeg(tempInput);

    if (filterOptions.audioFilters) {
      command = command.audioFilters(filterOptions.audioFilters);
    }
    if (filterOptions.format) {
      command = command.format(filterOptions.format);
    } else {
      command = command.format("mp3");
    }

    command
      .save(tempOutput)
      .on("end", () => {
        try {
          const outputBuffer = fs.readFileSync(tempOutput);
          fs.unlinkSync(tempInput);
          fs.unlinkSync(tempOutput);
          resolve(outputBuffer);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => {
        try {
          if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
          if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
        } catch (e) {}
        reject(err);
      });
  });
}

/**
 * Helper to extract audio buffer from quoted or current message
 */
async function getAudioBuffer(m) {
  const quoted = m.quoted;
  const target = quoted && quoted.message ? quoted.message : m.message;
  if (!target) return null;

  const msgType = Object.keys(target)[0];
  const isAudioOrVideo =
    msgType === "audioMessage" ||
    msgType === "videoMessage" ||
    target.audioMessage ||
    target.videoMessage;

  if (!isAudioOrVideo) return null;

  const messageToDownload = quoted && quoted.message ? quoted : m;
  return await downloadMediaMessage(messageToDownload, "buffer", {});
}

module.exports = {
  bass: {
    name: "bass",
    alias: ["bassboost", "bboost"],
    category: "audio",
    desc: "Apply heavy Bass Boost to audio or song",
    async execute(sock, m) {
      const buffer = await getAudioBuffer(m);
      if (!buffer) {
        return sock.sendMessage(m.chat, {
          text: `⚠️ *Please reply to an audio or song with ${config.prefix}bass!*`
        }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "🔊 *Applying Bass Boost...*" }, { quoted: m });

      try {
        const processed = await applyAudioFilter(buffer, {
          audioFilters: "equalizer=f=45:width_type=h:width=50:g=15,equalizer=f=90:width_type=h:width=50:g=10"
        });
        await sock.sendMessage(m.chat, {
          audio: processed,
          mimetype: "audio/mp4",
          caption: `🔊 *Bass Boosted Audio*\n> ${config.footer}`
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: `❌ *Error:* ${err.message}` }, { quoted: m });
      }
    }
  },

  nightcore: {
    name: "nightcore",
    alias: ["nc"],
    category: "audio",
    desc: "Apply Nightcore speed & pitch effect",
    async execute(sock, m) {
      const buffer = await getAudioBuffer(m);
      if (!buffer) {
        return sock.sendMessage(m.chat, {
          text: `⚠️ *Please reply to an audio or song with ${config.prefix}nightcore!*`
        }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "⚡ *Creating Nightcore Remix...*" }, { quoted: m });

      try {
        const processed = await applyAudioFilter(buffer, {
          audioFilters: "asetrate=44100*1.25,atempo=1.05"
        });
        await sock.sendMessage(m.chat, {
          audio: processed,
          mimetype: "audio/mp4",
          caption: `⚡ *Nightcore Remix*\n> ${config.footer}`
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: `❌ *Error:* ${err.message}` }, { quoted: m });
      }
    }
  },

  slow: {
    name: "slow",
    alias: ["slowed", "reverb", "lofi"],
    category: "audio",
    desc: "Apply Slowed + Reverb Lo-Fi effect",
    async execute(sock, m) {
      const buffer = await getAudioBuffer(m);
      if (!buffer) {
        return sock.sendMessage(m.chat, {
          text: `⚠️ *Please reply to an audio or song with ${config.prefix}slow!*`
        }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "🌙 *Applying Slowed + Reverb effect...*" }, { quoted: m });

      try {
        const processed = await applyAudioFilter(buffer, {
          audioFilters: "asetrate=44100*0.85,atempo=1.0,aecho=0.8:0.88:60:0.4"
        });
        await sock.sendMessage(m.chat, {
          audio: processed,
          mimetype: "audio/mp4",
          caption: `🌙 *Slowed + Reverb Audio*\n> ${config.footer}`
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: `❌ *Error:* ${err.message}` }, { quoted: m });
      }
    }
  },

  robot: {
    name: "robot",
    alias: ["botvoice"],
    category: "audio",
    desc: "Change voice to a robot synth",
    async execute(sock, m) {
      const buffer = await getAudioBuffer(m);
      if (!buffer) {
        return sock.sendMessage(m.chat, {
          text: `⚠️ *Please reply to a voice note with ${config.prefix}robot!*`
        }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "🤖 *Applying Robot Voice...*" }, { quoted: m });

      try {
        const processed = await applyAudioFilter(buffer, {
          audioFilters: "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75"
        });
        await sock.sendMessage(m.chat, {
          audio: processed,
          mimetype: "audio/mp4",
          caption: `🤖 *Robot Voice*\n> ${config.footer}`
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: `❌ *Error:* ${err.message}` }, { quoted: m });
      }
    }
  },

  deep: {
    name: "deep",
    alias: ["deepvoice"],
    category: "audio",
    desc: "Apply Deep Pitch voice effect",
    async execute(sock, m) {
      const buffer = await getAudioBuffer(m);
      if (!buffer) {
        return sock.sendMessage(m.chat, {
          text: `⚠️ *Please reply to an audio or voice note with ${config.prefix}deep!*`
        }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "🎙️ *Deepening voice pitch...*" }, { quoted: m });

      try {
        const processed = await applyAudioFilter(buffer, {
          audioFilters: "asetrate=44100*0.75,atempo=1.15"
        });
        await sock.sendMessage(m.chat, {
          audio: processed,
          mimetype: "audio/mp4",
          caption: `🎙️ *Deep Pitch Audio*\n> ${config.footer}`
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: `❌ *Error:* ${err.message}` }, { quoted: m });
      }
    }
  },

  reverse: {
    name: "reverse",
    alias: ["backward"],
    category: "audio",
    desc: "Reverse audio playback",
    async execute(sock, m) {
      const buffer = await getAudioBuffer(m);
      if (!buffer) {
        return sock.sendMessage(m.chat, {
          text: `⚠️ *Please reply to an audio with ${config.prefix}reverse!*`
        }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "🔄 *Reversing audio...*" }, { quoted: m });

      try {
        const processed = await applyAudioFilter(buffer, {
          audioFilters: "areverse"
        });
        await sock.sendMessage(m.chat, {
          audio: processed,
          mimetype: "audio/mp4",
          caption: `🔄 *Reversed Audio*\n> ${config.footer}`
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: `❌ *Error:* ${err.message}` }, { quoted: m });
      }
    }
  },

  fast: {
    name: "fast",
    alias: ["speedup", "speed"],
    category: "audio",
    desc: "Speed up audio playback 1.4x",
    async execute(sock, m) {
      const buffer = await getAudioBuffer(m);
      if (!buffer) {
        return sock.sendMessage(m.chat, {
          text: `⚠️ *Please reply to an audio with ${config.prefix}fast!*`
        }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "⏩ *Speeding up audio...*" }, { quoted: m });

      try {
        const processed = await applyAudioFilter(buffer, {
          audioFilters: "atempo=1.4"
        });
        await sock.sendMessage(m.chat, {
          audio: processed,
          mimetype: "audio/mp4",
          caption: `⏩ *Sped Up Audio*\n> ${config.footer}`
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: `❌ *Error:* ${err.message}` }, { quoted: m });
      }
    }
  },

  tomp3: {
    name: "tomp3",
    alias: ["mp3convert", "vn"],
    category: "audio",
    desc: "Convert a video or voice note into clean MP3 audio",
    async execute(sock, m) {
      const buffer = await getAudioBuffer(m);
      if (!buffer) {
        return sock.sendMessage(m.chat, {
          text: `⚠️ *Please reply to a video or voice note with ${config.prefix}tomp3!*`
        }, { quoted: m });
      }

      await sock.sendMessage(m.chat, { text: "🎵 *Converting to MP3...*" }, { quoted: m });

      try {
        const processed = await applyAudioFilter(buffer, {});
        await sock.sendMessage(m.chat, {
          audio: processed,
          mimetype: "audio/mp4",
          fileName: "converted.mp3",
          caption: `🎵 *Converted MP3 Audio*\n> ${config.footer}`
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(m.chat, { text: `❌ *Error:* ${err.message}` }, { quoted: m });
      }
    }
  }
};
