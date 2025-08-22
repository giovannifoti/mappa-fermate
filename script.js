document.addEventListener('DOMContentLoaded', () => {

  // -------------------- 1. Layers --------------------
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

  // -------------------- 2. Dark toggle --------------------
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

  // -------------------- 3. Favorites (robusto) --------------------
  let favorites = [];
  try {
    const stored = JSON.parse(localStorage.getItem('favorites'));
    if (Array.isArray(stored)) favorites = stored.map(String);
  } catch { favorites = []; }

  function isFavorite(id) {
    return favorites.includes(id.toString());
  }

  function toggleFavorite(id) {
    const str = id.toString();
    const idx = favorites.indexOf(str);
    if (idx > -1) favorites.splice(idx, 1);
    else favorites.push(str);
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }

  // -------------------- 4. Utility normalize --------------------
  let stops = [];
  const markers = [];
  function normalize(str) {
    return str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // -------------------- 5. Carica fermate --------------------
  fetch('./stops_fixed.json')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      if (!Array.isArray(data)) throw new Error('JSON non è un array');
      stops = data;
      data.forEach(s => {
        const m = L.marker([s.lat, s.lon], { title: s.name });
        const starClass = isFavorite(s.id) ? 'fav-on' : 'fav-off';
        const html = `
          <div>
            <b>${s.name}</b>
            <span
              class="popup-star ${starClass}"
              data-id="${s.id}"
              title="Aggiungi/rimuovi dai preferiti"
            >⭐</span>
            <br><a href="${s.url}" target="_blank">Vedi dettagli</a>
          </div>`;
        m.bindPopup(html);
        m.normalizedName = normalize(s.name);
        markers.push(m);
        markerCluster.addLayer(m);
      });
    })
    .catch(e => {
      console.error('Errore caricamento fermate:', e);
      alert(`Errore nel caricamento delle fermate: ${e.message}`);
    });

  // -------------------- 6. Click su stellina popup --------------------
  document.addEventListener('click', e => {
    const el = e.target.closest('.popup-star');
    if (!el) return;
    const id = el.dataset.id;
    toggleFavorite(id);
    el.classList.toggle('fav-on', isFavorite(id));
    el.classList.toggle('fav-off', !isFavorite(id));
    el.classList.add('animate');
    el.addEventListener('animationend', () => el.classList.remove('animate'), { once: true });
  });

  // -------------------- 7. Popup preferiti --------------------
  document.getElementById('open-favorites').addEventListener('click', () => {
    renderFavoritesList();
    document.getElementById('favorites-popup').style.display = 'block';
  });
  document.getElementById('close-favorites').addEventListener('click', () => {
    document.getElementById('favorites-popup').style.display = 'none';
  });

  function renderFavoritesList() {
    const ul = document.getElementById('favorites-list');
    ul.innerHTML = '';
    favorites.forEach(idStr => {
      const stop = stops.find(s => s.id.toString() === idStr);
      if (!stop) return;
      const li = document.createElement('li');
      li.textContent = stop.name;
      ul.appendChild(li);
    });
  }

  // -------------------- 8. Ricerca --------------------
  const input = document.getElementById('searchInput');
  const suggestions = document.getElementById('suggestions');

  input.addEventListener('input', () => {
    const q = normalize(input.value.trim());
    suggestions.innerHTML = '';

    markerCluster.clearLayers();
    if (!q) {
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

    matched.forEach(m => markerCluster.addLayer(m));
    if (matched.length) map.fitBounds(L.featureGroup(matched).getBounds().pad(0.2));
  });

  // -------------------- 9. Trova fermata più vicina --------------------
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
          if (d < minDist) { minDist = d; nearest = s; }
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
