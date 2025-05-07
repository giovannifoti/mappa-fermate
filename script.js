document.addEventListener('DOMContentLoaded', function() {
    let userCode = localStorage.getItem('userCode');
    if (!userCode) {
        userCode = prompt("Inserisci un codice identificativo utente:");
        if (!userCode) {
            userCode = 'user_' + Math.random().toString(36).substr(2, 6);
        }
        localStorage.setItem('userCode', userCode);
    }
    document.getElementById('user-code').textContent = userCode;
    document.getElementById('change-code').addEventListener('click', function() {
        if (confirm("Vuoi cambiare il codice utente?")) {
            let newCode = prompt("Inserisci il nuovo codice utente:");
            if (newCode) {
                localStorage.setItem('userCode', newCode);
                userCode = newCode;
                document.getElementById('user-code').textContent = newCode;
                alert("Nuovo codice utente impostato: " + newCode);
            }
        }
    });

    function getFavorites() {
        let fav = localStorage.getItem('favorites_' + userCode);
        return fav ? JSON.parse(fav) : [];
    }
    function setFavorites(favs) {
        localStorage.setItem('favorites_' + userCode, JSON.stringify(favs));
    }
    function isFavorite(stopName) {
        return getFavorites().includes(stopName);
    }
    function addFavorite(stopName) {
        let fav = getFavorites();
        if (!fav.includes(stopName)) {
            fav.push(stopName);
            setFavorites(fav);
        }
    }
    function removeFavorite(stopName) {
        let fav = getFavorites();
        let idx = fav.indexOf(stopName);
        if (idx > -1) {
            fav.splice(idx, 1);
            setFavorites(fav);
        }
    }

    let map = L.map('map').setView([38.1938, 15.554], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let stopsData = [];
    fetch('stops_fixed.json')
        .then(res => res.json())
        .then(data => {
            stopsData = data;
            stopsData.forEach(stop => {
                let marker = L.marker([stop.lat, stop.lon]).addTo(map);
                let popupContent = `
                    <div><strong>${stop.name}</strong></div>
                    <div><a href="${stop.url}" target="_blank">Apri Dettagli</a></div>
                    <button class="fav-btn" data-name="${stop.name}">
                        <i class="fa-regular fa-heart"></i> Aggiungi ai preferiti
                    </button>`;
                marker.bindPopup(popupContent);
            });
        });

    map.on('popupopen', function(e) {
        let btn = e.popup._contentNode.querySelector('.fav-btn');
        if (!btn) return;
        let stopName = btn.getAttribute('data-name');
        if (isFavorite(stopName)) {
            btn.innerHTML = '<i class="fa-solid fa-heart"></i> Rimuovi dai preferiti';
        } else {
            btn.innerHTML = '<i class="fa-regular fa-heart"></i> Aggiungi ai preferiti';
        }
        btn.onclick = function() {
            if (isFavorite(stopName)) {
                removeFavorite(stopName);
                btn.innerHTML = '<i class="fa-regular fa-heart"></i> Aggiungi ai preferiti';
            } else {
                addFavorite(stopName);
                btn.innerHTML = '<i class="fa-solid fa-heart"></i> Rimuovi dai preferiti';
            }
        };
    });

    document.getElementById('locate-btn').addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                let lat = position.coords.latitude;
                let lon = position.coords.longitude;
                let userLatLng = L.latLng(lat, lon);
                map.flyTo(userLatLng, 14);

                if (stopsData.length > 0) {
                    let nearestStop = null;
                    let minDist = Infinity;
                    stopsData.forEach(stop => {
                        let stopLatLng = L.latLng(stop.lat, stop.lon);
                        let dist = userLatLng.distanceTo(stopLatLng);
                        if (dist < minDist) {
                            minDist = dist;
                            nearestStop = stop;
                        }
                    });
                    if (nearestStop) {
                        document.getElementById('nearest-name').textContent = nearestStop.name;
                        let link = document.getElementById('nearest-link');
                        link.href = nearestStop.url;
                        link.textContent = 'Vai alla fermata';
                    }
                }
            }, function(error) {
                alert("Errore di geolocalizzazione: " + error.message);
            });
        } else {
            alert("Geolocalizzazione non supportata dal browser");
        }
    });
});
