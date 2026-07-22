(function () {
  const hapticLabel = document.getElementById('haptic-label');

  function triggerHaptic() {
    // Android / navegadores con soporte estándar
    if (navigator.vibrate) {
      navigator.vibrate(10);
      return;
    }
    // iOS Safari (17.4+)
    if (hapticLabel) {
      hapticLabel.click();
    }
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) {
      triggerHaptic();
    }
  });
})();