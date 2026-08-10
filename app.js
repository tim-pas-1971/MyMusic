let songsList = [];

try {
  songsList = JSON.parse(localStorage.getItem("myMusic_songs")) || [];
} catch (e) {
  songsList = [];
}

let currentSelectedGenre = "all";

document.addEventListener("DOMContentLoaded", () => {
  renderSongs();

  document.getElementById("openModalBtn").onclick = () => openModal();
  document.getElementById("closeModalBtn").onclick = () => closeModal();
  
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
      document.getElementById("currentGenreTitle").innerText = 
        currentSelectedGenre === "all" ? "Tutti i Generi" : currentSelectedGenre;
      
      renderSongs();
    };
  });

  document.getElementById("addSongForm").onsubmit = (e) => {
    e.preventDefault();

    const id = document.getElementById("songId").value;
    const artist = document.getElementById("artist").value.trim();
    const photoUrl = document.getElementById("artistPhotoUrl").value.trim();
    const title = document.getElementById("title").value.trim();
    const year = document.getElementById("year").value.trim();
    const genre = document.getElementById("genre").value;
    const youtubeUrl = document.getElementById("youtubeUrl").value.trim();

    if (id) {
      const idx = songsList.findIndex(s => s.id === id);
      if (idx !== -1) {
        songsList[idx] = { id, artist, photoUrl, title, year, genre, youtubeUrl };
      }
    } else {
      const newSong = {
        id: Date.now().toString(),
        artist,
        photoUrl,
        title,
        year,
        genre,
        youtubeUrl
      };
      songsList.push(newSong);
    }

    saveSongs();
    closeModal();
    alert("Brano salvato con successo!");
  };

  document.getElementById("exportJsonBtn").onclick = exportJSON;
  document.getElementById("importJsonInput").onchange = importJSON;
  document.getElementById("exportExcelBtn").onclick = exportExcel;
});

function saveSongs() {
  localStorage.setItem("myMusic_songs", JSON.stringify(songsList));
  renderSongs();
}

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

// Convertitore universale Link Google Drive (Audio o Immagine)
function convertDriveUrl(url) {
  if (!url) return "";
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://docs.google.com/uc?export=view&id=${match[1]}`;
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
    container.innerHTML = "<p style='color:#64748b;'>Nessun brano presente in questa sezione.</p>";
    return;
  }

  filtered.forEach(song => {
    const card = document.createElement("div");
    card.className = "song-card";

    const initial = song.artist ? song.artist.charAt(0).toUpperCase() : "?";
    
    // Gestione Foto (Converte automaticamente se è un link Google Drive)
    const processedPhotoUrl = convertDriveUrl(song.photoUrl);

    const imageHtml = processedPhotoUrl 
      ? `<img src="${processedPhotoUrl}" alt="${song.artist}" class="artist-img" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="artist-img" style="display:none; align-items:center; justify-content:center; color:#64748b; font-weight:bold; font-size: 2rem;">${initial}</div>`
      : `<div class="artist-img" style="display:flex; align-items:center; justify-content:center; color:#64748b; font-weight:bold; font-size: 2rem;">${initial}</div>`;

    // Gestione Player Audio
    const isDrive = song.youtubeUrl.includes("drive.google.com");
    const isMp3 = song.youtubeUrl.endsWith(".mp3");

    let playerHtml = "";
    if (isDrive || isMp3) {
      const audioSrc = isDrive ? convertDriveUrl(song.youtubeUrl) : song.youtubeUrl;
      playerHtml = `<audio controls style="width: 100%; margin-top: 0.5rem;"><source src="${audioSrc}" type="audio/mpeg">Il tuo browser non supporta l'audio.</audio>`;
    } else {
      playerHtml = `<a href="${song.youtubeUrl}" target="_blank" style="color:#2563eb; font-weight:bold; font-size:0.85rem; text-decoration:none;">▶ Ascolta su YouTube</a>`;
    }

    card.innerHTML = `
      <div>
        ${imageHtml}
        <h3 class="card-title">${song.title}</h3>
        <p class="card-info"><strong>Artista:</strong> ${song.artist}</p>
        <p class="card-info"><strong>Anno:</strong> ${song.year || '-'}</p>
        <p class="card-info"><strong>Genere:</strong> ${song.genre}</p>
      </div>
      <div style="margin-top:0.8rem;">
        ${playerHtml}
      </div>
      <div class="card-actions">
        <span></span>
        <div>
          <button class="icon-btn" onclick='editSong("${song.id}")' title="Modifica">✏️</button>
          <button class="icon-btn" onclick='deleteSong("${song.id}")' title="Elimina">🗑️</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

window.editSong = function(id) {
  const song = songsList.find(s => s.id === id);
  if (song) openModal(song);
};

window.deleteSong = function(id) {
  if (confirm("Vuoi davvero eliminare questo brano?")) {
    songsList = songsList.filter(s => s.id !== id);
    saveSongs();
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
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data)) {
        songsList = data;
        saveSongs();
        alert("Importazione completata!");
      } else {
        alert("File non valido.");
      }
    } catch (err) {
      alert("Errore nel file JSON.");
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
  csv += "Artista;Titolo;Anno;Genere;Link YouTube/Drive;Link Foto\n";

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
