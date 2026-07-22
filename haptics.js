(function () {
  const hapticLabel = document.getElementById('haptic-label');
  if (!hapticLabel) return;

  function triggerHaptic() {
    hapticLabel.click();
  }

  // Delegación de eventos: funciona con links/botones actuales y futuros
  document.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) {
      triggerHaptic();
    }
  });
})();