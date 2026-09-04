const $ = (s) => document.querySelector(s);
const render = (st) => {
  if (!st) return;
  $('#sync').disabled = !!st.running;
  $('#status').className = st.error ? 'err' : '';
  $('#status').textContent = (st.lines || []).join('\n');
  $('#status').scrollTop = $('#status').scrollHeight;
};
chrome.storage.session.get('syncState').then(({ syncState }) => render(syncState));
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'session' && changes.syncState) render(changes.syncState.newValue); });
$('#sync').onclick = () => chrome.runtime.sendMessage({ type: 'sync' });

// El panel es una página de la propia extensión: si ya está abierta, la trae al frente.
$('#open').onclick = async () => {
  const url = chrome.runtime.getURL('dashboard.html');
  const [open] = await chrome.tabs.query({ url });
  if (open) chrome.tabs.update(open.id, { active: true });
  else chrome.tabs.create({ url });
  window.close();
};
