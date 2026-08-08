function renderZooScreen(container, coins, onSelectAnimal) {
  container.innerHTML = `
    <div class="zoo-screen">
      <div class="coins-badge">🪙 <span id="zoo-coins">${coins}</span></div>
      ${ANIMALS.map((animal) => `
        <div class="cage" data-animal="${animal}">
          <div class="cage-emoji">${ANIMAL_EMOJI[animal]}</div>
          <div class="cage-label">Jaula de: ${ANIMAL_LABELS[animal]}</div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.cage').forEach((cageEl) => {
    cageEl.addEventListener('click', () => {
      onSelectAnimal(cageEl.dataset.animal);
    });
  });
}
