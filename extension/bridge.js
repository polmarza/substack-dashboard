// Content script que corre en la página del panel local.
//
// Hace dos cosas: deja una marca en el DOM para que el panel sepa que la extensión
// está instalada (una web no puede detectarlo por su cuenta), y hace de puente para
// que el botón Sincronizar del panel dispare la recogida.
(() => {
  const version = chrome.runtime.getManifest().version;
  document.documentElement.dataset.sdExtension = version;

  // El panel pide sincronizar.
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.__sd !== 'sync') return;
    chrome.runtime.sendMessage({ type: 'sync' });
  });

  // Y recibe el progreso, para poder mostrarlo sin abrir el popup.
  const relay = (state) => window.postMessage({ __sd: 'state', state }, '*');
  chrome.storage.session.get('syncState').then(({ syncState }) => { if (syncState) relay(syncState); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && changes.syncState) relay(changes.syncState.newValue);
  });
})();
