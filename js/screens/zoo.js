function renderZooScreen(container, coins, onSelectAnimal) {
  container.innerHTML = `
    <div class="zoo-map">
      <div class="coins-badge">🪙 <span id="zoo-coins">${coins}</span></div>
      <img class="zoo-map-image" src="${ZOO_MAP_IMAGE}" alt="Mapa del zoo">
      ${ANIMALS.map((animal) => {
        const hotspot = ZOO_HOTSPOTS[animal];
        return `
          <button
            class="zoo-hotspot"
            data-animal="${animal}"
            aria-label="${ANIMAL_LABELS[animal]}"
            style="left: ${hotspot.left}%; top: ${hotspot.top}%; width: ${hotspot.width}%; height: ${hotspot.height}%;"
          ></button>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.zoo-hotspot').forEach((hotspotEl) => {
    hotspotEl.addEventListener('click', () => {
      onSelectAnimal(hotspotEl.dataset.animal);
    });
  });
}
