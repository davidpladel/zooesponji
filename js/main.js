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
