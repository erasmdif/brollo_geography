// dashboard.js
export function renderSidebar (data, layerMap, cityMap, map) {

  const { provinces = {}, cities = {}, persons = [] } = data;
  const side = document.getElementById('results');
  side.innerHTML = '';

  /* ---- helper <details>/<summary> ------------------------------- */
  function makeModule (title, open = false) {
    const det = document.createElement('details');
    if (open) det.open = true;
    const sum = document.createElement('summary');
    sum.textContent = title;
    det.appendChild(sum);
    side.appendChild(det);
    return det;
  }

  /* =============================================================== *
   *                       PROVINCES                                 *
   * =============================================================== */
  const detProv = makeModule(`Provinces (${Object.keys(provinces).length})`, true);

  Object.entries(provinces).forEach(([prov, translits]) => {
    const wrap = document.createElement('div');  wrap.className = 'entry-block';

    const h = document.createElement('h4');
    h.textContent = prov;
    h.onclick = () => { const lyr = layerMap[prov]; if (lyr) map.fitBounds(lyr.getBounds()); };
    wrap.appendChild(h);

    Object.entries(translits).forEach(([tr, arr]) => {
      const list = Array.isArray(arr) ? arr : (arr ? [arr] : []);   // 🛡️ robusto
      const p = document.createElement('p');
      p.innerHTML =
        `<strong>${tr}</strong>:<br>${list.map(a=>`p.${a.page} l.${a.line} e.${a.entry}`).join('<br>')}`;
      wrap.appendChild(p);
    });
    detProv.appendChild(wrap);
  });

  /* =============================================================== *
   *                       CITIES                                    *
   * =============================================================== */
  const detCity = makeModule(`Cities (${Object.keys(cities).length})`);

  Object.entries(cities).forEach(([city, translits]) => {
    const wrap = document.createElement('div'); wrap.className = 'entry-block';

    const h = document.createElement('h4');
    h.textContent = city;
    h.onclick = () => { const ll = cityMap[city]; if (ll) map.setView(ll, 8); };
    wrap.appendChild(h);

    Object.entries(translits).forEach(([tr, arr]) => {
      const list = Array.isArray(arr) ? arr : (arr ? [arr] : []);
      const p = document.createElement('p');
      p.innerHTML =
        `<strong>${tr}</strong>:<br>${list.map(a=>`p.${a.page} l.${a.line} e.${a.entry}`).join('<br>')}`;
      wrap.appendChild(p);
    });
    detCity.appendChild(wrap);
  });

  /* =============================================================== *
   *                       PERSONS                                   *
   * =============================================================== */
  const detPers = makeModule(`Persons (${persons.length})`);

  persons.forEach(pr => {
    const wrap = document.createElement('div'); wrap.className = 'entry-block';

    const h = document.createElement('h4'); h.textContent = pr.name; wrap.appendChild(h);

    const p = document.createElement('p');
    p.innerHTML = `
      ${pr.chinese || ''} ${pr.chinese_2 || ''}<br>
      <em>${pr.dates || ''}</em><br>
      Place: ${pr.place}
    `;
    wrap.appendChild(p);
    detPers.appendChild(wrap);
  });
}