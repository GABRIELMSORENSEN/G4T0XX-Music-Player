import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.get("/api/ytdlp/audio/:id", (req, res) => {
    const id = String(req.params.id || "");
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
      res.status(400).json({ error: "invalid_video_id" });
      return;
    }

    const ytUrl = `https://www.youtube.com/watch?v=${id}`;
    const child = spawn("yt-dlp", ["-f", "ba", "-g", ytUrl], { windowsHide: true });
    const timer = setTimeout(() => child.kill(), 25_000);
    let out = "";
    let err = "";

    child.stdout.on("data", chunk => { out += chunk.toString(); });
    child.stderr.on("data", chunk => { err += chunk.toString(); });
    child.on("close", code => {
      clearTimeout(timer);
      const url = out.split(/\r?\n/).find(line => /^https?:\/\//.test(line.trim()))?.trim();
      if (code === 0 && url) res.json({ audioUrl: url, provider: "yt-dlp" });
      else res.status(502).json({ error: "yt_dlp_failed", details: err.slice(-400) });
    });
    child.on("error", error => {
      clearTimeout(timer);
      res.status(502).json({ error: "yt_dlp_unavailable", details: error.message });
    });
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
