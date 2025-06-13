// persons.js
export function addPersonsLayer (map, citiesGeojson, peopleData) {

  /* ------------------------------------------------------------------ *
   * 1.  INDICIZZAZIONE CITTÀ  →  LatLng                                *
   * ------------------------------------------------------------------ */
  const cityLL = {};
  citiesGeojson.features.forEach(f => {
    const n = f.properties.name?.trim();
    if (n) cityLL[n] = L.latLng(f.geometry.coordinates[1],
                                f.geometry.coordinates[0]);
  });

  /* ------------------------------------------------------------------ *
   * 2.  ICONA CIRCOLARE CON IMMAGINE                                   *
   * ------------------------------------------------------------------ */
  function makeIcon (img, size, extraCls = '') {
    return L.divIcon({
      className : `person-icon ${extraCls}`,
      iconSize  : [size, size],
      html      : `<div style="
                    width:${size}px;height:${size}px;border-radius:50%;
                    overflow:hidden;border:2px solid #fff;
                    box-shadow:0 0 4px #0004;
                    background:url('images/${img}') center/cover;">
                  </div>`
    });
  }

  /* ------------------------------------------------------------------ *
   * 3.  RAGGRUPPA PERSONE PER CITTÀ                                    *
   * ------------------------------------------------------------------ */
  const perCity = {};
  peopleData.forEach(p => {
    const city = p.place?.trim();
    if (!cityLL[city]) return;                // salta se città assente
    perCity[city] = perCity[city] || [];
    perCity[city].push(p);
  });

  /* ------------------------------------------------------------------ *
   * 4.  COSTRUISCI MARKER + LINEA PER OGNI CITTÀ                       *
   * ------------------------------------------------------------------ */
  const everyElem = [];

  Object.entries(perCity).forEach(([city, people]) => {

    const base = cityLL[city];                       // LatLng della città
    const basePt = map.latLngToLayerPoint(base);

    const size   = 50;                               // diametro icona
    const stepPx = size * 0.5;                       // metà sovrapposto
    const fixedOffset = { x: 40, y: -40 };           // sposta NE

    /* -------- line(a) Manhattan che verrà aggiornata al click ------ */
    const line = L.polyline([], {                   // la creiamo vuota ora
      color: '#666', weight: 1.5, dashArray: '2,4', opacity: 0.8
    }).addTo(map);

    /* --------- crea tutti i marker della città --------------------- */
    const markers = people.map((p, idx) => {

      const pt = L.point(
        basePt.x + fixedOffset.x + idx * stepPx,
        basePt.y + fixedOffset.y
      );
      const ll = map.layerPointToLatLng(pt);

      const imgFile = (p.image || '').trim() || 'default.jpg';
      const icon    = makeIcon(imgFile, size);

      const mk = L.marker(ll, {
        icon,
        title: p.name,
        zIndexOffset: 1000 + idx         // il primo è “davanti”
      }).bindPopup(`
          <strong>${p.name}</strong><br>
          ${p.chinese || ''} ${p.chinese_2 || ''}<br>
          <em>${p.dates || ''}</em><br>
          Place: ${city}
      `);

      /* ---- gestione click-to-focus: porta “davanti” il cliccato ---- */
      mk.on('click', () => {
        markers.forEach(m => m.setZIndexOffset(900));  // tutti dietro
        mk.setZIndexOffset(1000);                      // cliccato davanti

        // aggiorna la linea perché parta dal marker principale
        const pLL = mk.getLatLng();
        line.setLatLngs([
          pLL,
          L.latLng(pLL.lat, base.lng),
          base
        ]);
      });

      return mk;
    });

    /* -------- linea iniziale (dal PRIMO marker verso la città) ----- */
    const firstLL = markers[0].getLatLng();
    line.setLatLngs([
      firstLL,
      L.latLng(firstLL.lat, base.lng),
      base
    ]);

    everyElem.push(line, ...markers);
  });

  /* ------------------------------------------------------------------ *
   * 5.  LAYERGROUP FINALE                                              *
   * ------------------------------------------------------------------ */
  return L.layerGroup(everyElem).addTo(map);
}