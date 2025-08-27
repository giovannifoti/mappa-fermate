document.addEventListener('DOMContentLoaded', () => {
  // ------------------ Map layers ------------------
  const lightLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap & CARTO', subdomains: 'abcd', maxZoom: 19 });
  const darkLayer  = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap & CARTO', subdomains: 'abcd', maxZoom: 19 });

  const map = L.map('map', { center:[38.1938,15.5540], zoom:13, layers:[lightLayer] });
  const markerCluster = L.markerClusterGroup();
  map.addLayer(markerCluster);

  // ------------------ Dark Mode ------------------
  const darkBtn = document.getElementById('darkToggle');
  darkBtn.addEventListener('click', () => {
    const dark = document.body.classList.toggle('dark');
    if(dark){ map.removeLayer(lightLayer); map.addLayer(darkLayer); }
    else{ map.removeLayer(darkLayer); map.addLayer(lightLayer); }
    renderFavoritesList();
  });

  // ------------------ Favorites ------------------
  let favorites = JSON.parse(localStorage.getItem('favorites'))||[];
  const stops = [], markers = [];
  function isFavorite(id){ return favorites.includes(id.toString()); }
  function toggleFavorite(id){
    const idx = favorites.indexOf(id.toString());
    if(idx>-1) favorites.splice(idx,1); else favorites.push(id.toString());
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }

  // ------------------ Lazy load fermate ------------------
  let stopsLoaded = false;
  function loadStops(callback){
    if(stopsLoaded){ callback(); return; }
    fetch('./stops_fixed.json').then(r=>r.json()).then(data=>{
      data.filter(s=>s&&s.name&&s.lat&&s.lon).forEach((s,idx)=>{
        s.id = s.id??idx; s.zone = s.zone??'centro';
        stops.push(s);
        const m = L.marker([s.lat,s.lon],{title:s.name});
        m.normalizedName = s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        markers.push(m);
      });
      stopsLoaded=true;
      callback();
    });
  }

  // ------------------ Render marker on demand ------------------
  function renderMarkers(mks){ markerCluster.clearLayers(); mks.forEach(m=>markerCluster.addLayer(m)); }

  // ------------------ Search ------------------
  const input = document.getElementById('searchInput'), suggestions = document.getElementById('suggestions');
  input.addEventListener('input', ()=>{
    const q = input.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    suggestions.innerHTML='';
    loadStops(()=>{
      if(!q){ renderMarkers(markers); return; }
      const matched = markers.filter(m=>m.normalizedName.includes(q));
      matched.slice(0,10).forEach(m=>{
        const div=document.createElement('div'); div.textContent=m.options.title;
        div.addEventListener('click', ()=>{
          map.setView(m.getLatLng(),17); m.openPopup(); suggestions.innerHTML='';
        });
        suggestions.appendChild(div);
      });
      renderMarkers(matched);
      if(matched.length) map.fitBounds(L.featureGroup(matched).getBounds().pad(0.2));
    });
  });

  // ------------------ Locate nearest ------------------
  const locateBtn = document.getElementById('locateBtn'), infoBox = document.getElementById('nearestStop');
  let locating = false;
  locateBtn.addEventListener('click', ()=>{
    if(locating){ locating=false; locateBtn.classList.remove('active'); infoBox.style.display='none'; return; }
    loadStops(()=>{
      locating=true; infoBox.style.display='block'; infoBox.textContent='📡 Caricamento...';
      if(!navigator.geolocation){ infoBox.textContent='❌ Geolocalizzazione non supportata'; locating=false; return; }
      navigator.geolocation.getCurrentPosition(({coords})=>{
        locateBtn.classList.add('active');
        const {latitude:latU,longitude:lonU}=coords;
        let nearest=null,minDist=Infinity;
        stops.forEach(s=>{ const d=map.distance([s.lat,s.lon],[latU,lonU]); if(d<minDist){minDist=d; nearest=s;} });
        if(nearest) infoBox.innerHTML=`📍 <strong>${nearest.name}</strong><br><a href="${nearest.url}" target="_blank">Vai al link</a>`;
        else infoBox.textContent='❌ Nessuna fermata trovata';
      }, ()=>{ infoBox.textContent='❌ Errore nella geolocalizzazione'; locating=false; });
    });
  });

  // ------------------ Favorites popup ------------------
  const openFav = document.getElementById('open-favorites'), closeFav = document.getElementById('close-favorites'), favPopup=document.getElementById('favorites-popup');
  openFav.addEventListener('click',()=>{ renderFavoritesList(); favPopup.style.display='block'; });
  closeFav.addEventListener('click',()=>{ favPopup.style.display='none'; });

  function renderFavoritesList(){
    const ul=document.getElementById('favorites-list'); ul.innerHTML='';
    const zones={nord:[],centro:[],sud:[]};
    stops.forEach(s=>{ if(!s.id||!isFavorite(s.id)) return; zones[s.zone||'centro'].push(s); });
    Object.keys(zones).forEach(z=>{
      const stopsInZone=zones[z]; if(!stopsInZone.length) return;
      const h3=document.createElement('h3'); h3.textContent=z.charAt(0).toUpperCase()+z.slice(1);
      h3.style.color=document.body.classList.contains('dark')?'#ffd54f':'#003366';
      ul.appendChild(h3);
      stopsInZone.forEach(s=>{
        const li=document.createElement('li');
        const a=document.createElement('a'); a.href=s.url; a.target='_blank'; a.textContent=s.name; a.style.color=document.body.classList.contains('dark')?'#ffd54f':'#003366'; li.appendChild(a);
        const btn=document.createElement('button'); btn.textContent='❌'; btn.className='remove-fav';
        btn.addEventListener('click',()=>{ favorites=favorites.filter(f=>f!==s.id.toString()); localStorage.setItem('favorites',JSON.stringify(favorites)); renderFavoritesList(); });
        li.appendChild(btn); ul.appendChild(li);
      });
    });
    const h2=document.querySelector('#favorites-popup h2'); if(h2) h2.style.color=document.body.classList.contains('dark')?'#ffd54f':'#003366';
  }

  // ------------------ Star click ------------------
  document.addEventListener('click',e=>{
    const el=e.target.closest('.popup-star'); if(!el) return;
    toggleFavorite(el.dataset.id);
    el.classList.toggle('fav-on',isFavorite(el.dataset.id));
    el.classList.toggle('fav-off',!isFavorite(el.dataset.id));
    el.classList.add('animate'); el.addEventListener('animationend',()=>el.classList.remove('animate'),{once:true});
  });
});
