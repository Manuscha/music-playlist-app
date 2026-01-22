<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <div class="logo"></div>
        <div>
          <div class="title">Music Playlist</div>
          <div class="subtitle">Search • Create playlists • Add songs</div>
        </div>
      </div>

      <div class="search">
        <input
          v-model="query"
          placeholder="Search by title, artist, album..."
          @keydown.enter="loadSongs"
        />
        <button @click="loadSongs" :disabled="loadingSongs">
          {{ loadingSongs ? "Searching..." : "Search" }}
        </button>
        <button class="ghost" @click="resetSearch">Reset</button>
      </div>
    </header>

    <div class="layout">
      <!-- Sidebar playlists -->
      <aside class="sidebar">
        <div class="sidebarHeader">
          <div class="sidebarTitle">Your Playlists</div>
          <div class="sidebarMeta">
            {{ loadingPlaylists ? "Loading..." : `${playlists.length} total` }}
          </div>
        </div>

        <div class="newPlaylist">
          <input
            v-model="newPlaylistName"
            placeholder="New playlist name..."
            @keydown.enter="createPlaylist"
          />
          <button @click="createPlaylist">Create</button>
        </div>

        <div class="playlistList">
          <div
            v-for="p in playlists"
            :key="p.id"
            class="playlistItem"
            :class="{ active: p.id === selectedPlaylistId }"
            @click="selectedPlaylistId = p.id"
          >
            <div class="playlistName">{{ p.name }}</div>
            <div class="playlistCount">{{ p.songIds.length }} songs</div>

            <button class="trash" title="Delete playlist" @click.stop="deletePlaylist(p.id)">
              ✕
            </button>
          </div>

          <div v-if="!playlists.length && !loadingPlaylists" class="emptyHint">
            Create your first playlist above ⬆
          </div>
        </div>
      </aside>

      <!-- Main songs -->
      <main class="main">
        <div class="panelHeader">
          <div class="panelTitle">Songs</div>
          <div class="panelMeta">{{ songs.length }} results</div>
        </div>

        <div class="table">
          <div class="row head">
            <div>#</div>
            <div>Title</div>
            <div>Artist</div>
            <div class="hideSm">Album</div>
            <div class="right">Time</div>
            <div class="right">Action</div>
          </div>

          <div v-for="(s, idx) in songs" :key="s.id" class="row">
            <div class="muted">{{ idx + 1 }}</div>
            <div class="songTitle">{{ s.title }}</div>
            <div class="muted">{{ s.artist }}</div>
            <div class="muted hideSm">{{ s.album }}</div>
            <div class="right muted">{{ formatDuration(s.durationSec) }}</div>

            <div class="right">
              <button
                v-if="selectedPlaylistId"
                :class="isInSelectedPlaylist(s.id) ? 'danger' : 'primary'"
                @click="toggleSong(s.id)"
              >
                {{ isInSelectedPlaylist(s.id) ? "Remove" : "Add" }}
              </button>

              <button v-else class="ghost" disabled title="Create/select a playlist first">
                Select playlist
              </button>
            </div>
          </div>

          <div v-if="!songs.length && !loadingSongs" class="emptyHint">
            No songs found
          </div>
        </div>
      </main>

      <!-- Right panel (selected playlist songs) -->
      <section class="rightPanel">
        <div class="panelHeader">
          <div class="panelTitle">Playlist</div>
          <div class="panelMeta">
            {{ selectedPlaylist ? selectedPlaylist.name : "None selected" }}
          </div>
        </div>

        <div v-if="!selectedPlaylist" class="emptyHint">
          Select a playlist from the left.
        </div>

        <div v-else>
          <div class="bigCard">
            <div class="bigTitle">{{ selectedPlaylist.name }}</div>
            <div class="bigMeta">{{ selectedPlaylist.songIds.length }} songs</div>
          </div>

          <div class="miniList">
            <div
              v-for="sid in selectedPlaylist.songIds"
              :key="sid"
              class="miniItem"
            >
              <div class="miniText">
                <div class="miniTitle">{{ songTitleById(sid) }}</div>
                <div class="miniMeta">{{ songArtistById(sid) }}</div>
              </div>
              <button class="ghost" @click="removeSong(sid)">Remove</button>
            </div>

            <div v-if="!selectedPlaylist.songIds.length" class="emptyHint">
              Add songs from the middle panel ➜
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="error" class="toast">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";

const API = import.meta.env.VITE_API_URL;

// songs
const query = ref("");
const songs = ref([]);
const loadingSongs = ref(false);

// playlists
const playlists = ref([]);
const loadingPlaylists = ref(false);
const selectedPlaylistId = ref(null);
const newPlaylistName = ref("");

// shared
const error = ref("");

const selectedPlaylist = computed(() => {
  watch([playlists, selectedPlaylistId], () => {
  if (!playlists.value.length) {
    selectedPlaylistId.value = null;
    return;
  }
  const exists = playlists.value.some((p) => p.id === selectedPlaylistId.value);
    if (!exists) selectedPlaylistId.value = playlists.value[0].id;
  });

  return playlists.value.find((p) => p.id === selectedPlaylistId.value) || null;
});

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function isInSelectedPlaylist(songId) {
  return !!selectedPlaylist.value?.songIds?.includes(songId);
}

function songById(songId) {
  return songs.value.find((s) => s.id === songId) || null;
}

// ถ้าเพลงไม่อยู่ใน results ตอนนี้ (เพราะค้นหาอยู่) ให้โชว์เป็น fallback
function songTitleById(songId) {
  return songById(songId)?.title || `Song (${songId})`;
}
function songArtistById(songId) {
  return songById(songId)?.artist || "";
}

// ---- API calls ----
async function loadSongs() {
  loadingSongs.value = true;
  error.value = "";
  try {
    const url = new URL(`${API}/songs`);
    if (query.value.trim()) url.searchParams.set("query", query.value.trim());
    const res = await fetch(url);
    const data = await res.json();
    songs.value = data.songs || [];
  } catch (e) {
    error.value = "Failed to load songs (is backend running?)";
  } finally {
    loadingSongs.value = false;
  }
}

function resetSearch() {
  query.value = "";
  loadSongs();
}

async function loadPlaylists() {
  loadingPlaylists.value = true;
  error.value = "";
  try {
    const res = await fetch(`${API}/playlists`);
    const data = await res.json();
    playlists.value = data.playlists || [];

    if (playlists.value.length) {
      const exists = playlists.value.some((p) => p.id === selectedPlaylistId.value);
      if (!exists) selectedPlaylistId.value = playlists.value[0].id;
    } else {
      selectedPlaylistId.value = null;
    }
  } catch (e) {
    error.value = "Failed to load playlists (is backend running?)";
  } finally {
    loadingPlaylists.value = false;
  }
}

async function createPlaylist() {
  const name = newPlaylistName.value.trim();
  if (!name) return;

  error.value = "";
  try {
    const res = await fetch(`${API}/playlists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Create failed");

    newPlaylistName.value = "";
    await loadPlaylists();
    selectedPlaylistId.value = data.playlist.id;
  } catch (e) {
    error.value = e.message || "Failed to create playlist";
  }
}

async function deletePlaylist(id) {
  error.value = "";
  try {
    const res = await fetch(`${API}/playlists/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Delete failed");

    playlists.value = playlists.value.filter((p) => p.id !== id);
    if (selectedPlaylistId.value === id) {
      selectedPlaylistId.value = playlists.value[0]?.id ?? null;
    }
  } catch (e) {
    error.value = e.message || "Failed to delete playlist";
  }
}

// ---- Step 3 add/remove ----
async function addSong(songId) {
  if (!selectedPlaylistId.value) {
    error.value = "Please select a playlist first";
    return;
  }

  error.value = "";
  try {
    const res = await fetch(`${API}/playlists/${selectedPlaylistId.value}/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Add failed");

    // update playlist in memory
    playlists.value = playlists.value.map((p) => (p.id === data.playlist.id ? data.playlist : p));
  } catch (e) {
    error.value = e.message || "Failed to add song";
  }
}

async function removeSong(songId) {
  if (!selectedPlaylistId.value) {
    error.value = "Please select a playlist first";
    return;
  }


  error.value = "";
  try {
    const res = await fetch(`${API}/playlists/${selectedPlaylistId.value}/songs/${songId}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Remove failed");

    playlists.value = playlists.value.map((p) => (p.id === data.playlist.id ? data.playlist : p));
  } catch (e) {
    error.value = e.message || "Failed to remove song";
  }
}

async function toggleSong(songId) {
  if (isInSelectedPlaylist(songId)) await removeSong(songId);
  else await addSong(songId);
}

onMounted(async () => {
  await loadSongs();
  await loadPlaylists();
});
</script>

<style>
:root{
  --bg:#0b0f14;
  --text:#e8eef7;
  --muted:#9fb0c2;
  --border:rgba(255,255,255,0.08);
  --green:#1db954;
  --danger:#ff4d4f;
}

*{ box-sizing:border-box; }
body{
  margin:0;
  background:
    radial-gradient(1000px 400px at 30% 0%, rgba(29,185,84,0.08), transparent 60%),
    radial-gradient(900px 400px at 90% 0%, rgba(0,153,255,0.08), transparent 55%),
    var(--bg);
  color:var(--text);
  font-family:system-ui;
}

.app{ min-height:100vh; display:flex; flex-direction:column; }

.topbar{
  display:flex; gap:14px; align-items:center;
  padding:14px 16px;
  border-bottom:1px solid var(--border);
  background:rgba(10,14,20,0.7);
  backdrop-filter: blur(10px);
}

.brand{ display:flex; gap:10px; align-items:center; min-width:220px; }
.logo{ width:38px; height:38px; border-radius:12px; background:linear-gradient(135deg,var(--green),#1aa1ff); }
.title{ font-weight:800; }
.subtitle{ color:var(--muted); font-size:12px; margin-top:2px; }

.search{ display:flex; gap:10px; flex:1; align-items:center; }
.search input{
  flex:1; min-width:220px;
  padding:10px 12px; border-radius:12px;
  border:1px solid var(--border);
  background:rgba(16,23,34,0.9);
  color:var(--text); outline:none;
}
button{
  border:1px solid var(--border);
  background:rgba(16,23,34,0.9);
  color:var(--text);
  padding:10px 12px;
  border-radius:12px;
  cursor:pointer;
}
button:disabled{ opacity:.6; cursor:not-allowed; }
button.ghost{ background:transparent; }

button.primary{
  background: rgba(29,185,84,0.18);
  border-color: rgba(29,185,84,0.35);
}
button.danger{
  background: rgba(255,77,79,0.14);
  border-color: rgba(255,77,79,0.35);
}

.layout{
  display:grid;
  grid-template-columns: 280px 1fr 320px;
  gap: 12px;
  padding: 12px;
  flex: 1;
}

.sidebar, .main, .rightPanel{
  background: rgba(16,23,34,0.7);
  border: 1px solid var(--border);
  border-radius: 18px;
  overflow: hidden;
}

.sidebar{ display:flex; flex-direction:column; }
.sidebarHeader{
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--border);
  background: rgba(16,23,34,0.9);
}
.sidebarTitle{ font-weight: 800; }
.sidebarMeta{ color: var(--muted); font-size: 12px; margin-top: 4px; }

.newPlaylist{
  display:flex;
  gap:10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}
.newPlaylist input{
  flex:1;
  padding:10px 12px;
  border-radius:12px;
  border:1px solid var(--border);
  background:rgba(15,22,32,0.9);
  color:var(--text);
  outline:none;
}

.playlistList{ padding: 10px 8px 12px; overflow:auto; }
.playlistItem{
  display:grid;
  grid-template-columns: 1fr auto;
  gap: 6px 10px;
  align-items:center;
  padding: 10px 10px;
  border-radius: 14px;
  border: 1px solid transparent;
  cursor:pointer;
}
.playlistItem:hover{
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.06);
}
.playlistItem.active{
  background: rgba(29,185,84,0.12);
  border-color: rgba(29,185,84,0.18);
}
.playlistName{ font-weight:700; }
.playlistCount{ color:var(--muted); font-size:12px; }

.trash{
  width:34px; height:34px;
  border-radius:12px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(232,238,247,0.8);
}
.trash:hover{ border-color: rgba(255,77,79,0.35); color: var(--danger); }

.main{ display:flex; flex-direction:column; }
.rightPanel{ display:flex; flex-direction:column; }

.panelHeader{
  padding:14px;
  display:flex;
  justify-content:space-between;
  align-items:baseline;
  border-bottom:1px solid var(--border);
  background:rgba(16,23,34,0.9);
}
.panelTitle{ font-weight:800; }
.panelMeta{ color:var(--muted); font-size:12px; }

.table{ padding:10px; overflow:auto; }
.row{
  display:grid;
  grid-template-columns: 40px 2fr 1.6fr 1.6fr 70px 120px;
  gap:10px;
  padding:10px;
  border-radius:14px;
  align-items:center;
}
.row.head{
  position:sticky; top:0;
  background:rgba(16,23,34,0.95);
  border:1px solid rgba(255,255,255,0.04);
  z-index:1;
  font-size:12px;
  color:rgba(159,176,194,0.9);
}
.row:not(.head):hover{ background:rgba(255,255,255,0.04); }
.songTitle{ font-weight:700; }
.muted{ color:var(--muted); }
.right{ text-align:right; }
.hideSm{ display:block; }

.bigCard{
  margin:14px;
  padding:14px;
  border-radius:18px;
  border:1px solid rgba(255,255,255,0.06);
  background:
    radial-gradient(700px 140px at 20% 0%, rgba(29,185,84,0.18), transparent 55%),
    rgba(15,22,32,0.9);
}
.bigTitle{ font-weight:900; font-size:18px; }
.bigMeta{ color:var(--muted); margin-top:6px; font-size:12px; }

.miniList{ padding: 0 14px 14px; overflow:auto; }
.miniItem{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding:10px 10px;
  border-radius:14px;
  border:1px solid transparent;
}
.miniItem:hover{
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.06);
}
.miniTitle{ font-weight:800; }
.miniMeta{ color:var(--muted); font-size:12px; margin-top:2px; }

.emptyHint{
  color: rgba(159,176,194,0.85);
  font-size: 13px;
  padding: 14px;
}

.toast{
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,77,79,0.35);
  background: rgba(255,77,79,0.12);
  color: rgba(232,238,247,0.95);
  max-width: min(720px, calc(100vw - 24px));
}

@media (max-width: 1100px){
  .layout{ grid-template-columns: 280px 1fr; }
  .rightPanel{ display:none; }
}
@media (max-width: 760px){
  .layout{ grid-template-columns: 1fr; }
  .sidebar{ display:none; }
  .row{ grid-template-columns: 40px 2fr 1.4fr 70px 120px; }
  .hideSm{ display:none; }
}
</style>
