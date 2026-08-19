// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAXgGNk2vCMkSFi7Ub6WSp7gBvJT7Mbi1Q",
  authDomain: "studio-82288772-a99ab.firebaseapp.com",
  projectId: "studio-82288772-a99ab",
  storageBucket: "studio-82288772-a99ab.firebasestorage.app",
  messagingSenderId: "48796554059",
  appId: "1:48796554059:web:7cf1c63eadcba83af60ece"
};

const genreColors = {
  "Arabian / Belly Dance": "#f59e0b",
  "Blues": "#3b82f6",
  "Classical Crossover": "#a855f7",
  "Colonne Sonore": "#eab308",
  "Country / Folk": "#10b981",
  "Dance / Disco / Electronic": "#ec4899",
  "DJ / MegaMix": "#06b6d4",
  "Gregoriana": "#d97706",
  "Hindi / Hindi Film Music": "#f97316",
  "House": "#6366f1",
  "Jazz": "#eab308",
  "K-pop": "#f472b6",
  "Latino": "#ef4444",
  "Metal / Punk": "#dc2626",
  "Musica Classica": "#14b8a6",
  "Pop": "#ff6b81",
  "Rap / Hip Hop": "#f97316",
  "Reggae": "#84cc16",
  "Rock": "#8b5cf6",
  "Soul / Funk": "#c084fc",
  "all": "#ec4899"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let songsList = [];
let currentSelectedGenre = "all";
let queueList = [];
let currentQueueIndex = 0;

const urlParams = new URLSearchParams(window.location.search);
const isReadOnly = urlParams.get('mode') === 'read';

// Mappatura compatibilità vecchi nomi generi
function normalizeGenre(genre) {
  if (genre === "Dance / Disco" || genre === "Musica Elettronica") return "Dance / Disco / Electronic";
  if (genre === "Hindi Film Music") return "Hindi / Hindi Film Music";
  if (genre === "Reagge") return "Reggae";
  return genre;
}

// Calcolo automatico della decade dall'anno
function calculateDecade(year) {
  const y = parseInt(year, 10);
  if (isNaN(y)) return "";
  if (y >= 1960 && y <= 1969) return "1960 - 1969";
  if (y >= 1970 && y <= 1979) return "1970 - 1979";
  if (y >= 1980 && y <= 1989) return "1980 - 1989";
  if (y >= 1990 && y <= 1999) return "1990 - 1999";
  if (y >= 2000 && y <= 2009) return "2000 - 2009";
  if (y >= 2010 && y <= 2019) return "2010 - 2019";
  if (y >= 2020 && y <= 2029) return "2020 - 2029";
  if (y >= 2030 && y <= 2039) return "2030 - 2039";
  return "";
}

// Conversione specifica e pulita per le IMMAGINI da Drive e Dropbox
function fixDriveImageUrl(url) {
  if (!url) return "";
  let cleanUrl = url.trim();

  if (cleanUrl.includes("dropbox.com")) {
    return cleanUrl.replace("dl=0", "raw=1").replace("dl=1", "raw=1");
  }

  if (cleanUrl.includes("drive.google.com")) {
    let fileId = "";
    const match = cleanUrl.match(/\/d\/([^\/\?]+)/) || cleanUrl.match(/id=([^&]+)/);
    if (match && match[1]) {
      fileId = match[1];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }
  return cleanUrl;
}

document.addEventListener("DOMContentLoaded", () => {
  if (isReadOnly) {
    const addBtn = document.getElementById("openModalBtn");
    if (addBtn) addBtn.style.display = "none";
    const dataActions = document.querySelector(".data-actions");
    if (dataActions) dataActions.style.display = "none";
  }

  db.collection("songs").onSnapshot((snapshot) => {
    songsList = [];
    snapshot.forEach((doc) => {
      songsList.push({ id: doc.id, ...doc.data() });
    });
    updateGenreCounts();
    renderSongs();
  }, (error) => {
    console.error("Errore Firebase:", error);
  });

  const openBtn = document.getElementById("openModalBtn");
  if(openBtn) openBtn.onclick = () => openModal();

  const closeBtn = document.getElementById("closeModalBtn");
  if(closeBtn) closeBtn.onclick = () => closeModal();

  const openPlaylistBtn = document.getElementById("openPlaylistModalBtn");
  if(openPlaylistBtn) openPlaylistBtn.onclick = () => openPlaylistModal();

  const closePlaylistBtn = document.getElementById("closePlaylistModalBtn");
  if(closePlaylistBtn) closePlaylistBtn.onclick = () => closePlaylistModal();
  
  window.onclick = (e) => { 
    if (e.target === document.getElementById("songModal")) closeModal(); 
    if (e.target === document.getElementById("playlistModal")) closePlaylistModal(); 
  };

  const genreSelect = document.getElementById("genre");
  if (genreSelect) {
    genreSelect.onchange = () => toggleMovieTitleField(genreSelect.value);
  }

  // Calcolo automatico decade quando l'utente scrive l'anno
  const yearInput = document.getElementById("year");
  if (yearInput) {
    yearInput.oninput = () => {
      const decadeSelect = document.getElementById("decade");
      if (decadeSelect) {
        const calculated = calculateDecade(yearInput.value);
        if (calculated) decadeSelect.value = calculated;
      }
    };
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.oninput = () => renderSongs();

  const playlistSearchInput = document.getElementById("playlistSearchInput");
  if (playlistSearchInput) playlistSearchInput.oninput = () => renderPlaylistTable();

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      currentSelectedGenre = btn.getAttribute("data-genre");
      
      const genreTitleEl = document.getElementById("currentGenreTitle");
      if (genreTitleEl) {
        genreTitleEl.innerText = currentSelectedGenre === "all" ? "Tutti i Generi" : currentSelectedGenre;
        const color = genreColors[currentSelectedGenre] || "#ec4899";
        genreTitleEl.style.setProperty('--active-section-color', color);
      }
      
      renderSongs();
    };
  });

  const form = document.getElementById("addSongForm");
  if(form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (isReadOnly) return;

      const id = document.getElementById("songId").value;
      const artist = document.getElementById("artist").value.trim();
      const photoUrl = document.getElementById("artistPhotoUrl").value.trim();
      const title = document.getElementById("title").value.trim();
      const year = document.getElementById("year").value.trim();
      const decade = document.getElementById("decade") ? document.getElementById("decade").value : "";
      const genre = document.getElementById("genre").value;
      const youtubeUrl = document.getElementById("youtubeUrl").value.trim();
      const movieTitle = (genre === "Colonne Sonore" || genre === "Hindi / Hindi Film Music") 
        ? document.getElementById("movieTitle").value.trim() 
        : "";

      try {
        const songData = { artist, photoUrl, title, year, decade, genre, youtubeUrl, movieTitle };

        if (id) {
          await db.collection("songs").doc(id).update(songData);
        } else {
          await db.collection("songs").add(songData);
        }
        closeModal();
      } catch (err) {
        alert("Errore durante l'operazione: " + err.message);
      }
    };
  }

  const selectAll = document.getElementById("selectAllCheckbox");
  if (selectAll) {
    selectAll.onchange = (e) => {
      document.querySelectorAll(".playlist-checkbox").forEach(cb => cb.checked = e.target.checked);
    };
  }

  const clearBtn = document.getElementById("clearSelectionBtn");
  if (clearBtn) {
    clearBtn.onclick = () => {
      document.querySelectorAll(".playlist-checkbox").forEach(cb => cb.checked = false);
      if (selectAll) selectAll.checked = false;
    };
  }

  const startQueueBtn = document.getElementById("startQueueBtn");
  if (startQueueBtn) {
    startQueueBtn.onclick = startContinuousQueue;
  }

  const audioPlayer = document.getElementById("continuousAudioPlayer");
  if (audioPlayer) {
    audioPlayer.onended = playNextInQueue;
  }

  const exportBtn = document.getElementById("exportJsonBtn");
  if(exportBtn) exportBtn.onclick = exportJSON;

  const importInput = document.getElementById("importJsonInput");
  if(importInput) importInput.onchange = importJSON;

  const excelBtn = document.getElementById("exportExcelBtn");
  if(excelBtn) excelBtn.onclick = exportExcel;
});

function updateGenreCounts() {
  const buttons = document.querySelectorAll(".nav-btn");
  const counts = {};
  songsList.forEach(song => {
    const normGenre = normalizeGenre(song.genre);
    if (normGenre) {
      counts[normGenre] = (counts[normGenre] || 0) + 1;
    }
  });

  buttons.forEach(btn => {
    const genre = btn.getAttribute("data-genre");
    if (genre === "all") {
      btn.textContent = `Tutti i Generi (${songsList.length})`;
    } else {
      const count = counts[genre] || 0;
      btn.textContent = `${genre} (${count})`;
    }
  });
}

function toggleMovieTitleField(selectedGenre) {
  const movieGroup = document.getElementById("movieTitleGroup");
  if (!movieGroup) return;

  if (selectedGenre === "Colonne Sonore" || selectedGenre === "Hindi / Hindi Film Music") {
    movieGroup.style.display = "block";
  } else {
    movieGroup.style.display = "none";
    document.getElementById("movieTitle").value = "";
  }
}

function openModal(songToEdit = null) {
  if (isReadOnly) return;
  const form = document.getElementById("addSongForm");
  form.reset();

  if (songToEdit) {
    document.getElementById("modalTitle").innerText = "Modifica Brano";
    document.getElementById("songId").value = songToEdit.id;
    document.getElementById("artist").value = songToEdit.artist || "";
    document.getElementById("artistPhotoUrl").value = songToEdit.photoUrl || "";
    document.getElementById("title").value = songToEdit.title || "";
    document.getElementById("year").value = songToEdit.year || "";
    
    if (document.getElementById("decade")) {
      document.getElementById("decade").value = songToEdit.decade || calculateDecade(songToEdit.year) || "";
    }

    document.getElementById("genre").value = normalizeGenre(songToEdit.genre || "Pop");
    document.getElementById("movieTitle").value = songToEdit.movieTitle || "";
    document.getElementById("youtubeUrl").value = songToEdit.youtubeUrl || "";
    
    toggleMovieTitleField(document.getElementById("genre").value);
  } else {
    document.getElementById("modalTitle").innerText = "Aggiungi Nuovo Brano";
    document.getElementById("songId").value = "";
    toggleMovieTitleField(document.getElementById("genre").value);
  }

  document.getElementById("songModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("songModal").style.display = "none";
}

function openPlaylistModal() {
  renderPlaylistTable();
  document.getElementById("playlistModal").style.display = "flex";
}

function closePlaylistModal() {
  document.getElementById("playlistModal").style.display = "none";
}

function renderPlaylistTable() {
  const tbody = document.getElementById("playlistTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const filterVal = document.getElementById("playlistSearchInput") ? document.getElementById("playlistSearchInput").value.toLowerCase() : "";

  const filtered = songsList.filter(s => {
    return (s.title && s.title.toLowerCase().includes(filterVal)) ||
           (s.artist && s.artist.toLowerCase().includes(filterVal)) ||
           (s.genre && s.genre.toLowerCase().includes(filterVal)) ||
           (s.movieTitle && s.movieTitle.toLowerCase().includes(filterVal));
  });

  filtered.sort((a, b) => (a.artist || "").localeCompare(b.artist || ""));

  filtered.forEach(song => {
    const tr = document.createElement("tr");
    const displayTitle = song.movieTitle ? `🎬 ${song.movieTitle} - ${song.title}` : song.title;
    const normG = normalizeGenre(song.genre);

    tr.innerHTML = `
      <td><input type="checkbox" class="playlist-checkbox" data-id="${song.id}"></td>
      <td style="font-weight: 600; color: #fff;">${displayTitle}</td>
      <td style="color: #cbd5e1;">${song.artist || '-'}</td>
      <td><span style="color:${genreColors[normG] || '#f472b6'}; font-weight:700; font-size:0.8rem;">${normG}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function startContinuousQueue() {
  const checkboxes = document.querySelectorAll(".playlist-checkbox:checked");
  if (checkboxes.length === 0) {
    alert("Seleziona almeno un brano dall'elenco per avviare la riproduzione!");
    return;
  }

  queueList = [];
  checkboxes.forEach(cb => {
    const songId = cb.getAttribute("data-id");
    const song = songsList.find(s => s.id === songId);
    if (song) queueList.push(song);
  });

  currentQueueIndex = 0;
  document.getElementById("playerBarContainer").style.display = "block";
  playSongInQueue(currentQueueIndex);
}

function playSongInQueue(index) {
  if (index >= queueList.length) {
    document.getElementById("nowPlayingText").innerText = "🎉 Sequenza completata!";
    return;
  }

  const song = queueList[index];
  const audioPlayer = document.getElementById("continuousAudioPlayer");
  const nowPlaying = document.getElementById("nowPlayingText");

  nowPlaying.innerText = `▶️ In riproduzione (${index + 1}/${queueList.length}): ${song.artist} - ${song.title}`;

  let audioUrl = song.youtubeUrl || "";
  if (audioUrl.includes("dropbox.com")) {
    audioUrl = audioUrl.replace("dl=0", "raw=1").replace("dl=1", "raw=1");
  }
  audioPlayer.src = audioUrl;
  audioPlayer.play().catch(err => {
    console.log("Errore riproduzione automatica:", err);
  });
}

function playNextInQueue() {
  currentQueueIndex++;
  playSongInQueue(currentQueueIndex);
}

function renderSongs() {
  const container = document.getElementById("songsContainer");
  if (!container) return;

  container.innerHTML = "";
  const searchVal = document.getElementById("searchInput") ? document.getElementById("searchInput").value.toLowerCase() : "";

  let filtered = songsList.filter(song => {
    const normGenre = normalizeGenre(song.genre);
    const matchGenre = currentSelectedGenre === "all" || normGenre === currentSelectedGenre;
    const matchSearch = (song.title && song.title.toLowerCase().includes(searchVal)) || 
                        (song.artist && song.artist.toLowerCase().includes(searchVal)) ||
                        (song.movieTitle && song.movieTitle.toLowerCase().includes(searchVal));
    return matchGenre && matchSearch;
  });

  filtered.sort((a, b) => {
    const isCinema = currentSelectedGenre === "Colonne Sonore" || currentSelectedGenre === "Hindi / Hindi Film Music";
    if (isCinema) {
      const movieA = (a.movieTitle || "").toLowerCase();
      const movieB = (b.movieTitle || "").toLowerCase();
      if (movieA !== movieB) return movieA.localeCompare(movieB);
      return (a.artist || "").toLowerCase().localeCompare((b.artist || "").toLowerCase());
    } else {
      const artistA = (a.artist || "").toLowerCase();
      const artistB = (b.artist || "").toLowerCase();
      if (artistA !== artistB) return artistA.localeCompare(artistB);
      return (a.title || "").toLowerCase().localeCompare((b.title || "").toLowerCase());
    }
  });

  if (filtered.length === 0) {
    container.innerHTML = "<p style='color:#cbd5e1;'>Nessun brano presente in questa sezione.</p>";
    return;
  }

  filtered.forEach((song) => {
    const card = document.createElement("div");
    card.className = "song-card";

    const initial = song.artist ? song.artist.charAt(0).toUpperCase() : "?";
    const rawPhoto = song.photoUrl || "";
    const processedPhotoUrl = fixDriveImageUrl(rawPhoto);
    const displayGenre = normalizeGenre(song.genre);
    const badgeColor = genreColors[displayGenre] || "#f472b6";

    const imageHtml = processedPhotoUrl 
      ? `<img src="${processedPhotoUrl}" alt="${song.artist}" class="artist-img" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="artist-img" style="display:none; align-items:center; justify-content:center; color:#ffffff; font-weight:900; font-size: 2.5rem; background: linear-gradient(135deg, #334155, #0f172a);">${initial}</div>`
      : `<div class="artist-img" style="display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:900; font-size: 2.5rem; background: linear-gradient(135deg, #334155, #0f172a);">${initial}</div>`;

    const rawAudio = song.youtubeUrl || "";
    const isDropbox = rawAudio.includes("dropbox.com");
    const isDrive = rawAudio.includes("drive.google.com");
    const isMp3 = rawAudio.toLowerCase().endsWith(".mp3") || rawAudio.toLowerCase().includes(".mp3?");

    let playerHtml = "";
    if (isDrive) {
      let fileId = "";
      const match = rawAudio.match(/\/d\/([^\/\?]+)/) || rawAudio.match(/id=([^&]+)/);
      if (match && match[1]) fileId = match[1];

      playerHtml = `
        <div style="margin-top:0.6rem;">
          <a href="https://drive.google.com/file/d/${fileId}/preview" target="_blank" 
             style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 10px; background: rgba(255, 255, 255, 0.07); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 30px; color: #ffffff; font-weight: 600; font-size: 0.85rem; text-decoration: none; transition: all 0.2s ease;"
             onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'" 
             onmouseout="this.style.background='rgba(255, 255, 255, 0.07)'">
            <span style="color:${badgeColor}; font-size:1.1rem;">▶</span> Ascolta su Drive
          </a>
        </div>`;
    } else if (isDropbox || isMp3) {
      let audioSrc = rawAudio.replace("dl=0", "raw=1").replace("dl=1", "raw=1");
      playerHtml = `<div class="audio-player-wrapper"><audio controls preload="metadata"><source src="${audioSrc}" type="audio/mpeg">Audio non supportato.</audio></div>`;
    } else if (rawAudio) {
      playerHtml = `<a href="${rawAudio}" target="_blank" style="color:${badgeColor}; font-weight:bold; font-size:0.85rem; text-decoration:none; display:inline-block; margin-top:0.5rem;">▶ Ascolta su YouTube</a>`;
    } else {
      playerHtml = `<p style="font-size:0.8rem; color:#94a3b8; margin-top:0.5rem;">Nessun link audio inserito</p>`;
    }

    const movieHtml = song.movieTitle 
      ? `<p class="card-info" style="color:#eab308; font-weight:600;">🎬 <strong>Film:</strong> ${song.movieTitle}</p>` 
      : "";

    const calculatedDecade = song.decade || calculateDecade(song.year);
    const decadeDisplay = calculatedDecade ? `<p class="card-info"><strong>Decade:</strong> ${calculatedDecade}</p>` : "";

    const actionsHtml = isReadOnly ? "" : `
      <div class="card-actions">
        <button class="icon-btn" onclick='editSong("${song.id}")'>✏️ Modifica</button>
        <button class="icon-btn" onclick='deleteSong("${song.id}")'>🗑️ Elimina</button>
      </div>
    `;

    card.innerHTML = `
      <div>
        <div class="artist-img-container">
          ${imageHtml}
          <span class="genre-badge" style="--badge-color: ${badgeColor};">${displayGenre || 'Altro'}</span>
        </div>
        <h3 class="card-title">${song.title || 'Senza Titolo'}</h3>
        <p class="card-info"><strong>Artista:</strong> ${song.artist || 'Sconosciuto'}</p>
        ${movieHtml}
        <p class="card-info"><strong>Anno:</strong> ${song.year || '-'}</p>
        ${decadeDisplay}
      </div>
      <div>
        ${playerHtml}
      </div>
      ${actionsHtml}
    `;

    container.appendChild(card);
  });
}

window.editSong = function(id) {
  if (isReadOnly) return;
  const song = songsList.find(s => s.id === id);
  if (song) openModal(song);
};

window.deleteSong = async function(id) {
  if (isReadOnly) return;
  if (confirm("Vuoi davvero eliminare questo brano?")) {
    try {
      await db.collection("songs").doc(id).delete();
    } catch (err) {
      alert("Errore eliminazione: " + err.message);
    }
  }
};

function exportJSON() {
  if (isReadOnly) return;
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(songsList, null, 2));
  const a = document.createElement('a');
  a.setAttribute("href", dataStr);
  a.setAttribute("download", "MyMusic_Backup.json");
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function importJSON(event) {
  if (isReadOnly) return;
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data)) {
        for (const song of data) {
          delete song.id;
          await db.collection("songs").add(song);
        }
        alert("Importazione su Cloud completata!");
      } else {
        alert("File non valido.");
      }
    } catch (err) {
      alert("Errore nell'importazione file.");
    }
  };
  reader.readAsText(file);
}

function exportExcel() {
  if (isReadOnly) return;
  if (songsList.length === 0) {
    alert("Nessun brano da esportare.");
    return;
  }

  let csv = "data:text/csv;charset=utf-8,\uFEFF";
  csv += "Artista;Titolo;Anno;Decade;Genere;Film;Link Audio/YouTube;Link Foto\n";

  songsList.forEach(s => {
    const dec = s.decade || calculateDecade(s.year);
    csv += `"${s.artist || ''}";"${s.title || ''}";"${s.year || ''}";"${dec || ''}";"${s.genre || ''}";"${s.movieTitle || ''}";"${s.youtubeUrl || ''}";"${s.photoUrl || ''}"\n`;
  });

  const a = document.createElement("a");
  a.setAttribute("href", encodeURI(csv));
  a.setAttribute("download", "MyMusic_Canzoni.csv");
  document.body.appendChild(a);
  a.click();
  a.remove();
}
