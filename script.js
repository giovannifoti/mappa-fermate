const map = L.map('map').setView([38.1938, 15.5540], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap & CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

let markers = [];
let stops = [];

// Normalizza testo per ricerca (minuscolo e senza accenti)
function normalize(str) {
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-\u036f]/g, '');
}

fetch('stops_fixed.json')
  .then(res => res.json())
  .then(data => {
    stops = data;

    // Crea marker e salva nome normalizzato
    stops.forEach(stop => {
      const marker = L.marker([stop.lat, stop.lon]).addTo(map);
      marker.bindPopup(
        `<b>${stop.name}</b><br><a href="${stop.url}" target="_blank">Vedi dettagli</a>`
      );
      marker.normalizedName = normalize(stop.name);
      markers.push(marker);
    });

    // Attiva la ricerca
    document.getElementById('searchInput').addEventListener('input', onSearch);
  })
  .catch(err => console.error('Errore nel caricamento delle fermate:', err));

function onSearch(e) {
  const rawQuery = e.target.value;
  const query = normalize(rawQuery.trim());
  const infoDiv = document.getElementById('nearestStop');

  // Reset mappa e messaggio
  infoDiv.innerHTML = '';
  let matchedMarkers = [];

  // Se query vuota, mostra tutti i marker
  if (!query) {
    markers.forEach(m => m.addTo(map));
    return;
  }

  // Filtra marker
  markers.forEach(marker => {
    if (marker.normalizedName.includes(query)) matchedMarkers.push(marker);
    map.removeLayer(marker);
  });

  if (matchedMarkers.length === 0) {
    infoDiv.innerHTML = '❌ Nessuna fermata trovata';
    return;
  }

  // Mostra i risultati e adatta la vista
  const group = L.featureGroup(matchedMarkers);
  map.fitBounds(group.getBounds().pad(0.2));
  matchedMarkers.forEach(m => m.addTo(map));
}

document.getElementById('locateBtn').addEventListener('click', () => {
  const infoDiv = document.getElementById('nearestStop');
  infoDiv.innerHTML = '⏳ Caricamento...';

  if (!navigator.geolocation) {
    infoDiv.innerHTML = '❌ Geolocalizzazione non supportata';
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    let minDist = Infinity;
    let nearest = null;

    stops.forEach(stop => {
      const dist = map.distance([stop.lat, stop.lon], [latitude, longitude]);
      if (dist < minDist) {
        minDist = dist;
        nearest = stop;
      }
    });

    if (nearest) {
      infoDiv.innerHTML = `📍 <strong>${nearest.name}</strong><br><a href="${nearest.url}" target="_blank">Vai al link</a>`;
      map.setView([nearest.lat, nearest.lon], 17);
    } else {
      infoDiv.innerHTML = '❌ Nessuna fermata trovata';
    }
  }, err => {
    infoDiv.innerHTML = '❌ Errore nella geolocalizzazione';
  });
});
