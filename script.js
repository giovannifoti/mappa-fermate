
const map = L.map('map').setView([38.1938, 15.5540], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map);

let userId = localStorage.getItem("userId");
if (!userId) {
  userId = Math.random().toString(36).substr(2, 9);
  localStorage.setItem("userId", userId);
}
document.getElementById("userIdDisplay").innerText = userId;

let favorites = JSON.parse(localStorage.getItem("favorites_" + userId)) || [];

function saveFavorites() {
  localStorage.setItem("favorites_" + userId, JSON.stringify(favorites));
  renderFavorites();
}

function renderFavorites() {
  const list = document.getElementById("favoritesList");
  list.innerHTML = '';
  favorites.forEach(fav => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="\${fav.link}" target="_blank">\${fav.name}</a>`;
    list.appendChild(li);
  });
}

fetch('stops_fixed.json')
  .then(res => res.json())
  .then(data => {
    data.forEach(stop => {
      const marker = L.marker([stop.lat, stop.lon]).addTo(map);
      marker.bindPopup(\`
        <b>\${stop.name}</b><br/>
        <a href="\${stop.url}" target="_blank">🚏 Vedi linee</a><br/>
        <button onclick='addFavorite("\${stop.name}", "\${stop.url}")'>⭐ Preferito</button>
      \`);
    });
  });

function addFavorite(name, link) {
  if (!favorites.find(f => f.name === name)) {
    favorites.push({ name, link });
    saveFavorites();
  }
}

document.getElementById("locateBtn").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      map.setView([latitude, longitude], 15);

      fetch('stops_fixed.json')
        .then(res => res.json())
        .then(data => {
          let nearest = null;
          let minDist = Infinity;
          data.forEach(stop => {
            const dist = Math.sqrt(
              Math.pow(stop.lat - latitude, 2) + Math.pow(stop.lon - longitude, 2)
            );
            if (dist < minDist) {
              minDist = dist;
              nearest = stop;
            }
          });
          if (nearest) {
            alert("🚏 Fermata più vicina: " + nearest.name + "\n" + nearest.url);
          }
        });
    });
  } else {
    alert("Geolocalizzazione non supportata");
  }
});

renderFavorites();
