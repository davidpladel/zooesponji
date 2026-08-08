function renderFeedScreen(container, animal, coins, callbacks) {
  container.innerHTML = `
    <div class="feed-screen">
      <button class="back-button" id="back-btn">⬅️ Volver</button>
      <div class="coins-badge">🪙 <span id="feed-coins">${coins}</span></div>
      <h2>${ANIMAL_LABELS[animal]}</h2>
      <div class="feed-animal" id="feed-animal">
        <span id="animal-emoji">${ANIMAL_EMOJI[animal]}</span>
        <span class="feed-animal-face" id="animal-face"></span>
      </div>
      <div class="food-tray" id="food-tray">
        ${FOODS.map((food) => `
          <div class="food-icon" data-food="${food}">${FOOD_EMOJI[food]}</div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelector('#back-btn').addEventListener('click', callbacks.onBack);
}
