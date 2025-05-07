
const map = L.map('map').setView([38.1938, 15.5540], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap & CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

// Icona personalizzata grigia senza ombra
const customIcon = L.icon({
  iconUrl: 'marker-gray.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

let markers = [];
let stops = [];

fetch('stops_fixed.json')
  .then(res => res.json())
  .then(data => {
    stops = data;
    data.forEach(stop => {
      const marker = L.marker([stop.lat, stop.lon], { icon: customIcon }).addTo(map);
      marker.bindPopup(`<b>${stop.name}</b><br><a href="${stop.url}" target="_blank">Vedi dettagli</a>`);
      marker.stopName = stop.name.toLowerCase();
      markers.push(marker);
    });
  });

document.getElementById("searchInput").addEventListener("input", function(e) {
  const query = e.target.value.toLowerCase();
  markers.forEach(marker => {
    if (marker.stopName.includes(query)) {
      if (!map.hasLayer(marker)) marker.addTo(map);
    } else {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    }
  });
});

document.getElementById("locateBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Geolocalizzazione non supportata");
    return;
  }
  navigator.geolocation.getCurrentPosition(position => {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;
    map.setView([userLat, userLon], 15);

    let minDist = Infinity;
    let nearest = null;
    stops.forEach(stop => {
      const dist = Math.hypot(stop.lat - userLat, stop.lon - userLon);
      if (dist < minDist) {
        minDist = dist;
        nearest = stop;
      }
    });

    if (nearest) {
      alert(`📍 Fermata più vicina: ${nearest.name}\n${nearest.url}`);
      document.getElementById("nearestStop").innerHTML =
        `📍 Fermata più vicina: <strong>${nearest.name}</strong> – <a href="${nearest.url}" target="_blank">Vai al link</a>`;
    }
  });
});
