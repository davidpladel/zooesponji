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
      onCoinEarned: (amount) => addCoin(window.localStorage, amount),
    });
  }

  showZooScreen();
})();
