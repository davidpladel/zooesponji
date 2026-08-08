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
          <div class="food-icon" data-food="${food}">
            <span class="sprite-slot" id="food-sprite-${food}">${FOOD_EMOJI[food]}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelector('#back-btn').addEventListener('click', callbacks.onBack);

  const animalSpriteEl = container.querySelector('#animal-emoji');
  const animalEl = container.querySelector('#feed-animal');
  const faceEl = container.querySelector('#animal-face');
  const coinsEl = container.querySelector('#feed-coins');

  function setAnimalState(state) {
    const stateImages = ANIMAL_STATE_IMAGE[animal] || {};
    const src = stateImages[state] || stateImages.normal;
    if (src) {
      trySwapSprite(animalSpriteEl, src);
    }
  }

  setAnimalState('normal');
  FOODS.forEach((food) => {
    trySwapSprite(container.querySelector(`#food-sprite-${food}`), FOOD_IMAGE[food]);
  });

  function handleReaction(food) {
    const reaction = getReaction(animal, food);

    if (reaction === 'come') {
      faceEl.textContent = '😋';
      playEatSound();
      setAnimalState('come');
      const newCoins = callbacks.onCoinEarned();
      coinsEl.textContent = String(newCoins);
    } else if (reaction === 'rechaza') {
      faceEl.textContent = '😝';
      playRejectSound();
      setAnimalState('rechaza');
    } else {
      faceEl.textContent = '🥰';
      playSpecialSound();
      setAnimalState('especial');
    }

    setTimeout(() => {
      faceEl.textContent = '';
      setAnimalState('normal');
    }, 1200);
  }

  container.querySelectorAll('.food-icon').forEach((foodEl) => {
    setupDragAndDrop(foodEl, animalEl, () => handleReaction(foodEl.dataset.food));
  });
}

const DROP_HIT_MARGIN_PX = 40;

function expandRect(rect, margin) {
  return {
    left: rect.left - margin,
    right: rect.right + margin,
    top: rect.top - margin,
    bottom: rect.bottom + margin,
  };
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function setupDragAndDrop(foodEl, targetEl, onDrop) {
  let dragging = false;
  let originalParent = null;
  let originalNextSibling = null;

  foodEl.addEventListener('pointerdown', (event) => {
    if (dragging) return;
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

  foodEl.addEventListener('pointerup', () => {
    if (!dragging) return;

    const dropped = rectsOverlap(foodEl.getBoundingClientRect(), expandRect(targetEl.getBoundingClientRect(), DROP_HIT_MARGIN_PX));

    restoreAfterDrag();

    if (dropped) {
      onDrop();
    }
  });

  foodEl.addEventListener('pointercancel', () => {
    if (!dragging) return;
    restoreAfterDrag();
  });

  function restoreAfterDrag() {
    dragging = false;
    foodEl.classList.remove('dragging');
    foodEl.style.left = '';
    foodEl.style.top = '';

    if (originalNextSibling) {
      originalParent.insertBefore(foodEl, originalNextSibling);
    } else {
      originalParent.appendChild(foodEl);
    }
  }

  function moveTo(x, y) {
    foodEl.style.left = `${x - foodEl.offsetWidth / 2}px`;
    foodEl.style.top = `${y - foodEl.offsetHeight / 2}px`;
  }
}
