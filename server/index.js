import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// ---- health ----
app.get("/health", (req, res) => res.json({ ok: true }));

// ---- songs catalog ----
const SONGS = [
  { id: "s1", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", durationSec: 200 },
  { id: "s2", title: "Shape of You", artist: "Ed Sheeran", album: "÷", durationSec: 233 },
  { id: "s3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", durationSec: 203 },
  { id: "s4", title: "bad guy", artist: "Billie Eilish", album: "WHEN WE ALL FALL ASLEEP", durationSec: 194 },
  { id: "s5", title: "Watermelon Sugar", artist: "Harry Styles", album: "Fine Line", durationSec: 174 },
  { id: "s6", title: "Someone You Loved", artist: "Lewis Capaldi", album: "Divinely Uninspired", durationSec: 182 },
  { id: "s7", title: "Stay", artist: "The Kid LAROI, Justin Bieber", album: "F*CK LOVE 3", durationSec: 141 },
  { id: "s8", title: "Circles", artist: "Post Malone", album: "Hollywood's Bleeding", durationSec: 215 },
  { id: "s9", title: "As It Was", artist: "Harry Styles", album: "Harry's House", durationSec: 167 },
  { id: "s10", title: "Anti-Hero", artist: "Taylor Swift", album: "Midnights", durationSec: 200 }
];

// ---- persistence (data.json) ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, "data.json");

function readData() {
  if (!fs.existsSync(DATA_PATH)) {
    const initial = { playlists: [] };
    fs.writeFileSync(DATA_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function makeId(prefix = "pl") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

// ---- songs search ----
app.get("/songs", (req, res) => {
  const q = (req.query.query || "").toString().trim().toLowerCase();
  if (!q) return res.json({ songs: SONGS });

  const filtered = SONGS.filter((s) => {
    const hay = `${s.title} ${s.artist} ${s.album}`.toLowerCase();
    return hay.includes(q);
  });

  res.json({ songs: filtered });
});

// ---- playlists CRUD (Step 2) ----

// list playlists
app.get("/playlists", (req, res) => {
  const data = readData();
  res.json({ playlists: data.playlists });
});

// create playlist
app.post("/playlists", (req, res) => {
  const name = (req.body?.name || "").toString().trim();
  if (!name) return res.status(400).json({ error: "Playlist name is required" });

  const data = readData();
  const playlist = { id: makeId("pl"), name, songIds: [] };
  data.playlists.push(playlist);
  writeData(data);

  res.status(201).json({ playlist });
});

// delete playlist
app.delete("/playlists/:id", (req, res) => {
  const { id } = req.params;

  const data = readData();
  const before = data.playlists.length;
  data.playlists = data.playlists.filter((p) => p.id !== id);

  if (data.playlists.length === before) {
    return res.status(404).json({ error: "Playlist not found" });
  }

  writeData(data);
  res.json({ ok: true });
});

// add song to playlist
app.post("/playlists/:id/songs", (req, res) => {
    const { id } = req.params;
    const songId = (req.body?.songId || "").toString().trim();
    if (!songId) return res.status(400).json({ error: "songId is required" });
  
    const songExists = SONGS.some((s) => s.id === songId);
    if (!songExists) return res.status(400).json({ error: "Song does not exist" });
  
    const data = readData();
    const playlist = data.playlists.find((p) => p.id === id);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  
    if (!playlist.songIds.includes(songId)) playlist.songIds.push(songId);
    writeData(data);
  
    res.json({ playlist });
  });
  
  // remove song from playlist
  app.delete("/playlists/:id/songs/:songId", (req, res) => {
    const { id, songId } = req.params;
  
    const data = readData();
    const playlist = data.playlists.find((p) => p.id === id);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  
    playlist.songIds = playlist.songIds.filter((sid) => sid !== songId);
    writeData(data);
  
    res.json({ playlist });
  });
  

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
