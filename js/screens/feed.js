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

  const animalEl = container.querySelector('#feed-animal');
  const faceEl = container.querySelector('#animal-face');
  const coinsEl = container.querySelector('#feed-coins');

  function handleReaction(food) {
    const reaction = getReaction(animal, food);

    if (reaction === 'come') {
      faceEl.textContent = '😋';
      playEatSound();
      const newCoins = callbacks.onCoinEarned();
      coinsEl.textContent = String(newCoins);
    } else if (reaction === 'rechaza') {
      faceEl.textContent = '😝';
      playRejectSound();
    } else {
      faceEl.textContent = '🥰';
      playSpecialSound();
    }

    setTimeout(() => {
      faceEl.textContent = '';
    }, 1200);
  }

  container.querySelectorAll('.food-icon').forEach((foodEl) => {
    setupDragAndDrop(foodEl, animalEl, () => handleReaction(foodEl.dataset.food));
  });
}

function setupDragAndDrop(foodEl, targetEl, onDrop) {
  let dragging = false;
  let originalParent = null;
  let originalNextSibling = null;

  foodEl.addEventListener('pointerdown', (event) => {
    dragging = true;
    originalParent = foodEl.parentNode;
    originalNextSibling = foodEl.nextSibling;
    foodEl.classList.add('dragging');
    document.body.appendChild(foodEl);
    moveTo(event.clientX, event.clientY);
    foodEl.setPointerCapture(event.pointerId);
  });

  foodEl.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    moveTo(event.clientX, event.clientY);
  });

  foodEl.addEventListener('pointerup', (event) => {
    if (!dragging) return;
    dragging = false;
    foodEl.classList.remove('dragging');
    foodEl.style.left = '';
    foodEl.style.top = '';

    const targetRect = targetEl.getBoundingClientRect();
    const dropped = (
      event.clientX >= targetRect.left &&
      event.clientX <= targetRect.right &&
      event.clientY >= targetRect.top &&
      event.clientY <= targetRect.bottom
    );

    if (originalNextSibling) {
      originalParent.insertBefore(foodEl, originalNextSibling);
    } else {
      originalParent.appendChild(foodEl);
    }

    if (dropped) {
      onDrop();
    }
  });

  function moveTo(x, y) {
    foodEl.style.left = `${x - foodEl.offsetWidth / 2}px`;
    foodEl.style.top = `${y - foodEl.offsetHeight / 2}px`;
  }
}
