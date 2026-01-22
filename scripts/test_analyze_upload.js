/**
 * Test script: posts an image to /api/analyze using the session flow.
 * Usage:
 *   node scripts/test_analyze_upload.js /path/to/image.jpg
 *
 * Requires the dev server to be running at http://localhost:3000
 */
import fs from "fs";
import path from "path";

const base = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  const imgPath = process.argv[2];
  if (!imgPath) {
    console.error("Usage: node scripts/test_analyze_upload.js /path/to/image.jpg");
    process.exit(1);
  }

  if (!fs.existsSync(imgPath)) {
    console.error("Image not found:", imgPath);
    process.exit(1);
  }

  // 1) get session token
  const sres = await fetch(`${base}/api/session`);
  if (!sres.ok) {
    console.error("Failed to get session token", await sres.text());
    process.exit(1);
  }
  const sjson = await sres.json();
  const token = sjson.token;

  // 2) build FormData and post
  const buf = await fs.promises.readFile(imgPath);
  const fileName = path.basename(imgPath);
  const blob = new Blob([buf], { type: "image/jpeg" });

  const fd = new FormData();
  fd.append("photo", blob, fileName);
  fd.append("intention", "moving");
  fd.append("feeling", "overwhelmed");
  fd.append("chat_history", JSON.stringify([]));

  const resp = await fetch(`${base}/api/analyze`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const out = await resp.json().catch(() => null);
  console.log("Status:", resp.status);
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
