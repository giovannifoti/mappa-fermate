// script.js
document.addEventListener('DOMContentLoaded', () => {
  // 1. Layers
  const lightLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    { attribution: '&copy; OpenStreetMap & CARTO', subdomains: 'abcd', maxZoom: 19 }
  );
  const darkLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    { attribution: '&copy; OpenStreetMap & CARTO', subdomains: 'abcd', maxZoom: 19 }
  );

  const map = L.map('map', {
    center: [38.1938, 15.5540],
    zoom: 13,
    layers: [lightLayer]
  });
  const markerCluster = L.markerClusterGroup();
  map.addLayer(markerCluster);

  // 2. Dark toggle
  document.getElementById('darkToggle').addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    if (isDark) {
      map.removeLayer(lightLayer);
      map.addLayer(darkLayer);
    } else {
      map.removeLayer(darkLayer);
      map.addLayer(lightLayer);
    }
  });

  // 3. Utility & normalize
  let stops = [];
  const markers = [];
  // =====================
// FAVORITI IN LOCALSTORAGE
// =====================

let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

function saveFavorites() {
  localStorage.setItem('favorites', JSON.stringify(favorites));
}

function isFavorite(id) {
  return favorites.includes(id);
}

function toggleFavorite(id) {
  const idx = favorites.indexOf(id);
  if (idx > -1) {
    favorites.splice(idx, 1);
  } else {
    favorites.push(id);
  }
  saveFavorites();
}

  function normalize(str) {
    return str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // 4. Carica fermate
  fetch('./stops_fixed.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      if (!Array.isArray(data)) throw new Error('JSON non è un array');
      stops = data;
      data.forEach(s => {
  const m = L.marker([s.lat, s.lon], { title: s.name });

  // Determina classe iniziale
  const starClass = isFavorite(s.id) ? 'fav-on' : 'fav-off';

  // Popup HTML con la stellina
  const popupHtml = `
    <div>
      <b>${s.name}</b>
      <span
        class="popup-star ${starClass}"
        data-id="${s.id}"
        title="Aggiungi/rimuovi dai preferiti"
        style="cursor: pointer; margin-left: 8px;"
      >⭐</span>
      <br><a href="${s.url}" target="_blank">Vedi dettagli</a>
    </div>`;
  
  m.bindPopup(popupHtml);

  m.normalizedName = normalize(s.name);
  markers.push(m);
  markerCluster.addLayer(m);
});

    })
    .catch(e => { console.error(e); alert('Errore nel caricamento delle fermate'); });

// –––––––––––––––––––––––––––––––––––––––––––––
// Cattura click sulle stelle nei popup + animazione
document.addEventListener('click', e => {
  const el = e.target.closest('.popup-star');
  if (!el) return;

  console.log('⭐ cliccata stazione id=', el.dataset.id);  // DEBUG

  // Toggle in localStorage
  toggleFavorite(el.dataset.id);

  // Cambia colore
  el.classList.toggle('fav-on',  isFavorite(el.dataset.id));
  el.classList.toggle('fav-off', !isFavorite(el.dataset.id));

  // Esegui “pop” animation
  el.classList.add('animate');
  el.addEventListener('animationend', () => {
    el.classList.remove('animate');
  }, { once: true });
});
// –––––––––––––––––––––––––––––––––––––––––––––


// Apertura popup preferiti
document.getElementById('open-favorites').addEventListener('click', () => {
  renderFavoritesList();
  document.getElementById('favorites-popup').style.display = 'block';
});

// Chiusura popup preferiti
document.getElementById('close-favorites').addEventListener('click', () => {
  document.getElementById('favorites-popup').style.display = 'none';
});

  // =============================
  // 5. Inizializza icone stelline
  // =============================
  window.addEventListener('load', () => {
    stops.forEach(s => {
      const selector = `.popup-star[data-id="${s.id}"]`;
      document.querySelectorAll(selector).forEach(el => {
        el.classList.toggle('fav-on',  isFavorite(s.id));
        el.classList.toggle('fav-off', !isFavorite(s.id));
      });
    });
  });


// Genera lista interna dei preferiti
function renderFavoritesList() {
  const ul = document.getElementById('favorites-list');
  ul.innerHTML = '';

  favorites.forEach(id => {
    const stop = stops.find(s => s.id === id);
    if (!stop) return;
    const li = document.createElement('li');
    li.textContent = stop.name;
    ul.appendChild(li);
  });
}

  // 5. Ricerca
  const input = document.getElementById('searchInput');
  const suggestions = document.getElementById('suggestions');
  input.addEventListener('input', () => {
    const q = normalize(input.value.trim());
    suggestions.innerHTML = '';
    if (!q) {
      markerCluster.clearLayers();
      markers.forEach(m => markerCluster.addLayer(m));
      return;
    }
    const matched = markers.filter(m => m.normalizedName.includes(q));
    matched.slice(0, 10).forEach(m => {
      const div = document.createElement('div');
      div.textContent = m.options.title;
      div.addEventListener('click', () => {
        map.setView(m.getLatLng(), 17);
        m.openPopup();
        suggestions.innerHTML = '';
      });
      suggestions.appendChild(div);
    });
    markerCluster.clearLayers();
    matched.forEach(m => markerCluster.addLayer(m));
    if (matched.length) {
      map.fitBounds(L.featureGroup(matched).getBounds().pad(0.2));
    }
  });

  // 6. Trova fermata più vicina (toggle)
  const locateBtn = document.getElementById('locateBtn');
  const infoBox = document.getElementById('nearestStop');
  let locating = false;

  locateBtn.addEventListener('click', () => {
    if (locating) {
      locating = false;
      locateBtn.classList.remove('active');
      infoBox.style.display = 'none';
      return;
    }
    locating = true;
    infoBox.style.display = 'block';
    infoBox.textContent = '📡 Caricamento...';
    if (!navigator.geolocation) {
      infoBox.textContent = '❌ Geolocalizzazione non supportata';
      locating = false;
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        locateBtn.classList.add('active');
        const { latitude: latU, longitude: lonU } = coords;
        let nearest = null, minDist = Infinity;
        stops.forEach(s => {
          const d = map.distance([s.lat, s.lon], [latU, lonU]);
          if (d < minDist) {
            minDist = d; nearest = s;
          }
        });
        if (nearest) {
          infoBox.innerHTML = `📍 <strong>${nearest.name}</strong><br><a href="${nearest.url}" target="_blank">Vai al link</a>`;
          map.setView([nearest.lat, nearest.lon], 17);
        } else {
          infoBox.textContent = '❌ Nessuna fermata trovata';
        }
      },
      () => {
        infoBox.textContent = '❌ Errore nella geolocalizzazione';
        locating = false;
      }
    );
  });
});
