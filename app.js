let songsList = JSON.parse(localStorage.getItem("myMusic_songs")) || [];
let currentSelectedGenre = "all";

// Elementi DOM
const modal = document.getElementById("songModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const addSongForm = document.getElementById("addSongForm");
const modalTitle = document.getElementById("modalTitle");
const navButtons = document.querySelectorAll(".nav-btn");
const currentGenreTitle = document.getElementById("currentGenreTitle");
const songsContainer = document.getElementById("songsContainer");
const searchInput = document.getElementById("searchInput");

// Event Listener Iniziali
document.addEventListener("DOMContentLoaded", () => {
  renderSongs();

  openModalBtn.addEventListener("click", () => openModal());
  closeModalBtn.addEventListener("click", () => closeModal());
  window.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  searchInput.addEventListener("input", renderSongs);

  // Gestione Pagine Generi
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      navButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      currentSelectedGenre = btn.getAttribute("data-genre");
      currentGenreTitle.innerText = currentSelectedGenre === "all" ? "Tutti i Generi" : currentSelectedGenre;
      renderSongs();
    });
  });

  // Import / Export
  document.getElementById("exportJsonBtn").addEventListener("click", exportJSON);
  document.getElementById("importJsonInput").addEventListener("change", importJSON);
  document.getElementById("exportExcelBtn").addEventListener("click", exportExcel);
});

// Salva e aggiorna LocalStorage
function saveSongs() {
  localStorage.setItem("myMusic_songs", JSON.stringify(songsList));
  renderSongs();
}

// Apertura/Chiusura Modale
function openModal(songToEdit = null) {
  addSongForm.reset();
  if (songToEdit) {
    modalTitle.innerText = "Modifica Brano";
    document.getElementById("songId").value = songToEdit.id;
    document.getElementById("artist").value = songToEdit.artist;
    document.getElementById("artistPhotoUrl").value = songToEdit.photoUrl || "";
    document.getElementById("title").value = songToEdit.title;
    document.getElementById("year").value = songToEdit.year || "";
    document.getElementById("genre").value = songToEdit.genre;
    document.getElementById("youtubeUrl").value = songToEdit.youtubeUrl;
  } else {
    modalTitle.innerText = "Aggiungi Nuovo Brano";
    document.getElementById("songId").value = "";
  }
  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
}

// Invio Form (Aggiungi o Modifica)
addSongForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const id = document.getElementById("songId").value;
  const artist = document.getElementById("artist").value;
  const photoUrl = document.getElementById("artistPhotoUrl").value;
  const title = document.getElementById("title").value;
  const year = document.getElementById("year").value;
  const genre = document.getElementById("genre").value;
  const youtubeUrl = document.getElementById("youtubeUrl").value;

  if (id) {
    // Modifica
    const index = songsList.findIndex(s => s.id === id);
    if (index !== -1) {
      songsList[index] = { id, artist, photoUrl, title, year, genre, youtubeUrl };
    }
  } else {
    // Nuovo
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
});

// Elimina Brano
function deleteSong(id) {
  if (confirm("Sei sicuro di voler eliminare questo brano?")) {
    songsList = songsList.filter(s => s.id !== id);
    saveSongs();
  }
}

// Mostra i brani
function renderSongs() {
  songsContainer.innerHTML = "";
  const searchTerm = searchInput.value.toLowerCase();

  const filtered = songsList.filter(song => {
    const matchesGenre = currentSelectedGenre === "all" || song.genre === currentSelectedGenre;
    const matchesSearch = song.title.toLowerCase().includes(searchTerm) || song.artist.toLowerCase().includes(searchTerm);
    return matchesGenre && matchesSearch;
  });

  if (filtered.length === 0) {
    songsContainer.innerHTML = "<p>Nessun brano trovato.</p>";
    return;
  }

  filtered.forEach(song => {
    const card = document.createElement("div");
    card.className = "song-card";

    const imageHtml = song.photoUrl 
      ? `<img src="${song.photoUrl}" alt="${song.artist}" class="artist-img" onerror="this.onerror=null;this.src='https://via.placeholder.com/250x150?text=Immagine+Non+Valida';">`
      : `<div class="artist-img" style="display:flex;align-items:center;justify-content:center;color:#888;">Nessuna Foto</div>`;

    card.innerHTML = `
      <div>
        ${imageHtml}
        <h3 class="card-title">${song.title}</h3>
        <p class="card-info"><strong>Artista:</strong> ${song.artist}</p>
        <p class="card-info"><strong>Anno:</strong> ${song.year || '-'}</p>
        <p class="card-info"><strong>Genere:</strong> ${song.genre}</p>
      </div>
      <div class="card-actions">
        <a href="${song.youtubeUrl}" target="_blank" style="color:#2563eb;font-weight:bold;font-size:0.85rem;text-decoration:none;">▶ YouTube</a>
        <div>
          <button class="icon-btn" onclick='editSong("${song.id}")' title="Modifica">✏️</button>
          <button class="icon-btn" onclick='deleteSong("${song.id}")' title="Elimina">🗑️</button>
        </div>
      </div>
    `;

    songsContainer.appendChild(card);
  });
}

// Helper modifica
window.editSong = function(id) {
  const song = songsList.find(s => s.id === id);
  if (song) openModal(song);
};

// Funzioni Export/Import
function exportJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(songsList, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "MyMusic_Backup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      if (Array.isArray(importedData)) {
        songsList = importedData;
        saveSongs();
        alert("Importazione completata con successo!");
      } else {
        alert("Il file JSON non ha un formato valido.");
      }
    } catch (err) {
      alert("Errore nella lettura del file JSON.");
    }
  };
  reader.readAsText(file);
}

function exportExcel() {
  if (songsList.length === 0) {
    alert("Nessun brano da esportare.");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF gestisce gli accenti in Excel
  csvContent += "Artista;Titolo;Anno;Genere;Link YouTube;Link Foto\n";

  songsList.forEach(s => {
    csvContent += `"${s.artist}";"${s.title}";"${s.year || ''}";"${s.genre}";"${s.youtubeUrl}";"${s.photoUrl || ''}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "MyMusic_Canzoni.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
}
