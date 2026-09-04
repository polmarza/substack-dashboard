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
$('#open').onclick = async () => {
  try {
    const r = await fetch('http://127.0.0.1:8787/api/status', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    chrome.tabs.create({ url: 'http://127.0.0.1:8787/' });
  } catch {
    const st = $('#status');
    st.className = 'err';
    st.textContent = 'The dashboard server is not running. Start it in a terminal with:\n\n    npm start\n\nAn extension cannot launch it for you.';
  }
};
