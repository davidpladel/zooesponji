# ZooEsponji MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable browser MVP of ZooEsponji: a zoo map screen to pick an animal, and a feeding screen where dragging food onto the animal triggers a data-driven reaction (eat / reject / special), plays a synthesized sound, and awards a persisted coin.

**Architecture:** Plain HTML/CSS/JS, no frameworks, no bundler, no ES modules — every file is a global-scope `<script>` loaded in order from `index.html`, so it can be opened directly (`file://`) or via a static server with no build step. Two screens are plain DOM swaps inside a single `#app` container. Drag & drop uses Pointer Events (works with mouse and touch). Pure logic (reaction lookup, coin storage) lives in small standalone modules that are also `require`-able from Node for tests, via a `if (typeof module !== 'undefined') module.exports = {...}` guard at the end of the file — this has no effect in the browser and lets Node's `require` load the same file unmodified.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES2020+), Web Audio API, `localStorage`, Node's built-in `node:test` + `node:assert` for the two pure-logic files (no test framework installed).

## Global Constraints

- No frameworks (no React/Vue/etc.), no build step, no bundler — plain `<script>` tags. (spec: Arquitectura técnica)
- DOM + CSS rendering, not Canvas. (spec: Arquitectura técnica)
- Drag & drop implemented with **Pointer Events**, not the native HTML5 Drag & Drop API. (spec: Arquitectura técnica)
- Reaction logic must be data-driven: `js/data.js` holds the animal→food→reaction table; screen code must not contain per-animal `if` branches. (spec: Modelo de datos)
- v1 animals: `leon`, `cabra`. v1 foods: `piedra`, `carne`, `conejo`, `zanahoria`. Reaction table exactly as specified. (spec: Mecánica y contenido)
- +1 coin only on `come` reactions; `rechaza` and `especial` award nothing. (spec: Monedas y persistencia)
- Coins persist via `localStorage`, never reset automatically. (spec: Monedas y persistencia)
- Sounds are synthesized with Web Audio (oscillators), no audio files. One distinct sound per reaction type (`come` / `rechaza` / `especial`). (spec: Sonido)
- Food icons are never consumed/removed — always draggable again. (spec: Mecánica y contenido)
- No automated UI test framework; screens are verified manually in a real browser. Only the two pure-logic files (`data.js`, `coins.js`) get automated tests, using Node's built-in `node:test`/`node:assert` (no npm install). (spec: Testing)
- Images are emoji placeholders for now (`assets/img/` stays empty until real PNGs from the kids); swapping them in later must not require touching JS logic files. (spec: Fuera de alcance)

---

## File Structure

```
index.html
css/style.css
js/data.js
js/coins.js
js/sound.js
js/screens/zoo.js
js/screens/feed.js
js/main.js
tests/data.test.js
tests/coins.test.js
assets/img/            (empty, placeholder dir, .gitkeep)
```

---

### Task 1: Project shell, stylesheet, and data model

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/data.js`
- Create: `tests/data.test.js`
- Create: `assets/img/.gitkeep`

**Interfaces:**
- Consumes: nothing (first task)
- Produces (for later tasks):
  - `ANIMALS` — `string[]`, e.g. `['leon', 'cabra']`
  - `FOODS` — `string[]`, e.g. `['piedra', 'carne', 'conejo', 'zanahoria']`
  - `ANIMAL_LABELS` — `{ [animal: string]: string }`
  - `ANIMAL_EMOJI` — `{ [animal: string]: string }`
  - `FOOD_LABELS` — `{ [food: string]: string }`
  - `FOOD_EMOJI` — `{ [food: string]: string }`
  - `getReaction(animal: string, food: string) => 'come' | 'rechaza' | 'especial'` — throws if the combination isn't defined
  - CSS classes available globally: `#app`, `.coins-badge`, `.back-button`, `.zoo-screen`, `.cage`, `.cage-emoji`, `.cage-label`, `.feed-screen`, `.feed-animal`, `.feed-animal-face`, `.food-tray`, `.food-icon`, `.food-icon.dragging`

- [ ] **Step 1: Create the data model file**

Create `js/data.js`:

```js
const ANIMALS = ['leon', 'cabra'];
const FOODS = ['piedra', 'carne', 'conejo', 'zanahoria'];

const ANIMAL_LABELS = { leon: 'León', cabra: 'Cabra' };
const ANIMAL_EMOJI = { leon: '🦁', cabra: '🐐' };

const FOOD_LABELS = { piedra: 'Piedra', carne: 'Carne', conejo: 'Conejo', zanahoria: 'Zanahoria' };
const FOOD_EMOJI = { piedra: '🪨', carne: '🥩', conejo: '🐇', zanahoria: '🥕' };

const REACTIONS = {
  leon: { carne: 'come', conejo: 'come', piedra: 'rechaza', zanahoria: 'rechaza' },
  cabra: { carne: 'rechaza', conejo: 'especial', piedra: 'come', zanahoria: 'come' },
};

function getReaction(animal, food) {
  const animalReactions = REACTIONS[animal];
  if (!animalReactions || !(food in animalReactions)) {
    throw new Error(`Reacción no definida para animal="${animal}" comida="${food}"`);
  }
  return animalReactions[food];
}

if (typeof module !== 'undefined') {
  module.exports = {
    ANIMALS,
    FOODS,
    ANIMAL_LABELS,
    ANIMAL_EMOJI,
    FOOD_LABELS,
    FOOD_EMOJI,
    REACTIONS,
    getReaction,
  };
}
```

- [ ] **Step 2: Write the failing tests for the reaction table**

Create `tests/data.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { getReaction } = require('../js/data.js');

test('león come carne', () => {
  assert.strictEqual(getReaction('leon', 'carne'), 'come');
});

test('león come conejo', () => {
  assert.strictEqual(getReaction('leon', 'conejo'), 'come');
});

test('león rechaza piedra', () => {
  assert.strictEqual(getReaction('leon', 'piedra'), 'rechaza');
});

test('león rechaza zanahoria', () => {
  assert.strictEqual(getReaction('leon', 'zanahoria'), 'rechaza');
});

test('cabra rechaza carne', () => {
  assert.strictEqual(getReaction('cabra', 'carne'), 'rechaza');
});

test('cabra reacción especial con conejo', () => {
  assert.strictEqual(getReaction('cabra', 'conejo'), 'especial');
});

test('cabra come piedra', () => {
  assert.strictEqual(getReaction('cabra', 'piedra'), 'come');
});

test('cabra come zanahoria', () => {
  assert.strictEqual(getReaction('cabra', 'zanahoria'), 'come');
});

test('combinación no definida lanza error', () => {
  assert.throws(() => getReaction('leon', 'pizza'));
});
```

- [ ] **Step 3: Run the tests and verify they pass**

Run: `node --test tests/data.test.js`
Expected: `# pass 9`, `# fail 0`

(These tests should pass immediately since `data.js` is written correctly in Step 1 — this confirms the reaction table matches the spec table exactly, which is the point of the test.)

- [ ] **Step 4: Create the stylesheet**

Create `css/style.css`:

```css
:root {
  --bg: #e8f5e9;
  --accent: #33691e;
  --cage-bg: #d7ccc8;
  --cage-border: #795548;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: var(--bg);
  min-height: 100vh;
}

#app {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.coins-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #fff;
  border-radius: 20px;
  padding: 6px 14px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.back-button {
  position: absolute;
  top: 12px;
  left: 12px;
  background: #fff;
  border: none;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.zoo-screen {
  padding: 70px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100vh;
}

.cage {
  background: var(--cage-bg);
  border: 4px dashed var(--cage-border);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.cage-emoji {
  font-size: 64px;
}

.cage-label {
  font-weight: 600;
  color: var(--accent);
}

.feed-screen {
  padding: 70px 16px 16px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.feed-animal {
  font-size: 120px;
  position: relative;
  touch-action: none;
}

.feed-animal-face {
  position: absolute;
  top: -20px;
  right: -10px;
  font-size: 40px;
}

.food-tray {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.food-icon {
  font-size: 48px;
  background: #fff;
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  cursor: grab;
  touch-action: none;
  user-select: none;
  position: relative;
}

.food-icon.dragging {
  position: fixed;
  z-index: 100;
  pointer-events: none;
  transform: scale(1.2);
}
```

- [ ] **Step 5: Create the page shell**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZooEsponji</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="app"></div>

  <script src="js/data.js"></script>
  <script src="js/coins.js"></script>
  <script src="js/sound.js"></script>
  <script src="js/screens/zoo.js"></script>
  <script src="js/screens/feed.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

Note: the five `<script src>` files after `data.js` don't exist yet (created in later tasks) — the page will show a blank `#app` and a 404 in the browser console for the missing files until Task 6 finishes. That's expected at this point.

- [ ] **Step 6: Create the placeholder assets folder**

Create `assets/img/.gitkeep` (empty file, so the empty directory is tracked by git).

- [ ] **Step 7: Commit**

```bash
git add index.html css/style.css js/data.js tests/data.test.js assets/img/.gitkeep
git commit -m "feat: add project shell, stylesheet, and reaction data model"
```

---

### Task 2: Coins module with persistence tests

**Files:**
- Create: `js/coins.js`
- Create: `tests/coins.test.js`

**Interfaces:**
- Consumes: nothing directly (operates on a `storage` argument matching the `Storage` interface: `getItem(key) => string|null`, `setItem(key, value)`)
- Produces (for later tasks):
  - `COINS_KEY` — `string`, the localStorage key used
  - `getCoins(storage) => number` — returns 0 if nothing stored or the stored value is invalid
  - `addCoin(storage) => number` — increments by 1, persists, returns the new total

- [ ] **Step 1: Write the failing tests**

Create `tests/coins.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { COINS_KEY, getCoins, addCoin } = require('../js/coins.js');

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  };
}

test('getCoins con storage vacío devuelve 0', () => {
  const storage = createFakeStorage();
  assert.strictEqual(getCoins(storage), 0);
});

test('addCoin incrementa desde 0 y persiste', () => {
  const storage = createFakeStorage();
  assert.strictEqual(addCoin(storage), 1);
  assert.strictEqual(addCoin(storage), 2);
  assert.strictEqual(getCoins(storage), 2);
});

test('getCoins con valor corrupto en storage devuelve 0', () => {
  const storage = createFakeStorage();
  storage.setItem(COINS_KEY, 'no-es-numero');
  assert.strictEqual(getCoins(storage), 0);
});

test('getCoins con valor negativo devuelve 0', () => {
  const storage = createFakeStorage();
  storage.setItem(COINS_KEY, '-5');
  assert.strictEqual(getCoins(storage), 0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/coins.test.js`
Expected: FAIL — `Cannot find module '../js/coins.js'`

- [ ] **Step 3: Implement the coins module**

Create `js/coins.js`:

```js
const COINS_KEY = 'zooesponji_coins';

function getCoins(storage) {
  const raw = storage.getItem(COINS_KEY);
  const value = parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function addCoin(storage) {
  const next = getCoins(storage) + 1;
  storage.setItem(COINS_KEY, String(next));
  return next;
}

if (typeof module !== 'undefined') {
  module.exports = { COINS_KEY, getCoins, addCoin };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/coins.test.js`
Expected: `# pass 4`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add js/coins.js tests/coins.test.js
git commit -m "feat: add coins module with localStorage persistence"
```

---

### Task 3: Sound module (Web Audio synth)

**Files:**
- Create: `js/sound.js`
- Modify: `index.html` (no change needed — `js/sound.js` is already referenced in Task 1's `<script>` list)

**Interfaces:**
- Consumes: `window.AudioContext` / `window.webkitAudioContext` (browser only — this file is never `require`d from Node, so it has no `module.exports` guard)
- Produces (for later tasks):
  - `playEatSound() => void`
  - `playRejectSound() => void`
  - `playSpecialSound() => void`

- [ ] **Step 1: Implement the sound module**

Create `js/sound.js`:

```js
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(frequency, duration, type) {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

function playEatSound() {
  playTone(660, 0.15, 'sine');
  setTimeout(() => playTone(880, 0.15, 'sine'), 100);
}

function playRejectSound() {
  playTone(180, 0.25, 'sawtooth');
}

function playSpecialSound() {
  playTone(520, 0.12, 'triangle');
  setTimeout(() => playTone(700, 0.12, 'triangle'), 90);
  setTimeout(() => playTone(900, 0.18, 'triangle'), 180);
}
```

- [ ] **Step 2: Manually verify in the browser console**

Open `index.html` directly in a browser (double-click the file, or `start index.html` on Windows). Open the developer console (F12) and run:

```js
playEatSound()
```

Expected: you hear a short two-note rising chime. Then run `playRejectSound()` — expected: a short low buzzy tone. Then `playSpecialSound()` — expected: a three-note rising triangle-wave sound, distinct from the other two.

(The console will also show 404s for `js/screens/zoo.js`, `js/screens/feed.js`, `js/main.js` — expected until Task 6.)

- [ ] **Step 3: Commit**

```bash
git add js/sound.js
git commit -m "feat: add synthesized sound effects for reactions"
```

---

### Task 4: Zoo map screen

**Files:**
- Create: `js/screens/zoo.js`
- Create: `js/main.js`

**Interfaces:**
- Consumes: `ANIMAL_EMOJI`, `ANIMAL_LABELS` (from `js/data.js`, Task 1), `getCoins` (from `js/coins.js`, Task 2)
- Produces (for later tasks):
  - `renderZooScreen(container: HTMLElement, coins: number, onSelectAnimal: (animal: string) => void) => void` — replaces `container.innerHTML` with the zoo map and wires cage clicks to `onSelectAnimal`

- [ ] **Step 1: Implement the zoo screen**

Create `js/screens/zoo.js`:

```js
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
```

- [ ] **Step 2: Implement a temporary main.js to show just the zoo screen**

Create `js/main.js`:

```js
(function () {
  const app = document.getElementById('app');

  function showZooScreen() {
    const coins = getCoins(window.localStorage);
    renderZooScreen(app, coins, (animal) => {
      console.log('Animal seleccionado:', animal);
    });
  }

  showZooScreen();
})();
```

(This callback is temporary — Task 6 replaces it with real navigation to the feed screen.)

- [ ] **Step 3: Manually verify in the browser**

Open `index.html` in a browser. Expected: two cages stacked vertically, "🦁 Jaula de: León" and "🐐 Jaula de: Cabra", a coin badge top-right showing `🪙 0` (or whatever count is already in this browser's localStorage from earlier manual testing). Click each cage; open the console and confirm it logs `Animal seleccionado: leon` and `Animal seleccionado: cabra` respectively.

- [ ] **Step 4: Commit**

```bash
git add js/screens/zoo.js js/main.js
git commit -m "feat: add zoo map screen with animal selection"
```

---

### Task 5: Feed screen (static layout, no drag yet)

**Files:**
- Create: `js/screens/feed.js`
- Modify: `js/main.js` (wire real navigation between screens)

**Interfaces:**
- Consumes: `ANIMAL_EMOJI`, `ANIMAL_LABELS`, `FOODS`, `FOOD_EMOJI` (from `js/data.js`), `getCoins` (from `js/coins.js`)
- Produces (for later tasks):
  - `renderFeedScreen(container: HTMLElement, animal: string, coins: number, callbacks: { onBack: () => void, onCoinEarned: () => number }) => void` — replaces `container.innerHTML` with the feed screen; drag & drop wiring is added in Task 6, this task only renders the static layout and back button

- [ ] **Step 1: Implement the feed screen (static)**

Create `js/screens/feed.js`:

```js
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
```

- [ ] **Step 2: Wire real navigation in main.js**

Modify `js/main.js` — replace the whole file:

```js
(function () {
  const app = document.getElementById('app');

  function showZooScreen() {
    const coins = getCoins(window.localStorage);
    renderZooScreen(app, coins, showFeedScreen);
  }

  function showFeedScreen(animal) {
    const coins = getCoins(window.localStorage);
    renderFeedScreen(app, animal, coins, {
      onBack: showZooScreen,
      onCoinEarned: () => addCoin(window.localStorage),
    });
  }

  showZooScreen();
})();
```

- [ ] **Step 3: Add `js/screens/feed.js` to index.html script list**

Modify `index.html` — this line was already present from Task 1's template (`<script src="js/screens/feed.js"></script>`), so no edit is actually needed. Verify by opening `index.html` in a text editor and confirming the script tag is there between `zoo.js` and `main.js`.

- [ ] **Step 4: Manually verify in the browser**

Open `index.html`. Click the "🦁 Jaula de: León" cage. Expected: the feed screen appears showing a large 🦁, the heading "León", four food icons (🪨 🥩 🐇 🥕) in a row below, a "⬅️ Volver" button top-left, and the coin count top-right matching what the zoo screen showed. Click "⬅️ Volver" — expected: back to the zoo map screen. Repeat for the cabra cage.

- [ ] **Step 5: Commit**

```bash
git add js/screens/feed.js js/main.js
git commit -m "feat: add feed screen with navigation between zoo and feed"
```

---

### Task 6: Drag & drop feeding mechanic with reactions

**Files:**
- Modify: `js/screens/feed.js`

**Interfaces:**
- Consumes: `getReaction` (from `js/data.js`), `playEatSound`, `playRejectSound`, `playSpecialSound` (from `js/sound.js`)
- Produces: no new public interface — this completes `renderFeedScreen`'s behavior (food icons become draggable and trigger reactions on drop)

- [ ] **Step 1: Replace `js/screens/feed.js` with the full interactive version**

Modify `js/screens/feed.js` — replace the whole file:

```js
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
```

- [ ] **Step 2: Manually verify the full reaction matrix for the león**

Open `index.html`, click the león cage. For each food, press and drag it onto the lion emoji, then release:

- Carne → expected: 😋 appears briefly over the lion, a rising two-note chime plays, the coin counter increases by 1.
- Conejo → expected: same as carne (😋, chime, +1 coin).
- Piedra → expected: 😝 appears briefly, a low buzzy tone plays, coin counter does **not** change.
- Zanahoria → expected: same as piedra (😝, buzz, no coin change).

Drag a food and release it away from the lion (not overlapping) — expected: the icon snaps back to the tray, no reaction, no sound, no coin change.

- [ ] **Step 3: Manually verify the full reaction matrix for the cabra**

Go back to the zoo map, click the cabra cage. Repeat with each food:

- Carne → expected: 😝, buzzy tone, no coin change.
- Conejo → expected: 🥰, the three-note triangle-wave sound, no coin change.
- Piedra → expected: 😋, chime, +1 coin.
- Zanahoria → expected: 😋, chime, +1 coin.

- [ ] **Step 4: Verify coin persistence across a reload**

Note the coin count shown, reload the browser page (F5), navigate back to either animal's feed screen. Expected: the coin count is unchanged from before the reload (confirms `localStorage` persistence works end-to-end).

- [ ] **Step 5: Commit**

```bash
git add js/screens/feed.js
git commit -m "feat: implement drag-and-drop feeding with reactions, sounds, and coins"
```

---

### Task 7: End-to-end playthrough and README run instructions

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing new
- Produces: nothing new (documentation only)

- [ ] **Step 1: Full manual playthrough**

Open `index.html` fresh (or reload). Perform this full sequence and confirm each expectation:

1. Zoo map loads showing both cages and the coin badge. ✅/❌
2. Click león → feed screen for león loads with correct emoji, label, and 4 foods. ✅/❌
3. Feed the león all 4 foods once each, confirming reactions/sounds/coins match Task 6's matrix. ✅/❌
4. Click "⬅️ Volver" → back at the zoo map, coin badge reflects the coins just earned. ✅/❌
5. Click cabra → feed screen for cabra loads correctly. ✅/❌
6. Feed the cabra all 4 foods once each, confirming its reaction matrix. ✅/❌
7. Reload the browser entirely (not just navigate) → zoo map loads with the same total coin count as before reloading. ✅/❌

If any step fails, fix the relevant file from Tasks 1–6 before proceeding — do not move on with a known-broken interaction.

- [ ] **Step 2: Update README with run instructions**

Modify `README.md` — add this section right after the "## Estado del proyecto" section (update the status line too):

```markdown
## Estado del proyecto

✅ MVP jugable en el navegador (mapa del zoo + alimentar león/cabra). Sin imágenes reales todavía (placeholders con emoji) y sin empaquetar a Android.

## Cómo jugarlo

No hace falta instalar nada. Basta con abrir `index.html` directamente en un navegador (doble clic en el archivo, o `start index.html` en Windows / `open index.html` en Mac).

Para ejecutar los tests automáticos de la lógica de datos y monedas (requiere Node.js):

\`\`\`bash
node --test tests/
\`\`\`
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add MVP run instructions and update project status"
```
