// main.js
// ------------ CONFIG ------------
const STOP_DATA_URL = 'stops_fixed.json'; // ← aggiornato
const STORAGE_KEY_FAVS = 'favoriteStops';
const STORAGE_KEY_DARK = 'darkMode';

// ------------ UTILS ------------
const distance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getFavorites = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEY_FAVS) || '[]');
const saveFavorites = (arr) =>
  localStorage.setItem(STORAGE_KEY_FAVS, JSON.stringify(arr));
const isFavorite = (id) => getFavorites().includes(id);

// ------------ MAIN ------------
document.addEventListener('DOMContentLoaded', async () => {
  const stops = await fetch(STOP_DATA_URL).then((r) => r.json());
  const map = initMap(stops);
  initSearch(stops, map);
  initLocate(stops, map);
  initDarkMode();
  initFavoritesUI(stops, map);
});

// ------------ MAP & MARKERS ------------
function initMap(stops) {
  const map = L.map('map', { preferCanvas: true }).setView(
    [38.1938, 15.5540],
    13
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const cluster = L.markerClusterGroup();
  stops.forEach((stop) => {
    const m = L.marker([stop.lat, stop.lon]);
    m.stop = stop;
    m.bindPopup(createPopupHTML(stop));
    m.on('popupopen', (e) => {
      const star = e.popup
        .getElement()
        .querySelector(`.popup-star[data-id="${stop.id}"]`);
      star?.addEventListener('click', () => toggleFav(stop, star));
    });
    cluster.addLayer(m);
  });

  map.addLayer(cluster);
  return map;
}

function createPopupHTML(stop) {
  const favClass = isFavorite(stop.id) ? 'fav-on' : 'fav-off';
  return `
    <div style="display:flex; align-items:center; justify-content:space-between;">
      <span>${stop.name}</span>
      <span class="popup-star ${favClass}" data-id="${stop.id}">&#9733;</span>
    </div>
  `;
}

function toggleFav(stop, starEl) {
  const favs = getFavorites();
  const idx = favs.indexOf(stop.id);

  if (idx === -1) {
    favs.push(stop.id);
    starEl.classList.replace('fav-off', 'fav-on');
    starEl.classList.add('animate');
  } else {
    favs.splice(idx, 1);
    starEl.classList.replace('fav-on', 'fav-off');
  }

  saveFavorites(favs);
  setTimeout(() => starEl.classList.remove('animate'), 600);
}

// ------------ SEARCH ------------
function initSearch(stops, map) {
  const input = document.getElementById('searchInput');
  const sug = document.getElementById('suggestions');
  let to;

  input.addEventListener('input', () => {
    clearTimeout(to);
    to = setTimeout(() => {
      const q = input.value.trim().toLowerCase();
      sug.innerHTML = '';
      if (!q) return (sug.style.display = 'none');

      const matches = stops
        .filter((s) => s.name.toLowerCase().includes(q))
        .slice(0, 5);

      matches.forEach((s) => {
        const div = document.createElement('div');
        div.textContent = s.name;
        div.tabIndex = 0;
        div.addEventListener('click', () => {
          map.setView([s.lat, s.lon], 17);
          sug.style.display = 'none';
        });
        sug.appendChild(div);
      });

      sug.style.display = matches.length ? 'block' : 'none';
    }, 200);
  });
}

// ------------ LOCATE NEAREST ------------
function initLocate(stops, map) {
  const btn = document.getElementById('locateBtn');
  const info = document.getElementById('nearestStop');

  btn.addEventListener('click', () => {
    if (!navigator.geolocation)
      return alert('Geolocalizzazione non supportata.');

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;

      let nearest = stops[0];
      let minD = distance(lat, lon, nearest.lat, nearest.lon);

      stops.forEach((s) => {
        const d = distance(lat, lon, s.lat, s.lon);
        if (d < minD) {
          minD = d;
          nearest = s;
        }
      });

      map.setView([nearest.lat, nearest.lon], 17);
      info.innerHTML = `Fermata più vicina: <a href="#">${nearest.name}</a>`;
      info.style.display = 'block';
    });
  });
}

// ------------ DARK MODE ------------
function initDarkMode() {
  const toggle = document.getElementById('darkToggle');
  toggle.addEventListener('click', () => {
    const dark = document.body.classList.toggle('dark');
    toggle.setAttribute('aria-checked', dark);
    localStorage.setItem(STORAGE_KEY_DARK, dark);
  });

  if (localStorage.getItem(STORAGE_KEY_DARK) === 'true') {
    document.body.classList.add('dark');
    toggle.setAttribute('aria-checked', 'true');
  }
}

// ------------ FAVORITES UI ------------
function initFavoritesUI(stops, map) {
  const openBtn = document.getElementById('open-favorites');
  const popup = document.getElementById('favorites-popup');
  const closeBtn = document.getElementById('close-favorites');
  const listEl = document.getElementById('favorites-list');

  openBtn.addEventListener('click', () => {
    renderFavorites();
    popup.style.display = 'block';
    popup.setAttribute('aria-hidden', 'false');
  });

  closeBtn.addEventListener('click', () => {
    popup.style.display = 'none';
    popup.setAttribute('aria-hidden', 'true');
  });

  function renderFavorites() {
    const favs = getFavorites();
    listEl.innerHTML = '';

    favs.forEach((id) => {
      const stop = stops.find((s) => s.id === id);
      if (!stop) return;

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = stop.name;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        map.setView([stop.lat, stop.lon], 17);
        popup.style.display = 'none';
      });

      const btn = document.createElement('button');
      btn.className = 'remove-fav';
      btn.textContent = '×';
      btn.addEventListener('click', () => {
        const updated = getFavorites().filter((fid) => fid !== id);
        saveFavorites(updated);
        renderFavorites();
      });

      li.append(a, btn);
      listEl.appendChild(li);
    });
  }
}
