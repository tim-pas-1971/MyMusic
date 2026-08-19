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
  "Dance / Disco": "#ec4899",
  "Dance / Disco / Elettronica": "#ec4899",
  "Dance / Disco / Electronic": "#ec4899",
  "DJ / MegaMix": "#06b6d4",
  "Gregoriana": "#d97706",
  "Hindi Film Music": "#f97316",
  "Hindi / Hindi Film Music": "#f97316",
  "House": "#6366f1",
  "Jazz": "#eab308",
  "K-pop": "#f472b6",
  "Latino": "#ef4444",
  "Metal / Punk": "#dc2626",
  "Musica Classica": "#14b8a6",
  "Musica Elettronica": "#06b6d4",
  "Pop": "#ff6b81",
  "Rap / Hip Hop": "#f97316",
  "Reagge": "#84cc16",
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
let selectedPlaylistIds = [];

// Verifica se l'app è aperta in modalità Sola Lettura
const urlParams = new URLSearchParams(window.location.search);
const isReadOnly = urlParams.get('mode') === 'read';

// Normalizzazione automatica dei generi per compatibilità completa
function normalizeGenre(genre) {
  if (!genre) return "";
  
  const cleanGenre = genre.replace(/\u00a0/g, " ").trim();
  const g = cleanGenre.toLowerCase();

  if (g.includes("belly") || g.includes("arabian")) {
    return "Arabian / Belly Dance";
  }

  if ((g.includes("dance") && g.includes("disco")) || g.includes("elettronica") || g.includes("electronic")) {
    return "Dance / Disco / Elettronica";
  }

  if (g.includes("hindi")) {
    return "Hindi / Hindi Film Music";
  }

  return cleanGenre;
}

function calculateDecade(year) {
  const y = parseInt(year, 10);
  if (isNaN(y)) return "";
  if (y >= 1960 && y <= 1969) return "dal 1960 al 1969";
  if (y >= 1970 && y <= 1979) return "dal 1970 al 1979";
  if (y >= 1980 && y <= 1989) return "dal 1980 al 1989";
  if (y >= 1990 && y <= 1999) return "dal 1990 al 1999";
  if (y >= 2000 && y <= 2009) return "dal 2000 al 2009";
  if (y >= 2010 && y <= 2019) return "dal 2010 al 2019";
  if (y >= 2020 && y <= 2029) return "dal 2020 al 2029";
  if (y >= 2030 && y <= 2039) return "dal 2030 al 2039";
  return "";
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

  // Modal Brano
  const openBtn = document.getElementById("openModalBtn");
  if(openBtn) openBtn.onclick = () => openModal();

  const closeBtn = document.getElementById("closeModalBtn");
  if(closeBtn) closeBtn.onclick = () => closeModal();

  // Modal Playlist - Compatibile sia con PC che Mobile
  const openPlaylistBtn = document.getElementById("openPlaylistModalBtn");
  if (openPlaylistBtn) {
    const handlePlaylistOpen = (e) => {
      e.preventDefault();
      openPlaylistModal();
    };
    openPlaylistBtn.onclick = handlePlaylistOpen;
    openPlaylistBtn.addEventListener("touchstart", handlePlaylistOpen, { passive: false });
  }

  const closePlaylistBtn = document.getElementById("closePlaylistModalBtn");
  if(closePlaylistBtn) closePlaylistBtn.onclick = () => closePlaylistModal();
  
  window.onclick = (e) => { 
    if (e.target === document.getElementById("songModal")) closeModal(); 
    if (e.target === document.getElementById("playlistModal")) closePlaylistModal(); 
  };

  // Apertura / Chiusura del Pannello Cerca & Filtri
  const toggleSearchBtn = document.getElementById("toggleSearchBtn");
  const searchPanel = document.getElementById("searchPanel");
  if (toggleSearchBtn && searchPanel) {
    toggleSearchBtn.onclick = () => {
      searchPanel.classList.toggle("open");
    };
  }

  // Gestione Filtri Scheda Principale
  const filterGenre = document.getElementById("filterGenre");
  const filterDecade = document.getElementById("filterDecade");
  const filterArtist = document.getElementById("filterArtist");
  const resetBtn = document.getElementById("resetFiltersBtn");
  const searchInput = document.getElementById("searchInput");

  if (searchInput) searchInput.oninput = () => renderSongs();

  if (filterGenre) {
    filterGenre.onchange = () => {
      currentSelectedGenre = filterGenre.value;
      document.querySelectorAll(".nav-btn").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-genre") === currentSelectedGenre);
      });
      renderSongs();
    };
  }

  if (filterDecade) filterDecade.onchange = () => renderSongs();
  if (filterArtist) filterArtist.oninput = () => renderSongs();

  if (resetBtn) {
    resetBtn.onclick = () => {
      if (searchInput) searchInput.value = "";
      if (filterGenre) filterGenre.value = "all";
      if (filterDecade) filterDecade.value = "all";
      if (filterArtist) filterArtist.value = "";
      currentSelectedGenre = "all";

      document.querySelectorAll(".nav-btn").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-genre") === "all");
      });

      renderSongs();
    };
  }

  // Gestione Filtri Modale Sequenza Brani
  const plSearch = document.getElementById("playlistSearchInput");
  const plGenre = document.getElementById("playlistFilterGenre");
  const plDecade = document.getElementById("playlistFilterDecade");
  const plReset = document.getElementById("resetPlaylistFiltersBtn");

  if (plSearch) plSearch.oninput = () => renderPlaylistTable();
  if (plGenre) plGenre.onchange = () => renderPlaylistTable();
  if (plDecade) plDecade.onchange = () => renderPlaylistTable();

  if (plReset) {
    plReset.onclick = () => {
      if (plSearch) plSearch.value = "";
      if (plGenre) plGenre.value = "all";
      if (plDecade) plDecade.value = "all";
      renderPlaylistTable();
    };
  }

  // Campi Dinamici Modale Brano
  const genreSelect = document.getElementById("genre");
  if (genreSelect) {
    genreSelect.onchange = () => toggleMovieTitleField(genreSelect.value);
  }

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

  // Sidebar Generi
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      currentSelectedGenre = btn.getAttribute("data-genre");
      if (filterGenre) filterGenre.value = currentSelectedGenre;
      
      const genreTitleEl = document.getElementById("currentGenreTitle");
      if (genreTitleEl) {
        genreTitleEl.innerText = currentSelectedGenre === "all" ? "Tutti i Generi" : currentSelectedGenre;
        const color = genreColors[currentSelectedGenre] || genreColors[normalizeGenre(currentSelectedGenre)] || "#ec4899";
        genreTitleEl.style.setProperty('--active-section-color', color);
      }
      
      renderSongs();
    };
  });

  // Salvataggio Modulo Brano
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
      const genre = document.getElementById("genre").value;
      const youtubeUrl = document.getElementById("youtubeUrl").value.trim();
      const movieTitle = (genre.includes("Colonne") || genre.includes("Hindi")) 
        ? document.getElementById("movieTitle").value.trim() 
        : "";
      const decade = document.getElementById("decade") ? document.getElementById("decade").value : "";

      try {
        const snapshot = await db.collection("songs").get();
        let isDuplicate = false;

        snapshot.forEach((doc) => {
          if (id && doc.id === id) return;
          const data = doc.data();
          if (
            data.artist && data.artist.trim().toLowerCase() === artist.toLowerCase() &&
            data.title && data.title.trim().toLowerCase() === title.toLowerCase()
          ) {
            isDuplicate = true;
          }
        });

        if (isDuplicate) {
          const confirmSave = confirm(
            `⚠️ ATTENZIONE: Il brano "${title}" di "${artist}" è già presente nella libreria!\n\nVuoi salvarlo ugualmente?`
          );
          if (!confirmSave) return;
        }

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

  // Controlli Tabella Playlist
  const selectAll = document.getElementById("selectAllCheckbox");
  if (selectAll) {
    selectAll.onchange = (e) => {
      const isChecked = e.target.checked;
      document.querySelectorAll(".playlist-checkbox").forEach(cb => {
        cb.checked = isChecked;
        const id = cb.getAttribute("data-id");
        if (isChecked) {
          if (!selectedPlaylistIds.includes(id)) selectedPlaylistIds.push(id);
        } else {
          selectedPlaylistIds = selectedPlaylistIds.filter(x => x !== id);
        }
      });
      if (window.updatePlaylistCount) window.updatePlaylistCount();
    };
  }

  const clearBtn = document.getElementById("clearSelectionBtn");
  if (clearBtn) {
    clearBtn.onclick = () => {
      document.querySelectorAll(".playlist-checkbox").forEach(cb => cb.checked = false);
      if (selectAll) selectAll.checked = false;
      selectedPlaylistIds = [];

      const playerBar = document.getElementById("playerBarContainer");
      const audioPlayer = document.getElementById("continuousAudioPlayer");
      if (playerBar) playerBar.style.display = "none";
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.src = "";
      }

      if (window.updatePlaylistCount) window.updatePlaylistCount();
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

// Funzione globale per aggiornare il contatore nel tasto Playlist
window.updatePlaylistCount = function() {
  const btn = document.getElementById("openPlaylistModalBtn");
  if (btn) {
    btn.innerText = `📋 Playlist (${selectedPlaylistIds.length})`;
  }
};

function updateGenreCounts() {
  const buttons = document.querySelectorAll(".nav-btn");
  const counts = {};

  songsList.forEach(song => {
    const normSongGenre = normalizeGenre(song.genre);
    if (normSongGenre) {
      counts[normSongGenre] = (counts[normSongGenre] || 0) + 1;
    }
  });

  buttons.forEach(btn => {
    const genreAttr = btn.getAttribute("data-genre");
    if (genreAttr === "all") {
      btn.textContent = `Tutti i Generi (${songsList.length})`;
    } else {
      const normButtonGenre = normalizeGenre(genreAttr);
      const count = counts[normButtonGenre] || counts[genreAttr] || 0;
      btn.textContent = `${genreAttr} (${count})`;
    }
  });
}

function toggleMovieTitleField(selectedGenre) {
  const movieGroup = document.getElementById("movieTitleGroup");
  const decadeGroup = document.getElementById("decadeGroup");
  const normG = normalizeGenre(selectedGenre);

  const isCinema = normG.includes("Colonne") || normG.includes("Hindi");

  if (movieGroup) {
    movieGroup.style.display = isCinema ? "block" : "none";
    if (!isCinema) document.getElementById("movieTitle").value = "";
  }

  if (decadeGroup) {
    decadeGroup.style.display = isCinema ? "none" : "block";
    if (isCinema && document.getElementById("decade")) document.getElementById("decade").value = "";
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
    document.getElementById("genre").value = songToEdit.genre || "Pop";
    document.getElementById("movieTitle").value = songToEdit.movieTitle || "";
    document.getElementById("youtubeUrl").value = songToEdit.youtubeUrl || "";
    
    if (document.getElementById("decade")) {
      document.getElementById("decade").value = songToEdit.decade || calculateDecade(songToEdit.year) || "";
    }
    
    toggleMovieTitleField(songToEdit.genre);
  } else {
    document.getElementById("modalTitle").innerText = "Aggiungi Nuovo Brano";
    document.getElementById("songId").value = "";
    
    if (document.getElementById("decade")) {
      document.getElementById("decade").value = "";
    }
    
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

function fixDropboxUrl(url) {
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
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  return cleanUrl;
}

function renderPlaylistTable() {
  const tbody = document.getElementById("playlistTableBody");
  if (!tbody) return;

  const searchVal = document.getElementById("playlistSearchInput") ? document.getElementById("playlistSearchInput").value.toLowerCase() : "";
  const selectedGenre = document.getElementById("playlistFilterGenre") ? document.getElementById("playlistFilterGenre").value : "all";
  const selectedDecade = document.getElementById("playlistFilterDecade") ? document.getElementById("playlistFilterDecade").value : "all";

  const filtered = songsList.filter(song => {
    const normSongGenre = normalizeGenre(song.genre);
    const normSelectedGenre = normalizeGenre(selectedGenre);
    const matchGenre = selectedGenre === "all" || normSongGenre === normSelectedGenre || song.genre === selectedGenre;

    const songDecade = song.decade || calculateDecade(song.year);
    const matchDecade = selectedDecade === "all" || songDecade === selectedDecade;

    const matchSearch = (song.title && song.title.toLowerCase().includes(searchVal)) ||
                        (song.artist && song.artist.toLowerCase().includes(searchVal)) ||
                        (song.movieTitle && song.movieTitle.toLowerCase().includes(searchVal));

    return matchGenre && matchDecade && matchSearch;
  });

  tbody.innerHTML = "";

  filtered.forEach(song => {
    const isChecked = selectedPlaylistIds.includes(song.id) ? "checked" : "";
    const tr = document.createElement("tr");

    const displayTitle = song.movieTitle ? `${song.title} 🎬 (${song.movieTitle})` : song.title;

    tr.innerHTML = `
      <td><input type="checkbox" class="playlist-checkbox" data-id="${song.id}" ${isChecked}></td>
      <td><strong>${displayTitle}</strong></td>
      <td>${song.artist || '-'}</td>
      <td><span style="font-size:0.8rem; padding:2px 6px; background:#1e293b; border-radius:4px; color:#f97316;">${song.genre}</span></td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll(".playlist-checkbox").forEach(chk => {
    chk.onchange = (e) => {
      const id = e.target.getAttribute("data-id");
      if (e.target.checked) {
        if (!selectedPlaylistIds.includes(id)) selectedPlaylistIds.push(id);
      } else {
        selectedPlaylistIds = selectedPlaylistIds.filter(x => x !== id);
      }
      if (window.updatePlaylistCount) window.updatePlaylistCount();
    };
  });
}

function startContinuousQueue() {
  if (selectedPlaylistIds.length === 0) {
    alert("Seleziona almeno un brano dall'elenco per avviare la riproduzione!");
    return;
  }

  queueList = [];
  selectedPlaylistIds.forEach(songId => {
    const song = songsList.find(s => s.id === songId);
    if (song) queueList.push(song);
  });

  if (queueList.length === 0) {
    alert("Nessun brano valido trovato per la riproduzione.");
    return;
  }

  currentQueueIndex = 0;
  const playerBar = document.getElementById("playerBarContainer");
  if (playerBar) playerBar.style.display = "block";
  
  playSongInQueue(currentQueueIndex);
}

function playSongInQueue(index) {
  if (index >= queueList.length) {
    const nowPlaying = document.getElementById("nowPlayingText");
    if (nowPlaying) nowPlaying.innerText = "🎉 Sequenza completata!";
    return;
  }

  const song = queueList[index];
  const audioPlayer = document.getElementById("continuousAudioPlayer");
  const nowPlaying = document.getElementById("nowPlayingText");

  if (nowPlaying) {
    nowPlaying.innerText = `▶️ In riproduzione (${index + 1}/${queueList.length}): ${song.artist} - ${song.title}`;
  }

  if (audioPlayer) {
    const rawUrl = song.youtubeUrl || "";
    const audioUrl = fixDropboxUrl(rawUrl);

    audioPlayer.src = audioUrl;
    audioPlayer.load();
    audioPlayer.play().catch(err => {
      console.log("Riproduzione automatica bloccata o errore media:", err);
    });
  }
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
  const selectedDecade = document.getElementById("filterDecade") ? document.getElementById("filterDecade").value : "all";
  const artistFilterVal = document.getElementById("filterArtist") ? document.getElementById("filterArtist").value.toLowerCase() : "";

  let filtered = songsList.filter(song => {
    const normSongGenre = normalizeGenre(song.genre);
    const normSelectedGenre = normalizeGenre(currentSelectedGenre);
    const matchGenre = currentSelectedGenre === "all" || normSongGenre === normSelectedGenre || song.genre === currentSelectedGenre;

    const songDecade = song.decade || calculateDecade(song.year);
    const matchDecade = selectedDecade === "all" || songDecade === selectedDecade;

    const matchArtist = !artistFilterVal || (song.artist && song.artist.toLowerCase().includes(artistFilterVal));

    const matchSearch = (song.title && song.title.toLowerCase().includes(searchVal)) || 
                        (song.artist && song.artist.toLowerCase().includes(searchVal)) ||
                        (song.movieTitle && song.movieTitle.toLowerCase().includes(searchVal));

    return matchGenre && matchDecade && matchArtist && matchSearch;
  });

  filtered.sort((a, b) => {
    const isCinema = currentSelectedGenre.includes("Colonne") || currentSelectedGenre.includes("Hindi");

    if (isCinema) {
      const movieA = (a.movieTitle || "").toLowerCase();
      const movieB = (b.movieTitle || "").toLowerCase();
      if (movieA !== movieB) return movieA.localeCompare(movieB);

      const artistA = (a.artist || "").toLowerCase();
      const artistB = (b.artist || "").toLowerCase();
      return artistA.localeCompare(artistB);
    } else {
      const artistA = (a.artist || "").toLowerCase();
      const artistB = (b.artist || "").toLowerCase();
      if (artistA !== artistB) return artistA.localeCompare(artistB);

      const titleA = (a.title || "").toLowerCase();
      const titleB = (b.title || "").toLowerCase();
      return titleA.localeCompare(titleB);
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
    const processedPhotoUrl = fixDropboxUrl(rawPhoto);
    const displayGenre = normalizeGenre(song.genre);
    const badgeColor = genreColors[displayGenre] || "#f472b6";

    const imageHtml = processedPhotoUrl 
      ? `<img src="${processedPhotoUrl}" alt="${song.artist}" class="artist-img" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="artist-img" style="display:none; align-items:center; justify-content:center; color:#ffffff; font-weight:900; font-size: 2.5rem; background: linear-gradient(135deg, #334155, #0f172a);">${initial}</div>`
      : `<div class="artist-img" style="display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:900; font-size: 2.5rem; background: linear-gradient(135deg, #334155, #0f172a);">${initial}</div>`;

    const rawAudio = song.youtubeUrl || "";
    const processedAudioUrl = fixDropboxUrl(rawAudio);
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
      playerHtml = `<div class="audio-player-wrapper"><audio controls preload="metadata"><source src="${processedAudioUrl}" type="audio/mpeg">Audio non supportato.</audio></div>`;
    } else if (rawAudio) {
      playerHtml = `<a href="${rawAudio}" target="_blank" style="color:${badgeColor}; font-weight:bold; font-size:0.85rem; text-decoration:none; display:inline-block; margin-top:0.5rem;">▶ Ascolta su YouTube</a>`;
    } else {
      playerHtml = `<p style="font-size:0.8rem; color:#94a3b8; margin-top:0.5rem;">Nessun link audio inserito</p>`;
    }

    const movieHtml = song.movieTitle 
      ? `<p class="card-info" style="color:#eab308; font-weight:600;">🎬 <strong>Film:</strong> ${song.movieTitle}</p>` 
      : "";

    const actionsHtml = isReadOnly ? "" : `
      <div class="card-actions">
        <button class="icon-btn" onclick='editSong("${song.id}")'>✏️ Modifica</button>
        <button class="icon-btn" onclick='deleteSong("${song.id}")'>🗑️ Elimina</button>
      </div>
    `;

    const calculatedDecade = song.decade || calculateDecade(song.year);
    const decadeHtml = calculatedDecade ? `<p class="card-info"><strong>Decade:</strong> ${calculatedDecade}</p>` : "";

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
        ${decadeHtml}
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
  csv += "Artista;Titolo;Anno;Genere;Film;Link Audio/YouTube;Link Foto\n";

  songsList.forEach(s => {
    csv += `"${s.artist || ''}";"${s.title || ''}";"${s.year || ''}";"${s.genre || ''}";"${s.movieTitle || ''}";"${s.youtubeUrl || ''}";"${s.photoUrl || ''}"\n`;
  });

  const a = document.createElement("a");
  a.setAttribute("href", encodeURI(csv));
  a.setAttribute("download", "MyMusic_Canzoni.csv");
  document.body.appendChild(a);
  a.click();
  a.remove();
}
