document.addEventListener('DOMContentLoaded', () => {
  // ---------------------- 1. Layers ----------------------
  const lightLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    { attribution: '&copy; OpenStreetMap & CARTO', subdomains: 'abcd', maxZoom: 19 }
  );
  const darkLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    { attribution: '&copy; OpenStreetMap & CARTO', subdomains: 'abcd', maxZoom: 19 }
  );

  const initialCenter = [38.1938, 15.5540];
  const map = L.map('map', {
    center: initialCenter,
    zoom: 13,
    layers: [lightLayer]
  });
  const markerCluster = L.markerClusterGroup();
  map.addLayer(markerCluster);

  // ---------------------- 2. Dark toggle ----------------------
  document.getElementById('darkToggle').addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    if (isDark) {
      map.removeLayer(lightLayer);
      map.addLayer(darkLayer);
    } else {
      map.removeLayer(darkLayer);
      map.addLayer(lightLayer);
    }
    renderFavoritesList(); // aggiorna colori popup
  });

  // ---------------------- 3. Favorites in localStorage ----------------------
  let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
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

  // ---------------------- 4. Utility normalize ----------------------
  let stops = [];
  const markers = [];
  function normalize(str) {
    return str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // ---------------------- 5. Carica fermate ----------------------
  fetch('./stops_fixed.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      if (!Array.isArray(data)) throw new Error('JSON non è un array');

      stops = data
        .filter(s => s && s.name && s.lat && s.lon)
        .map((s, idx) => ({ ...s, id: s.id ?? idx, zone: s.zone ?? 'centro' }));

      stops.forEach(s => {
        const m = L.marker([s.lat, s.lon], { title: s.name });
        const starClass = isFavorite(s.id) ? 'fav-on' : 'fav-off';
        const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`;
        const html = `
          <div>
            <b>${s.name}</b>
            <span
              class="popup-star ${starClass}"
              data-id="${s.id}"
              title="Aggiungi/rimuovi dai preferiti"
            >⭐</span>
            <br>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-top:4px;">
              <a href="${s.url}" target="_blank" class="popup-link">ℹ️ Vedi dettagli</a>
              <a href="${mapsLink}" target="_blank" class="popup-link">📍 Portami qui</a>
            </div>
          </div>`;
        m.bindPopup(html);
        m.normalizedName = normalize(s.name);
        markers.push(m);
        markerCluster.addLayer(m);
      });
    })
    .catch(e => {
      console.error(e);
      alert('Errore nel caricamento delle fermate: ' + e.message);
    });

  // ---------------------- 6. Click su stellina popup ----------------------
  document.addEventListener('click', e => {
    const el = e.target.closest('.popup-star');
    if (!el) return;
    const id = el.dataset.id;
    toggleFavorite(id);
    el.classList.toggle('fav-on',  isFavorite(id));
    el.classList.toggle('fav-off', !isFavorite(id));
    el.classList.add('animate');
    el.addEventListener('animationend', () => el.classList.remove('animate'), { once: true });
  });

  // ---------------------- 7. Apri/chiudi popup preferiti ----------------------
  document.getElementById('open-favorites').addEventListener('click', () => {
    renderFavoritesList();
    document.getElementById('favorites-popup').style.display = 'block';
  });
  document.getElementById('close-favorites').addEventListener('click', () => {
    document.getElementById('favorites-popup').style.display = 'none';
  });

  // ---------------------- 8. Render lista preferiti ----------------------
  function renderFavoritesList() {
    const ul = document.getElementById('favorites-list');
    ul.innerHTML = '';

    const zones = { nord: [], centro: [], sud: [] };
    stops.forEach(s => {
      if (!s.id || !isFavorite(s.id)) return;
      zones[s.zone || 'centro'].push(s);
    });

    Object.keys(zones).forEach(zoneKey => {
      const stopsInZone = zones[zoneKey];
      if (!stopsInZone.length) return;

      const h3 = document.createElement('h3');
      h3.textContent = zoneKey.charAt(0).toUpperCase() + zoneKey.slice(1);
      h3.style.color = document.body.classList.contains('dark') ? '#ffd54f' : '#003366';
      ul.appendChild(h3);

      stopsInZone.forEach(stop => {
        const li = document.createElement('li');

        const a = document.createElement('a');
        a.href = stop.url;
        a.target = '_blank';
        a.textContent = stop.name;
        a.style.color = document.body.classList.contains('dark') ? '#ffd54f' : '#003366';
        li.appendChild(a);

        const btn = document.createElement('button');
        btn.textContent = '❌';
        btn.className = 'remove-fav';
        btn.addEventListener('click', () => {
          const idx = favorites.indexOf(stop.id.toString());
          if (idx > -1) favorites.splice(idx, 1);
          localStorage.setItem('favorites', JSON.stringify(favorites));
          renderFavoritesList();
        });
        li.appendChild(btn);

        ul.appendChild(li);
      });
    });

    const h2 = document.querySelector('#favorites-popup h2');
    if (h2) h2.style.color = document.body.classList.contains('dark') ? '#ffd54f' : '#003366';
  }

  // ---------------------- 9. Ricerca ----------------------
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
    if (matched.length) map.fitBounds(L.featureGroup(matched).getBounds().pad(0.2));
  });

  // ---------------------- 10. Trova fermata più vicina ----------------------
  const locateBtn = document.getElementById('locateBtn');
  const infoBox = document.getElementById('nearestStop');
  let locating = false;
  let userMarker = null;
  let accuracyCircle = null;
  let nearestMarkerPopup = null;

  locateBtn.addEventListener('click', () => {
    if (locating) {
      locating = false;
      locateBtn.classList.remove('active');
      infoBox.style.display = 'none';
      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      if (accuracyCircle) { map.removeLayer(accuracyCircle); accuracyCircle = null; }
      if (nearestMarkerPopup) { map.removeLayer(nearestMarkerPopup); nearestMarkerPopup = null; }
      map.setView(initialCenter, 13);
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
        const { latitude: latU, longitude: lonU, accuracy } = coords;

        // Marker blu
        if (!userMarker) {
          userMarker = L.circleMarker([latU, lonU], {
            radius: 8,
            color: '#2563eb',
            fillColor: '#2563eb',
            fillOpacity: 1,
            weight: 2
          }).addTo(map);
        } else {
          userMarker.setLatLng([latU, lonU]);
        }

        // Cerchio di accuratezza
        const accRadius = Math.max(accuracy, 40);
        if (!accuracyCircle) {
          accuracyCircle = L.circle([latU, lonU], {
            radius: accRadius,
            color: '#2563eb',
            opacity: 0.4,
            fillColor: '#2563eb',
            fillOpacity: 0.15,
            weight: 1,
            className: 'leaflet-user-circle'
          }).addTo(map);
        } else {
          accuracyCircle.setLatLng([latU, lonU]);
          accuracyCircle.setRadius(accRadius);
        }

        // Trova fermata più vicina
        let nearest = null, minDist = Infinity;
        stops.forEach(s => {
          const d = map.distance([s.lat, s.lon], [latU, lonU]);
          if (d < minDist) { minDist = d; nearest = s; }
        });
        if (nearest) {
          const starClass = isFavorite(nearest.id) ? 'fav-on' : 'fav-off';
          const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${nearest.lat},${nearest.lon}`;
          infoBox.innerHTML = `
            📍 <strong>${nearest.name}</strong>
            <span
              class="popup-star ${starClass}"
              data-id="${nearest.id}"
              title="Aggiungi/rimuovi dai preferiti"
            >⭐</span>
            <br>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-top:4px;">
              <a href="${nearest.url}" target="_blank" class="popup-link">ℹ️ Vedi dettagli</a>
              <a href="${mapsLink}" target="_blank" class="popup-link">📍 Portami qui</a>
            </div>
          `;
          map.setView([latU, lonU], 17);
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
