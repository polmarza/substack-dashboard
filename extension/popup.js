const $ = (s) => document.querySelector(s);
const render = (st) => {
  if (!st) return;
  $('#sync').disabled = !!st.running;
  $('#status').className = st.error ? 'err' : '';
  $('#status').textContent = (st.lines || []).join('\n');
};
chrome.storage.session.get('syncState').then(({ syncState }) => render(syncState));
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'session' && changes.syncState) render(changes.syncState.newValue); });
$('#sync').onclick = () => chrome.runtime.sendMessage({ type: 'sync' });
$('#open').onclick = () => chrome.tabs.create({ url: 'http://127.0.0.1:8787/' });
