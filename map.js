let map, provinceLayer, cityLayer, allCsvData = [], layerMap = {}, geojsonData, citiesData;
let cityMarkers = [];
let maxPageValue = 600;

async function initMap() {
  map = L.map('map').setView([35, 105], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> contributors',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);  

  // Carica CSV
  const csvText = await fetch('attestation.csv').then(res => res.text());
  allCsvData = Papa.parse(csvText, { header: true }).data;

  // Carica provinces.geojson
  geojsonData = await fetch('provinces.geojson').then(res => res.json());
  provinceLayer = L.geoJSON(geojsonData, {
    style: () => ({ weight: 1, color: '#333', fillOpacity: 0.8 }),
    onEachFeature: (feature, layer) => {
      const name = feature.properties.NAME_PY?.trim();
      if (name) layerMap[name] = layer;
    }
  });

  // Carica cities.geojson
  citiesData = await fetch('cities.geojson').then(res => res.json());

  cityLayer = L.layerGroup();

  // Crea slider
  const slider = document.getElementById('pageSlider');
  noUiSlider.create(slider, {
    start: [1, maxPageValue],
    connect: true,
    range: {
      'min': 1,
      'max': maxPageValue
    },
    step: 1
  });

  const rangeValue = document.getElementById('rangeValue');
  slider.noUiSlider.on('update', function (values) {
    const minPage = Math.round(values[0]);
    const maxPage = Math.round(values[1]);
    rangeValue.innerText = `${minPage}–${maxPage}`;
    updateMapAndSidebar(minPage, maxPage);
  });

  // Layer toggle
  document.getElementById('toggleProvinces').addEventListener('change', function () {
    this.checked ? provinceLayer.addTo(map) : map.removeLayer(provinceLayer);
  });

  document.getElementById('toggleCities').addEventListener('change', function () {
    this.checked ? cityLayer.addTo(map) : map.removeLayer(cityLayer);
  });

  provinceLayer.addTo(map);
  cityLayer.addTo(map);
  updateMapAndSidebar(1, maxPageValue);
}

function getRedGradientColor(count, maxCount) {
  if (count === 0) return '#add8e6';
  const t = count / maxCount;
  const r = Math.floor(255 - t * 100);
  const g = Math.floor(229 - t * 229);
  const b = Math.floor(229 - t * 229);
  return `rgb(${r},${g},${b})`;
}

function updateMapAndSidebar(minPage, maxPage) {
  const freq = {};
  const cityFreq = {};
  const dataByProvince = {};

  allCsvData.forEach(row => {
    const name = row.name?.trim();
    const city = row.city?.trim();
    const page = parseInt(row.page);
    if (isNaN(page) || page < minPage || page > maxPage) return;

    if (name) {
      freq[name] = (freq[name] || 0) + 1;
      if (!dataByProvince[name]) dataByProvince[name] = {};
      const translit = row.attested_as?.trim() || 'Unknown';
      if (!dataByProvince[name][translit]) dataByProvince[name][translit] = [];
      dataByProvince[name][translit].push({
        chinese_name: row.chinese_name,
        page: row.page,
        line: row.line,
        entry: row.entry
      });
    }

    if (city) cityFreq[city] = (cityFreq[city] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(freq), 1);

  provinceLayer.setStyle(feature => {
    const name = feature.properties.NAME_PY?.trim();
    const count = freq[name] || 0;
    const fill = getRedGradientColor(count, maxCount);
    return {
      fillColor: fill,
      weight: 1,
      color: '#333',
      fillOpacity: 0.8
    };
  });

  // Etichette province
  Object.entries(layerMap).forEach(([name, layer]) => {
    const count = freq[name] || 0;
    if (count === 0) {
      if (layer.label) {
        map.removeLayer(layer.label);
        layer.label = null;
      }
      return;
    }

    const chinese = Object.values(dataByProvince[name] || {})[0]?.[0]?.chinese_name || '';
    const center = layer.getBounds().getCenter();
    if (!layer.label) {
      const divIcon = L.divIcon({
        className: 'label',
        html: `<b>${name}</b><br>(${chinese})`,
        iconSize: [100, 40]
      });
      layer.label = L.marker(center, { icon: divIcon }).addTo(map);
    } else {
      layer.label.setLatLng(center);
    }
  });

// Città filtrate da attestation.csv
cityLayer.clearLayers();

const cityCounts = {}; // nome città → numero attestazioni

allCsvData.forEach(row => {
  if (row.type?.trim() !== 'city') return;
  const name = row.name?.trim();
  if (!name) return;
  cityCounts[name] = (cityCounts[name] || 0) + 1;
});

citiesData.features.forEach(f => {
  const name = f.properties.name?.trim();
  const coords = f.geometry.coordinates;

  const count = cityCounts[name] || 0;
  if (count === 0) return; // mostra solo se ci sono attestazioni

  // Icona custom
  const iconSize = 30 + count * 2; // base size + scalata
  const icon = L.icon({
    iconUrl: 'icon.svg',
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2]
  });

  const marker = L.marker([coords[1], coords[0]], { icon });

  // Buffer (cerchio trasparente sotto il marker)
  const circle = L.circleMarker([coords[1], coords[0]], {
    radius: iconSize / 2,
    color: '#ff6666',
    fillColor: '#ffcccc',
    fillOpacity: 0.3,
    weight: 1
  });

  marker.bindTooltip(name, { permanent: false, direction: 'top' });

  cityLayer.addLayer(circle);
  cityLayer.addLayer(marker);
});

  // Sidebar
  const container = document.getElementById('results');
  container.innerHTML = '';
  Object.entries(dataByProvince).forEach(([province, translits]) => {
    const header = document.createElement('h3');
    header.innerText = province;
    header.style.cursor = 'pointer';
    header.style.color = '#2a4d9b';
    header.onclick = () => {
      const layer = layerMap[province];
      if (layer) map.fitBounds(layer.getBounds());
    };
    container.appendChild(header);

    const chinese = Object.values(translits)[0]?.[0]?.chinese_name || '';
    const subtitle = document.createElement('p');
    subtitle.innerText = `(${chinese})`;
    container.appendChild(subtitle);

    Object.entries(translits).forEach(([translit, entries]) => {
      const block = document.createElement('div');
      block.innerHTML = `<strong>transliterated as</strong> <i>${translit}</i>:<br>` +
        entries.map(e =>
          `page ${e.page}, line ${e.line}, entry: ${e.entry}`
        ).join('<br>');
      block.style.marginBottom = '1em';
      container.appendChild(block);
    });
  });
}

initMap();
