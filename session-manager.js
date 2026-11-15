/**
 * 🛡️ PASIYA-MD Session Manager
 * Railway deploy ekedi session eka restore karanawa
 * 
 * Cloud eke session store karaganna BASE64 method use karanawa
 * 1. Local PC eke: node session-manager.js export  → prints BASE64 string
 * 2. Railway env variable ekedi paste karanawa (SESSION_DATA)
 * 3. Cloud eke: node session-manager.js import  → restores session
 */

const fs = require("fs");
const path = require("path");

const SESSION_PATH = path.join(__dirname, "session");

function exportSession() {
  if (!fs.existsSync(SESSION_PATH)) {
    console.log("❌ No session folder found! Run bot first to create session.");
    return;
  }

  const files = {};
  const allFiles = fs.readdirSync(SESSION_PATH);

  for (const file of allFiles) {
    const content = fs.readFileSync(path.join(SESSION_PATH, file), "utf8");
    files[file] = content;
  }

  const encoded = Buffer.from(JSON.stringify(files)).toString("base64");

  console.log("\n✅ SESSION EXPORTED SUCCESSFULLY!\n");
  console.log("📋 Copy this ENTIRE string and paste as Railway Environment Variable:");
  console.log("   Variable Name: SESSION_DATA");
  console.log("\n" + "=".repeat(60));
  console.log(encoded);
  console.log("=".repeat(60) + "\n");
  console.log("👆 Copy everything between the === lines");
}

function importSession() {
  const sessionData = process.env.SESSION_DATA;

  if (!sessionData) {
    console.log("⚠️ SESSION_DATA environment variable not found — using local session.");
    return false;
  }

  try {
    const files = JSON.parse(Buffer.from(sessionData, "base64").toString("utf8"));

    if (!fs.existsSync(SESSION_PATH)) {
      fs.mkdirSync(SESSION_PATH, { recursive: true });
    }

    for (const [filename, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(SESSION_PATH, filename), content, "utf8");
    }

    console.log(`\x1b[32m[SESSION] ✅ Session restored from cloud! (${Object.keys(files).length} files)\x1b[0m`);
    return true;
  } catch (e) {
    console.error("[SESSION] ❌ Failed to restore session:", e.message);
    return false;
  }
}

// Called directly: node session-manager.js export
if (require.main === module) {
  const action = process.argv[2];
  if (action === "export") {
    exportSession();
  } else if (action === "import") {
    importSession();
  } else {
    console.log("Usage:");
    console.log("  node session-manager.js export  → Export session for Railway");
    console.log("  node session-manager.js import  → Import session from env var");
  }
}

module.exports = { importSession };
