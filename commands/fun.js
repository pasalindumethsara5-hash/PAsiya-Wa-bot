const axios = require("axios");
const config = require("../config");

const EIGHT_BALL_ANSWERS = [
  "🎱 It is certain.",
  "🎱 It is decidedly so.",
  "🎱 Without a doubt.",
  "🎱 Yes definitely.",
  "🎱 You may rely on it.",
  "🎱 As I see it, yes.",
  "🎱 Most likely.",
  "🎱 Outlook good.",
  "🎱 Yes.",
  "🎱 Signs point to yes.",
  "🎱 Reply hazy, try again.",
  "🎱 Ask again later.",
  "🎱 Better not tell you now.",
  "🎱 Cannot predict now.",
  "🎱 Concentrate and ask again.",
  "🎱 Don't count on it.",
  "🎱 My reply is no.",
  "🎱 My sources say no.",
  "🎱 Outlook not so good.",
  "🎱 Very doubtful."
];

const ROASTS = [
  "You bring everyone so much joy... when you leave the room.",
  "I'd agree with you, but then we'd both be wrong.",
  "Your secrets are always safe with me. I never even listen when you tell me.",
  "You're not stupid; you just have bad luck when thinking.",
  "Mokada machan mehema? Wi-Fi router ekakatath oyata wada range ekak thiyenawa!",
  "Aney oyage mole airplane mode daala da thiyenne?",
  "Oya mathak karanna gaththama light bill eka wadi wenawa wage therena deyak na neda?",
  "Oya kiyana dewal walata Google ekatath uththara na, e tharam moda nisa!",
  "If laughter is the best medicine, your face must be curing the world.",
  "I’m not insulting you, I’m just describing you.",
  "You are like a cloud. When you disappear, it's a beautiful day.",
  "Oya wage dial ekak dakkamai first time solar system ekatath lejjawak danenne!",
  "Somewhere out there, a tree is working tirelessly to produce oxygen for you. Go apologize to it.",
  "Oyata battery low unath phone eka wada, eth oyage brain eka low unoth mulu looketama therenawa!",
  "I’d explain it to you, but I left my crayons at home."
];

const TRUTHS = [
  "What is the most embarrassing thing in your search history?",
  "Have you ever lied to get out of hanging out with someone?",
  "Who was your first crush?",
  "What is your biggest secret that nobody in this group knows?",
  "What is the most childish thing you still do?",
  "Have you ever peed in a swimming pool?",
  "If you had to delete one person from your life, who would it be?",
  "What’s the worst date you’ve ever been on?",
  "What is one thing you regret doing in school?",
  "Have you ever stalked someone on social media for hours?",
  "What's your biggest guilty pleasure?",
  "Who is the last person you texted and what did you say?",
  "Have you ever pretended to be sick to skip work/school?",
  "What's the weirdest dream you've ever had?",
  "If you could trade lives with anyone for a day, who would it be?"
];

const DARES = [
  "Send a voice note singing your favorite Sinhala song in this chat!",
  "Change your WhatsApp about/bio to 'I love PASIYA-MD Bot' for 2 hours!",
  "Send an embarrassing selfie right now!",
  "Call a friend and scream 'Alien kenek aawa!' then hang up.",
  "Type your crush's name with your nose and send it here.",
  "Send the 5th picture in your phone gallery with no context.",
  "Post a status saying 'Getting married next week ❤️' for 15 minutes.",
  "Do 15 pushups and send an audio proving you are breathless!",
  "Send your most used emoji 20 times right now.",
  "Send a voice message speaking like an old grandma/grandpa.",
  "Text someone random 'I know what you did last summer'.",
  "Send the last screenshot taken on your phone.",
  "Try not to smile or laugh for the next 10 minutes.",
  "Tell a funny joke, if nobody laughs, do 20 jumping jacks.",
  "Give a genuine compliment to every person in this chat!"
];

const FALLBACK_QUOTES = [
  { content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { content: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { content: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { content: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { content: "It always seems impossible until it is done.", author: "Nelson Mandela" },
  { content: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { content: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { content: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { content: "Happiness is not something readymade. It comes from your own actions.", author: "Dalai Lama" },
  { content: "Act as if what you do makes a difference. It does.", author: "William James" }
];

module.exports = {
  eightball: {
    name: "8ball",
    alias: ["magic", "oracle"],
    category: "fun",
    desc: "Ask the magic 8-ball any question",
    async execute(sock, m, args) {
      const question = args.join(" ");
      if (!question) {
        return sock.sendMessage(m.chat, { text: "⚠️ *Please ask a question!* (e.g. `.8ball will I get rich?`)" }, { quoted: m });
      }
      const randomAnswer = EIGHT_BALL_ANSWERS[Math.floor(Math.random() * EIGHT_BALL_ANSWERS.length)];
      const response = `🔮 *MAGIC 8-BALL*\n\n❓ *Question:* ${question}\n✨ *Answer:* ${randomAnswer}`;
      await sock.sendMessage(m.chat, { text: response }, { quoted: m });
    }
  },

  roast: {
    name: "roast",
    alias: ["burn"],
    category: "fun",
    desc: "Deliver a savage roast to someone",
    async execute(sock, m, args) {
      let target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
      let targetName = "You";
      let mentions = [];

      if (target) {
        targetName = `@${target.split("@")[0]}`;
        mentions.push(target);
      } else if (args.length > 0) {
        targetName = args.join(" ");
      }

      const randomRoast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
      const reply = `🔥 *SAVAGE ROAST*\n\n🎯 *Target:* ${targetName}\n💬 *Roast:* ${randomRoast}\n\n😂 *Don't take it personally!*`;
      await sock.sendMessage(m.chat, { text: reply, mentions }, { quoted: m });
    }
  },

  ship: {
    name: "ship",
    alias: ["love", "match"],
    category: "fun",
    desc: "Calculate love match percentage between two people",
    async execute(sock, m, args) {
      let p1, p2;
      const mentions = m.mentionedJid || [];

      if (mentions.length >= 2) {
        p1 = `@${mentions[0].split("@")[0]}`;
        p2 = `@${mentions[1].split("@")[0]}`;
      } else if (mentions.length === 1 && m.quoted) {
        p1 = `@${mentions[0].split("@")[0]}`;
        p2 = `@${m.quoted.sender.split("@")[0]}`;
        mentions.push(m.quoted.sender);
      } else {
        const textParts = args.join(" ").split(/and|\+/i);
        if (textParts.length >= 2) {
          p1 = textParts[0].trim();
          p2 = textParts[1].trim();
        } else {
          return sock.sendMessage(m.chat, {
            text: `⚠️ *Tag or name two people to ship!*\nUsage: \`${config.prefix}ship @person1 @person2\` or \`${config.prefix}ship Jack and Rose\``
          }, { quoted: m });
        }
      }

      // Deterministic percentage based on names so repeated calls give consistent fun
      const combined = (p1 + p2).toLowerCase();
      let seed = 0;
      for (let i = 0; i < combined.length; i++) {
        seed = (seed + combined.charCodeAt(i) * 17) % 101;
      }
      const percent = seed;

      // Heart progress bar
      const filled = Math.round(percent / 10);
      const empty = 10 - filled;
      const bar = "❤️".repeat(filled) + "🖤".repeat(empty);

      let comment = "💔 Better stay as friends...";
      if (percent > 85) comment = "💍 Soulmates! When is the wedding?";
      else if (percent > 65) comment = "🔥 Perfect match! Sparks are flying!";
      else if (percent > 45) comment = "💖 There's definitely potential!";
      else if (percent > 25) comment = "👀 It's complicated...";

      const text = `💘 *LOVE CALCULATOR* 💘\n\n👤 *Person 1:* ${p1}\n👤 *Person 2:* ${p2}\n\n📊 *Score:* ${percent}%\n${bar}\n\n💬 *Verdict:* ${comment}\n\n> ${config.footer}`;
      await sock.sendMessage(m.chat, { text, mentions }, { quoted: m });
    }
  },

  quote: {
    name: "quote",
    alias: ["motivate", "inspire"],
    category: "fun",
    desc: "Get an inspiring quote",
    async execute(sock, m) {
      try {
        const res = await axios.get("https://dummyjson.com/quotes/random", { timeout: 7000 });
        if (res.data && res.data.quote) {
          const text = `📜 *QUOTE OF THE MOMENT*\n\n"${res.data.quote}"\n\n✍️ *Author:* ${res.data.author}\n\n> ${config.footer}`;
          return await sock.sendMessage(m.chat, { text }, { quoted: m });
        }
      } catch (err) {}

      // Fallback
      const randomQ = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
      const text = `📜 *QUOTE OF THE MOMENT*\n\n"${randomQ.content}"\n\n✍️ *Author:* ${randomQ.author}\n\n> ${config.footer}`;
      await sock.sendMessage(m.chat, { text }, { quoted: m });
    }
  },

  meme: {
    name: "meme",
    alias: ["funnymeme"],
    category: "fun",
    desc: "Get a random funny meme",
    async execute(sock, m) {
      await sock.sendMessage(m.chat, { text: "⏳ *Fetching a fresh meme...*" }, { quoted: m });
      try {
        const res = await axios.get("https://meme-api.com/gimme", { timeout: 10000 });
        if (res.data && res.data.url) {
          return await sock.sendMessage(m.chat, {
            image: { url: res.data.url },
            caption: `😂 *${res.data.title || "Random Meme"}*\n👍 Upvotes: ${res.data.ups || 0}\n\n> ${config.footer}`
          }, { quoted: m });
        }
      } catch (e) {}

      await sock.sendMessage(m.chat, {
        text: "😂 *Why don't scientists trust atoms?*\nBecause they make up everything! ⚛️\n\n*(Meme API temporarily unreachable)*"
      }, { quoted: m });
    }
  },

  truth: {
    name: "truth",
    alias: ["truthquestion"],
    category: "fun",
    desc: "Get a Truth or Dare truth question",
    async execute(sock, m) {
      const q = TRUTHS[Math.floor(Math.random() * TRUTHS.length)];
      const text = `🤫 *TRUTH TIME!*\n\n👉 ${q}\n\n⚠️ *Answer honestly in the chat!*`;
      await sock.sendMessage(m.chat, { text }, { quoted: m });
    }
  },

  dare: {
    name: "dare",
    alias: ["darechallenge"],
    category: "fun",
    desc: "Get a Truth or Dare dare challenge",
    async execute(sock, m) {
      const d = DARES[Math.floor(Math.random() * DARES.length)];
      const text = `😈 *DARE CHALLENGE!*\n\n👉 ${d}\n\n💥 *No backing out allowed!*`;
      await sock.sendMessage(m.chat, { text }, { quoted: m });
    }
  },

  rps: {
    name: "rps",
    alias: ["rockpaperscissors"],
    category: "fun",
    desc: "Play Rock Paper Scissors against the bot",
    async execute(sock, m, args) {
      const userChoice = (args[0] || "").toLowerCase();
      const valid = ["rock", "paper", "scissors"];
      if (!valid.includes(userChoice)) {
        return sock.sendMessage(m.chat, {
          text: `⚠️ *Choose rock, paper, or scissors!*\nUsage: \`${config.prefix}rps rock\` (or paper / scissors)`
        }, { quoted: m });
      }

      const botChoice = valid[Math.floor(Math.random() * valid.length)];
      const emojis = { rock: "🪨 Rock", paper: "📄 Paper", scissors: "✂️ Scissors" };

      let result;
      if (userChoice === botChoice) {
        result = "🤝 *It's a TIE!* Great minds think alike!";
      } else if (
        (userChoice === "rock" && botChoice === "scissors") ||
        (userChoice === "paper" && botChoice === "rock") ||
        (userChoice === "scissors" && botChoice === "paper")
      ) {
        result = "🎉 *YOU WON!* Nicely played, human!";
      } else {
        result = "🤖 *PASIYA-MD WON!* Better luck next time!";
      }

      const text = `🎮 *ROCK PAPER SCISSORS*\n\n👤 *You:* ${emojis[userChoice]}\n🤖 *Bot:* ${emojis[botChoice]}\n\n${result}`;
      await sock.sendMessage(m.chat, { text }, { quoted: m });
    }
  },

  flip: {
    name: "flip",
    alias: ["coin", "toss"],
    category: "fun",
    desc: "Flip a coin (Heads or Tails)",
    async execute(sock, m) {
      const isHeads = Math.random() < 0.5;
      const text = `🪙 *COIN TOSS*\n\nThe coin flipped in the air and landed on...\n\n👉 *${isHeads ? "👑 HEADS" : "🪙 TAILS"}*!`;
      await sock.sendMessage(m.chat, { text }, { quoted: m });
    }
  },

  dice: {
    name: "dice",
    alias: ["roll"],
    category: "fun",
    desc: "Roll a 6-sided dice",
    async execute(sock, m) {
      const diceFaces = ["⚀ 1", "⚁ 2", "⚂ 3", "⚃ 4", "⚄ 5", "⚅ 6"];
      const roll = Math.floor(Math.random() * 6);
      const text = `🎲 *DICE ROLL*\n\nYou rolled the dice and got:\n\n👉 *${diceFaces[roll]}*!`;
      await sock.sendMessage(m.chat, { text }, { quoted: m });
    }
  }
};
