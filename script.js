
let map = L.map('map').setView([38.1938, 15.5540], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map);

let markers = [];
let stops = [];

fetch('stops_fixed.json')
  .then(res => res.json())
  .then(data => {
    stops = data;
    data.forEach(stop => {
      const marker = L.marker([stop.lat, stop.lon]).addTo(map);
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
    alert("Geolocalizzazione non supportata dal browser");
    return;
  }
  navigator.geolocation.getCurrentPosition(position => {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;
    map.setView([userLat, userLon], 14);

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
      document.getElementById("nearestStop").innerHTML =
        `📍 Fermata più vicina: <strong>${nearest.name}</strong> – <a href="${nearest.url}" target="_blank">Vai al link</a>`;
    }
  });
});
