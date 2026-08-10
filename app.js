let songsList = [];
let currentSelectedGenre = "all";

// Elementi DOM
const modal = document.getElementById("songModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const addSongForm = document.getElementById("addSongForm");
const navButtons = document.querySelectorAll(".nav-btn");
const currentGenreTitle = document.getElementById("currentGenreTitle");
const songsContainer = document.getElementById("songsContainer");

// Gestione Modale (Apertura e Chiusura)
openModalBtn.addEventListener("click", () => modal.style.display = "flex");
closeModalBtn.addEventListener("click", () => modal.style.display = "none");
window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
});

// Gestione Navigazione per Generi (Pagine)
navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    navButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentSelectedGenre = btn.getAttribute("data-genre");
    currentGenreTitle.innerText = currentSelectedGenre === "all" ? "Tutti i Generi" : currentSelectedGenre;
    
    renderSongs();
  });
});

// Invio Form "Aggiungi Brano"
addSongForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const artist = document.getElementById("artist").value;
  const title = document.getElementById("title").value;
  const year = document.getElementById("year").value;
  const genre = document.getElementById("genre").value;
  const youtubeUrl = document.getElementById("youtubeUrl").value;
  const photoInput = document.getElementById("artistPhoto");

  // Conversione immagine carica in URL locale
  let photoUrl = "";
  if (photoInput.files && photoInput.files[0]) {
    photoUrl = URL.createObjectURL(photoInput.files[0]);
  }

  const newSong = {
    id: Date.now().toString(),
    artist,
    title,
    year,
    genre,
    youtubeUrl,
    photoUrl
  };

  songsList.push(newSong);

  // Pulisci e chiudi modale
  addSongForm.reset();
  modal.style.display = "none";

  renderSongs();
});

// Mostra i brani in base alla pagina del genere selezionato
function renderSongs() {
  songsContainer.innerHTML = "";

  const filteredSongs = currentSelectedGenre === "all" 
    ? songsList 
    : songsList.filter(s => s.genre === currentSelectedGenre);

  if (filteredSongs.length === 0) {
    songsContainer.innerHTML = "<p>Nessun brano presente in questo genere.</p>";
    return;
  }

  filteredSongs.forEach(song => {
    const card = document.createElement("div");
    card.className = "song-card";

    const imageTag = song.photoUrl 
      ? `<img src="${song.photoUrl}" alt="${song.artist}" class="artist-img">`
      : `<div class="artist-img" style="display:flex;align-items:center;justify-content:center;color:#888;">Nessuna Foto</div>`;

    card.innerHTML = `
      ${imageTag}
      <h3>${song.title}</h3>
      <p><strong>Artista:</strong> ${song.artist}</p>
      <p><strong>Anno:</strong> ${song.year || '-'}</p>
      <p><strong>Genere:</strong> ${song.genre}</p>
      <a href="${song.youtubeUrl}" target="_blank" style="color:#2563eb;">Apri su YouTube 🔗</a>
    `;

    songsContainer.appendChild(card);
  });
}
