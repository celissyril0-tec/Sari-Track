// PWA bootstrap: registers the service worker and wires up "Install app" controls.
// Any element with [data-pwa-install] stays hidden until the browser says install is possible.
(function () {
  'use strict';

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function (err) {
        console.error('Service worker registration failed:', err);
      });
    });
  }

  var style = document.createElement('style');
  style.textContent =
    '[data-pwa-install]{display:none !important}' +
    'html.pwa-can-install [data-pwa-install]{display:revert !important}';
  document.head.appendChild(style);

  var supportsWebInstall = typeof Navigator !== 'undefined' && typeof Navigator.prototype.install === 'function';
  var deferredPrompt = null;

  function setInstallable(can) {
    document.documentElement.classList.toggle('pwa-can-install', can);
  }

  if (supportsWebInstall) setInstallable(true);

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
    if (!supportsWebInstall) setInstallable(true);
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    setInstallable(false);
  });

  // Delegated, because the header is injected after load (see script.js).
  document.addEventListener('click', async function (event) {
    var trigger = event.target.closest('[data-pwa-install]');
    if (!trigger) return;
    event.preventDefault();

    try {
      if (supportsWebInstall) {
        // Must be called straight from the click to keep user activation.
        await navigator.install();
        setInstallable(false);
      } else if (deferredPrompt) {
        var promptEvent = deferredPrompt;
        deferredPrompt = null; // the event is single-use
        await promptEvent.prompt();
        var choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') setInstallable(false);
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') console.error('Install failed:', err);
    }
  });
})();
