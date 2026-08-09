function renderShopScreen(container, coins, purchases, callbacks) {
  function itemActionHtml(item) {
    if (purchases[item.id]) {
      return '<span class="shop-badge-owned">✅ Comprado</span>';
    }
    if (typeof item.cost !== 'number') {
      return '<span class="shop-badge-locked">🔒 Próximamente</span>';
    }
    if (coins < item.cost) {
      return '<button class="shop-btn shop-btn--nocoins" data-shop-item="' + item.id + '" data-cost="' + item.cost + '">🪙 ' + item.cost + '</button>';
    }
    return '<button class="shop-btn shop-btn--buy" data-shop-item="' + item.id + '" data-cost="' + item.cost + '">🪙 ' + item.cost + ' - Comprar</button>';
  }

  container.innerHTML = `
    <div class="shop-screen">
      <button class="back-button" id="shop-back-btn">⬅️ Volver</button>
      <div class="coins-badge">🪙 <span id="shop-coins">${coins}</span></div>
      <img class="shop-bg" src="${SHOP_IMAGE}" alt="Tienda">
      <div class="shop-content">
        <h2>🏪 Tienda del Zoo</h2>
        <div class="shop-items">
          ${SHOP_ITEMS.map((item) => `
            <div class="shop-item ${purchases[item.id] ? 'shop-item--owned' : ''} ${typeof item.cost !== 'number' ? 'shop-item--locked' : ''}">
              <span class="shop-item-icon">${item.image}</span>
              <div class="shop-item-info">
                <h3>${item.label}</h3>
                <p>${item.desc}</p>
              </div>
              <div class="shop-item-action">
                ${itemActionHtml(item)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  container.querySelector('#shop-back-btn').addEventListener('click', callbacks.onBack);

  container.querySelectorAll('.shop-btn--buy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.shopItem;
      const cost = parseInt(btn.dataset.cost, 10);
      callbacks.onPurchase(itemId, cost);
    });
  });

  container.querySelectorAll('.shop-btn--nocoins').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cost = parseInt(btn.dataset.cost, 10);
      showNoCoinsToast(container, cost, coins);
    });
  });
}

function showNoCoinsToast(container, cost, coins) {
  const existing = container.querySelector('.shop-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'shop-toast';
  toast.textContent = `😞 No tienes suficientes monedas. Necesitas ${cost} 🪙 (tienes ${coins})`;
  container.querySelector('.shop-screen').appendChild(toast);

  setTimeout(() => {
    toast.classList.add('shop-toast--fade');
    setTimeout(() => toast.remove(), 400);
  }, 2000);
}