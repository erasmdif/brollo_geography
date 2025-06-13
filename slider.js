// slider.js
// Crea e gestisce lo slider di pagine. Esporta solo createSlider.

export function createSlider(min, max, onChange) {
  // Trova (o crea) il contenitore
  const container = document.getElementById('slider-container');
  container.innerHTML = '';          // pulisce eventuali slider precedenti

  // Div interno per noUiSlider
  const slider = document.createElement('div');
  slider.id = 'pageSlider';
  container.appendChild(slider);

  // Inizializza noUiSlider
  noUiSlider.create(slider, {
    start: [min, max],
    connect: true,
    range: { min, max },
    step: 1,
    tooltips: [true, true],
    format: {
      to: v => Math.round(v),
      from: v => Number(v)
    }
  });

  // Callback su ogni update
  slider.noUiSlider.on('update', values => {
    const [low, high] = values.map(v => parseInt(v));
    // Aggiorna il testo “1–600”
    const label = document.getElementById('rangeValue');
    if (label) label.innerText = `${low}–${high}`;
    // Propaga verso map.js
    if (typeof onChange === 'function') onChange(low, high);
  });
}