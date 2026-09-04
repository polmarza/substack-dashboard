// Puente entre chrome.storage y el panel.
//
// El panel es el mismo HTML que se genera para el servidor local; allí los datos
// llegan incrustados en un <script id="data">, y aquí los lee de chrome.storage y
// les da forma con shape.js (el mismo código que usa el generador de escritorio).
window.__SD_LOAD = async function () {
  // Fuera de la extensión (abrir el archivo suelto para mirarlo) no hay almacén.
  if (typeof chrome === 'undefined' || !chrome.storage) return null;
  const { index } = await chrome.storage.local.get('index');
  if (!index || !(index.publications || []).length) return null;

  const keys = index.publications.map((p) => 'ds:' + p.subdomain)
    .concat(index.publications.map((p) => 'hist:' + p.id))
    .concat(['notes']);
  const store = await chrome.storage.local.get(keys);

  const entries = [];
  for (const meta of index.publications) {
    const dataset = store['ds:' + meta.subdomain];
    if (!dataset) continue;                       // sincronización a medias: se ignora
    entries.push({ meta, dataset, history: store['hist:' + meta.id] || null });
  }
  if (!entries.length) return null;
  return shapePayload(entries, store.notes || null, index.primary_publication_id, index.user);
};
