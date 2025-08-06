// script.js
document.addEventListener('DOMContentLoaded', () => {
  // 1. Setup map & layers
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

  // 2. Dark mode toggle
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

  // 3. Utilities
  let stops = [];
  const markers = [];
  function normalize(str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // 4. Load stops from JSON
  fetch('./stops_fixed.json')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (!Array.isArray(data)) throw new Error('JSON non è un array');
      stops = data;

      data.forEach(stop => {
        const m = L.marker([stop.lat, stop.lon], { title: stop.name });
        m.bindPopup(
          `<b>${stop.name}</b><br>` +
          `<a href="${stop.url}" target="_blank">Vedi dettagli</a>`
        );
        m.normalizedName = normalize(stop.name);
        markers.push(m);
        markerCluster.addLayer(m);
      });
    })
    .catch(err => {
      console.error('Errore nel caricamento delle fermate:', err);
      alert('Impossibile caricare le fermate: controlla console');
    });

  // 5. Search functionality
  const input = document.getElementById('searchInput');
  const suggestions = document.getElementById('suggestions');

  input.addEventListener('input', () => {
    const q = normalize(input.value.trim());
    suggestions.innerHTML = '';

    // if empty, restore all
    if (!q) {
      markerCluster.clearLayers();
      markers.forEach(m => markerCluster.addLayer(m));
      return;
    }

    // filter
    const matched = markers.filter(m => m.normalizedName.includes(q));

    // show up to 10 suggestions
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

    // update cluster & zoom to matched
    markerCluster.clearLayers();
    matched.forEach(m => markerCluster.addLayer(m));
    if (matched.length) {
      const group = L.featureGroup(matched);
      map.fitBounds(group.getBounds().pad(0.2));
    }
  });

  // 6. Locate nearest stop
  document.getElementById('locateBtn').addEventListener('click', e => {
    const info = document.getElementById('nearestStop');
    const btn = e.currentTarget;
    info.textContent = '📡 Caricamento...';
    btn.classList.remove('active');

    if (!navigator.geolocation) {
      info.textContent = '❌ Geolocalizzazione non supportata';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        btn.classList.add('active');
        const { latitude: latU, longitude: lonU } = coords;
        let nearest = null;
        let minDist = Infinity;

        stops.forEach(s => {
          const d = map.distance([s.lat, s.lon], [latU, lonU]);
          if (d < minDist) {
            minDist = d;
            nearest = s;
          }
        });

        if (nearest) {
          info.innerHTML =
            `📍 <strong>${nearest.name}</strong><br>` +
            `<a href="${nearest.url}" target="_blank">Vai al link</a>`;
          map.setView([nearest.lat, nearest.lon], 17);
        } else {
          info.textContent = '❌ Nessuna fermata trovata';
        }
      },
      () => {
        info.textContent = '❌ Errore nella geolocalizzazione';
      }
    );
  });
});
