// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAXgGNk2vCMkSFi7Ub6WSp7gBvJT7Mbi1Q",
  authDomain: "studio-82288772-a99ab.firebaseapp.com",
  projectId: "studio-82288772-a99ab",
  storageBucket: "studio-82288772-a99ab.firebasestorage.app",
  messagingSenderId: "48796554059",
  appId: "1:48796554059:web:7cf1c63eadcba83af60ece"
};

// Mappa dei Colori per i Badge e le Sezioni
const genreColors = {
  "Arabian / Belly Dance": "#f59e0b",
  "Blues": "#3b82f6",
  "Classical Crossover": "#a855f7",
  "Country / Folk": "#10b981",
  "Dance / Disco": "#ec4899",
  "Gregoriana": "#d97706",
  "Jazz": "#eab308",
  "K-pop": "#f472b6",
  "Latino": "#ef4444",
  "Metal / Punk": "#dc2626",
  "Musica Classica": "#14b8a6",
  "Musica Elettronica": "#06b6d4",
  "Pop": "#ff6b81",
  "Rap / Hip Hop": "#f97316",
  "Rock": "#8b5cf6",
  "Soul / Funk": "#c084fc",
  "all": "#ec4899"
};

// Inizializzazione Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let songsList = [];
let currentSelectedGenre = "all";

document.addEventListener("DOMContentLoaded", () => {
  db.collection("songs").onSnapshot((snapshot) => {
    songsList = [];
    snapshot.forEach((doc) => {
      songsList.push({ id: doc.id, ...doc.data() });
    });
    renderSongs();
  }, (error) => {
    console.error("Errore Firebase:", error);
  });

  const openBtn = document.getElementById("openModalBtn");
  if(openBtn) openBtn.onclick = () => openModal();

  const closeBtn = document.getElementById("closeModalBtn");
  if(closeBtn) closeBtn.onclick = () => closeModal();
  
  window.onclick = (e) => { 
    if (e.target === document.getElementById("songModal")) closeModal(); 
  };

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.oninput = () => renderSongs();

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

      const id = document.getElementById("songId").value;
      const artist = document.getElementById("artist").value.trim();
      const photoUrl = document.getElementById("artistPhotoUrl").value.trim();
      const title = document.getElementById("title").value.trim();
      const year = document.getElementById("year").value.trim();
      const genre = document.getElementById("genre").value;
      const youtubeUrl = document.getElementById("youtubeUrl").value.trim();

      // CONTROLLO DUPLICATI: verifica se esiste già una canzone con stesso artista e stesso titolo
      const isDuplicate = songsList.some(song => {
        // Se stiamo modificando un brano esistente, ignoriamo il brano stesso
        if (id && song.id === id) return false;

        const sameArtist = song.artist.trim().toLowerCase() === artist.toLowerCase();
        const sameTitle = song.title.trim().toLowerCase() === title.toLowerCase();
        return sameArtist && sameTitle;
      });

      if (isDuplicate) {
        const confirmSave = confirm(
          `⚠️ ATTENZIONE: Il brano "${title}" di "${artist}" è già presente nella libreria!\n\nVuoi salvarlo ugualmente?`
        );
        if (!confirmSave) {
          return; // Annulla il salvataggio se l'utente sceglie "Annulla"
        }
      }

      const songData = { artist, photoUrl, title, year, genre, youtubeUrl };

      try {
        if (id) {
          await db.collection("songs").doc(id).update(songData);
        } else {
          await db.collection("songs").add(songData);
        }
        closeModal();
      } catch (err) {
        alert("Errore salvataggio: " + err.message);
      }
    };
  }

  const exportBtn = document.getElementById("exportJsonBtn");
  if(exportBtn) exportBtn.onclick = exportJSON;

  const importInput = document.getElementById("importJsonInput");
  if(importInput) importInput.onchange = importJSON;

  const excelBtn = document.getElementById("exportExcelBtn");
  if(excelBtn) excelBtn.onclick = exportExcel;
});

function openModal(songToEdit = null) {
  const form = document.getElementById("addSongForm");
  form.reset();

  if (songToEdit) {
    document.getElementById("modalTitle").innerText = "Modifica Brano";
    document.getElementById("songId").value = songToEdit.id;
    document.getElementById("artist").value = songToEdit.artist;
    document.getElementById("artistPhotoUrl").value = songToEdit.photoUrl || "";
    document.getElementById("title").value = songToEdit.title;
    document.getElementById("year").value = songToEdit.year || "";
    document.getElementById("genre").value = songToEdit.genre;
    document.getElementById("youtubeUrl").value = songToEdit.youtubeUrl;
  } else {
    document.getElementById("modalTitle").innerText = "Aggiungi Nuovo Brano";
    document.getElementById("songId").value = "";
  }

  document.getElementById("songModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("songModal").style.display = "none";
}

function fixDropboxUrl(url) {
  if (!url) return "";
  if (url.includes("dropbox.com")) {
    return url.replace("dl=0", "raw=1").replace("dl=1", "raw=1");
  }
  return url;
}

function renderSongs() {
  const container = document.getElementById("songsContainer");
  if (!container) return;

  container.innerHTML = "";
  const searchVal = document.getElementById("searchInput") ? document.getElementById("searchInput").value.toLowerCase() : "";

  const filtered = songsList.filter(song => {
    const matchGenre = currentSelectedGenre === "all" || song.genre === currentSelectedGenre;
    const matchSearch = song.title.toLowerCase().includes(searchVal) || song.artist.toLowerCase().includes(searchVal);
    return matchGenre && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = "<p style='color:#cbd5e1;'>Nessun brano presente in questa sezione.</p>";
    return;
  }

  filtered.forEach((song) => {
    const card = document.createElement("div");
    card.className = "song-card";

    const initial = song.artist ? song.artist.charAt(0).toUpperCase() : "?";
    const processedPhotoUrl = fixDropboxUrl(song.photoUrl);
    const badgeColor = genreColors[song.genre] || "#f472b6";

    const imageHtml = processedPhotoUrl 
      ? `<img src="${processedPhotoUrl}" alt="${song.artist}" class="artist-img" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="artist-img" style="display:none; align-items:center; justify-content:center; color:#ffffff; font-weight:900; font-size: 2.5rem; background: linear-gradient(135deg, #334155, #0f172a);">${initial}</div>`
      : `<div class="artist-img" style="display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:900; font-size: 2.5rem; background: linear-gradient(135deg, #334155, #0f172a);">${initial}</div>`;

    const processedAudioUrl = fixDropboxUrl(song.youtubeUrl);
    const isDropbox = song.youtubeUrl.includes("dropbox.com");
    const isMp3 = song.youtubeUrl.toLowerCase().endsWith(".mp3");

    let playerHtml = "";
    if (isDropbox || isMp3) {
      playerHtml = `<div class="audio-player-wrapper"><audio controls><source src="${processedAudioUrl}" type="audio/mpeg">Audio non supportato.</audio></div>`;
    } else {
      playerHtml = `<a href="${song.youtubeUrl}" target="_blank" style="color:${badgeColor}; font-weight:bold; font-size:0.85rem; text-decoration:none; display:inline-block; margin-top:0.5rem;">▶ Ascolta su YouTube</a>`;
    }

    card.innerHTML = `
      <div>
        <div class="artist-img-container">
          ${imageHtml}
          <span class="genre-badge" style="--badge-color: ${badgeColor};">${song.genre}</span>
        </div>
        <h3 class="card-title">${song.title}</h3>
        <p class="card-info"><strong>Artista:</strong> ${song.artist}</p>
        <p class="card-info"><strong>Anno:</strong> ${song.year || '-'}</p>
      </div>
      <div>
        ${playerHtml}
      </div>
      <div class="card-actions admin-only">
        <button class="icon-btn" onclick='editSong("${song.id}")'>✏️ Modifica</button>
        <button class="icon-btn" onclick='deleteSong("${song.id}")'>🗑️ Elimina</button>
      </div>
    `;

    container.appendChild(card);
  });
}

window.editSong = function(id) {
  const song = songsList.find(s => s.id === id);
  if (song) openModal(song);
};

window.deleteSong = async function(id) {
  if (confirm("Vuoi davvero eliminare questo brano?")) {
    try {
      await db.collection("songs").doc(id).delete();
    } catch (err) {
      alert("Errore eliminazione: " + err.message);
    }
  }
};

function exportJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(songsList, null, 2));
  const a = document.createElement('a');
  a.setAttribute("href", dataStr);
  a.setAttribute("download", "MyMusic_Backup.json");
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function importJSON(event) {
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
  if (songsList.length === 0) {
    alert("Nessun brano da esportare.");
    return;
  }

  let csv = "data:text/csv;charset=utf-8,\uFEFF";
  csv += "Artista;Titolo;Anno;Genere;Link Audio/YouTube;Link Foto\n";

  songsList.forEach(s => {
    csv += `"${s.artist}";"${s.title}";"${s.year || ''}";"${s.genre}";"${s.youtubeUrl}";"${s.photoUrl || ''}"\n`;
  });

  const a = document.createElement("a");
  a.setAttribute("href", encodeURI(csv));
  a.setAttribute("download", "MyMusic_Canzoni.csv");
  document.body.appendChild(a);
  a.click();
  a.remove();
}
