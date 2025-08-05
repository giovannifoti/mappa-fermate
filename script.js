const map = L.map('map').setView([38.1938, 15.5540], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap & CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

const markerCluster = L.markerClusterGroup();
let stops = [];
let markerMap = [];

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

fetch('stops_fixed.json')
  .then(res => res.json())
  .then(data => {
    stops = data;
    stops.forEach(stop => {
      const marker = L.marker([stop.lat, stop.lon]);
      marker.bindPopup(`<b>${stop.name}</b><br><a href="${stop.url}" target="_blank">Vedi dettagli</a>`);
      marker.normalizedName = normalize(stop.name);
      markerCluster.addLayer(marker);
      markerMap.push(marker);
    });
    map.addLayer(markerCluster);
    document.getElementById('searchInput').addEventListener('input', onSearch);
  })
  .catch(err => console.error('Errore nel caricamento delle fermate:', err));

function onSearch(e) {
  const query = normalize(e.target.value.trim());
  const suggestions = document.getElementById('suggestions');
  const infoDiv = document.getElementById('nearestStop');
  suggestions.innerHTML = '';
  infoDiv.innerHTML = '';

  if (!query) {
    map.addLayer(markerCluster);
    return;
  }

  const matched = markerMap.filter(marker =>
    marker.normalizedName.includes(query)
  );

  matched.slice(0, 10).forEach(marker => {
    const div = document.createElement('div');
    div.textContent = marker.getPopup().getContent().split('<br')[0].replace('<b>', '').replace('</b>', '');
    div.addEventListener('click', () => {
      map.setView(marker.getLatLng(), 17);
      marker.openPopup();
      suggestions.innerHTML = '';
    });
    suggestions.appendChild(div);
  });

  if (matched.length > 0) {
    const group = L.featureGroup(matched);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

document.getElementById('locateBtn').addEventListener('click', function () {
  const btn = this;
  const infoDiv = document.getElementById('nearestStop');
  infoDiv.innerHTML = '📡 Caricamento...';
  btn.classList.remove('active');

  if (!navigator.geolocation) {
    infoDiv.innerHTML = '❌ Geolocalizzazione non supportata';
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    btn.classList.add('active');
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
  }, () => {
    infoDiv.innerHTML = '❌ Errore nella geolocalizzazione';
  });
});