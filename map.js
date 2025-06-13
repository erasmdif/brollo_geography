// map.js
import { renderSidebar }   from './dashboard.js';
import { createSlider }    from './slider.js';
import { addPersonsLayer } from './persons.js';

let map, geoLayer, cityLayer, personsLayer;
let allCsvData = [], peopleData = [];
let layerMap = {}, cityMap = {};

async function initMap () {

  /* 1. MAPPA BASE -------------------------------------------------- */
  map = L.map('map').setView([35, 105], 5);
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    { maxZoom: 18, attribution: '© OpenStreetMap & CartoDB' }
  ).addTo(map);

  /* 2. CSV ATTESTAZIONI ------------------------------------------- */
  const attCsv = await fetch('data/attestation.csv').then(r => r.text());
  allCsvData   = Papa.parse(attCsv, {
    header          : true,
    transformHeader : h => h.trim(),
    skipEmptyLines  : true
  }).data;

  /* 3. CSV PERSONE ------------------------------------------------- */
  const persCsv = await fetch('data/persons.csv').then(r => r.text());
  peopleData    = Papa.parse(persCsv, {
    header          : true,
    transformHeader : h => h.trim(),
    skipEmptyLines  : true
  }).data;                                   // ⬆️  **niente const qui!**

  /* 4. LAYER PROVINCE --------------------------------------------- */
  const provincesGeojson = await fetch('data/provinces.geojson').then(r => r.json());
  geoLayer = L.geoJSON(provincesGeojson, {
    style: () => ({ weight: 1, color: '#333', fillOpacity: 0.8 }),
    onEachFeature: (feat, lyr) => {
      const n = feat.properties.NAME_PY?.trim();
      if (n) layerMap[n] = lyr;
    }
  }).addTo(map);

  /* 5. LAYER CITTÀ ------------------------------------------------- */
  const citiesGeojson = await fetch('data/cities.geojson').then(r => r.json());
  cityLayer = L.geoJSON(citiesGeojson, {
    pointToLayer: (feat, latlng) => {
      const name  = feat.properties.name?.trim();
      const count = allCsvData.filter(d => d.name?.trim() === name).length;

      const size = 20 + 2 * count;           // grandezza proporzionale
      const iconHtml = `
      <div class="city-icon-wrapper" style="
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        background:white;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow: 0 0 4px rgba(0,0,0,0.2);
      ">
        <img src="icon.svg" style="
          width:${size * 0.7}px;
          height:${size * 0.7}px;
          border-radius:50%;
        " />
      </div>
    `;
    
    const icon = L.divIcon({
      html      : iconHtml,
      className : '', // evita stile di default Leaflet
      iconSize  : [size, size],
      iconAnchor: [size / 2, size / 2]
    });
    
    return L.marker(latlng, { icon });
    }
  }).addTo(map);

  /* 6. LAYER PERSONE ---------------------------------------------- */
  personsLayer = addPersonsLayer(map, citiesGeojson, peopleData);

  /* 7. CONTROLLO LAYER -------------------------------------------- */
  const overlayMaps = { Provinces: geoLayer, Cities: cityLayer, Persons: personsLayer };
  const lc = L.control.layers(null, overlayMaps, { collapsed:false }).addTo(map);
  document.getElementById('layers-here').appendChild(lc.getContainer());

  /* 8. SLIDER + PRIMO RENDER -------------------------------------- */
  createSlider(1, 600, (min, max) => updateMapAndSidebar(min, max));
  updateMapAndSidebar(1, 600);
}

/* ---------- util gradiente rosso --------------------------------- */
function getRedGradientColor(count, maxCount) {
  if (count === 0) return '#add8e6';
  const t = count / maxCount;
  const r = Math.floor(255 - t * 100);   // 255 → 155
  const g = Math.floor(229 - t * 229);   // 229 →   0
  const b = g;                           // stesso per B
  return `rgb(${r},${g},${b})`;
}

/* ---------- update mappa + sidebar ------------------------------- */
function updateMapAndSidebar(minPage, maxPage) {

  const frequencyMap  = {};
  const dataByProvince = {};
  const dataByCity     = {};

  allCsvData.forEach(row => {
    const name = row.name?.trim();
    const page = +row.page;
    if (!name || isNaN(page) || page < minPage || page > maxPage) return;

    /* ---- province ---- */
    frequencyMap[name] = (frequencyMap[name] || 0) + 1;
    const translit = row.attested_as?.trim() || 'Unknown';
    dataByProvince[name]            = dataByProvince[name]            || {};
    dataByProvince[name][translit]  = dataByProvince[name][translit]  || [];
    dataByProvince[name][translit].push({
      chinese_name: row.chinese_name,
      page : row.page,
      line : row.line,
      entry: row.entry
    });

    /* ---- città (solo se type === city) ---- */
    if (row.type?.trim() === 'city') {
      dataByCity[name]           = dataByCity[name]          || {};
      dataByCity[name][translit] = dataByCity[name][translit]|| [];
      dataByCity[name][translit].push({
        page : row.page,
        line : row.line,
        entry: row.entry
      });
    }
  });

  /* ---- stile province ------------------------------------------- */
  const maxVal = Math.max(...Object.values(frequencyMap), 1);
  geoLayer.setStyle(f => {
    const n = f.properties.NAME_PY?.trim();
    const c = frequencyMap[n] || 0;
    return { fillColor:getRedGradientColor(c,maxVal), weight:1, color:'#333', fillOpacity:0.8 };
  });

  /* ---- etichette province -------------------------------------- */
  document.querySelectorAll('.label-text').forEach(el=>el.remove());
  geoLayer.eachLayer(lyr => {
    const n = lyr.feature.properties.NAME_PY?.trim();
    const c = frequencyMap[n] || 0;
    if (c === 0) return;
    const cn = dataByProvince[n]?.[Object.keys(dataByProvince[n])[0]]?.[0]?.chinese_name || '';
    const ic = L.divIcon({ className:'label-text', html:`<strong>${n}</strong><br>${cn}`, iconSize:[100,40] });
    L.marker(lyr.getBounds().getCenter(), { icon:ic, interactive:false }).addTo(map);
  });

  /* ---- sidebar -------------------------------------------------- */
  renderSidebar(
    { provinces:dataByProvince, cities:dataByCity, persons:peopleData },
    layerMap, cityMap, map
  );
}

initMap();