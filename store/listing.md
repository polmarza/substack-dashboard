# Chrome Web Store listing

Everything the Developer Dashboard asks for, ready to paste. Generate the package
with `npm run package` and the images with `npm run store-shots`.

- **Package:** `store/dashboard-for-substack-<version>.zip`
- **Screenshots:** `store/screenshots/1-…` to `5-…` (1280×800, in that order)
- **Small promo tile:** `store/screenshots/promo-440x280.png`
- **Privacy policy URL:** `https://github.com/polmarza/substack-dashboard/blob/main/PRIVACY.md`
- **Homepage / support URL:** `https://github.com/polmarza/substack-dashboard`
- **Category:** Workflow & Planning · **Language:** English (add Spanish as a translation)

The item name and short description come from the package itself
(`extension/_locales/{en,es}/messages.json`), so they are already localised. The
detailed description below has to be pasted per language in the dashboard.

---

## Privacy practices tab

Every field below has a 1,000-character limit. **Paste the English versions**:
Chrome Web Store reviewers work in English, and the host-permission review is
where a listing gets held up. The Spanish equivalents are further down if you
prefer them.

Two things nobody can fill in for you, both on the Settings page:

1. **Publisher contact email** — enter it, then complete the verification email
   Google sends. The item cannot be published until it is verified.
2. **Data use certification** — tick the three boxes: you do not sell or transfer
   user data, you do not use it for purposes unrelated to the item's single
   purpose, and you do not use it to determine creditworthiness or for lending.
   All three are true here: the extension transmits nothing.

### English (paste these)

#### Single purpose description

_780 de 1000 caracteres._

```text
Dashboard for Substack shows a Substack writer the statistics of the publications they administer, as charts and tables inside their browser.

On Sync it reads, from the user's own signed-in Substack account: which publications they administer, each publication's posts and per-post stats (views, opens, open rate, clicks, reactions, comments, signups), subscriber counts and growth sources, the aggregate country breakdown of subscribers, and the user's own Notes. It stores them in chrome.storage.local and renders the dashboard.

That is the extension's only function. It is read-only: it never publishes, edits or deletes anything on Substack. It has no server, no account and no analytics; no data is transmitted anywhere. It does not act on any site other than substack.com.
```

#### Justification — `scripting`

_794 de 1000 caracteres._

```text
The collector has to run inside a real Substack tab. Each publication's stats endpoints are same-origin to that publication and need the signed-in session; calling them from the service worker fails, because the session cookie is not sent reliably from that cross-site context and subdomains redirect to custom domains.

So on Sync the extension uses chrome.scripting.executeScript to inject one function into a tab it just opened at the user's own publication. That function calls Substack's /api/v1 stats endpoints, returns the JSON, and does nothing else. It is defined in background.js and ships in the package: no remote code, no eval.

It is strictly read-only — GET requests only, no posting, editing or deleting — and it runs only on substack.com pages, only when the user presses Sync.
```

#### Justification — `storage`

_696 de 1000 caracteres._

```text
chrome.storage.local holds the statistics the extension collects, so the dashboard page can render them and the user does not have to re-collect everything each time they open it.

It also keeps a small history per sync: subscriber counts by day, and per-post totals over time. This is what lets the dashboard show change over time at all — Substack's own API returns only the last 30 days of subscriber data, so anything longer has to be accumulated locally.

chrome.storage.session is used only to publish sync progress ("reading publication X…") to the popup and dashboard.

Everything stays on the user's machine. Nothing is written to any server, and the extension has no server to write to.
```

#### Justification — `unlimitedStorage`

_482 de 1000 caracteres._

```text
The collected data is larger than the 10 MB that chrome.storage.local allows by default: a publication with hundreds of posts stores, for each post, its stats plus first-week daily figures, traffic sources and link stats — and the extension accumulates a history across syncs on top of that.

Without this permission, writes fail part-way through a sync and the user is left with incomplete data.

It only affects local disk on the user's own computer. Nothing is uploaded anywhere.
```

#### Justification — `tabs`

_695 de 1000 caracteres._

```text
Sync opens one background tab per publication the user administers (chrome.tabs.create with active:false), waits for it to finish loading (chrome.tabs.onUpdated) so the injected collector runs against a loaded page, and closes it (chrome.tabs.remove) as soon as that publication's data has been read. Without tabs the extension cannot know when the page is ready, nor clean up after itself.

It is also used to bring an already-open dashboard tab to the front instead of opening duplicates (chrome.tabs.query restricted to the extension's own dashboard.html URL).

The extension does not read browsing history, does not enumerate the user's other tabs, and does not observe pages the user opens.
```

#### Justification — host permissions

_874 de 1000 caracteres._

```text
The extension only ever accesses Substack.

https://substack.com/* provides the account-level data: which publications the user administers, and the user's own Notes.

https://*.substack.com/* is required because each publication's statistics are served same-origin from that publication's own subdomain (for example myletter.substack.com/api/v1/publish-dashboard/summary). The subdomain is different for every user and is only known at run time, after reading their profile, so it cannot be narrowed to a fixed list in the manifest.

Both are used only to open a background tab at the user's own publication and read that user's own statistics, and only when they press Sync. No other host is contacted, and none of the data leaves the browser. (The dashboard page does contain ordinary hyperlinks — GitHub, claude.ai — but those are only followed if the user clicks them.)
```

#### Remote code justification

_554 de 1000 caracteres._

```text
No remote code is used.

Every line of JavaScript the extension executes is inside the package: background.js, popup.js, and the dashboard page's shape.js, dashboard-boot.js and dashboard.js. The collector injected with chrome.scripting is a function defined in background.js, not a downloaded script.

There is no eval, no new Function, no remotely hosted script or stylesheet, and no CDN. The dashboard page loads only its own local .js files; its world map is embedded in the page and it uses system fonts, so it renders with no network access at all.
```

### Español (por si lo prefieres)

#### Descripción de la finalidad única

_788 de 1000 caracteres._

```text
Panel para Substack enseña al autor de una publicación de Substack las estadísticas de las publicaciones que administra, en gráficos y tablas dentro de su navegador.

Al pulsar Sincronizar lee, de la cuenta de Substack donde el propio usuario tiene la sesión iniciada: qué publicaciones administra, los posts de cada una y sus estadísticas (vistas, aperturas, tasa de apertura, clics, reacciones, comentarios, altas), el número de suscriptores y las fuentes de captación, el reparto agregado por país y sus propias notas. Lo guarda en chrome.storage.local y dibuja el panel.

Esa es su única función. Solo lee: nunca publica, edita ni borra nada en Substack. No tiene servidor, ni cuenta, ni analítica; no transmite datos a ninguna parte. No actúa en ningún sitio que no sea substack.com.
```

#### Justificación — `scripting`

_849 de 1000 caracteres._

```text
El recolector tiene que ejecutarse dentro de una pestaña real de Substack. Los endpoints de estadísticas de cada publicación son del mismo origen que esa publicación y necesitan la sesión iniciada; llamarlos desde el service worker falla, porque la cookie de sesión no viaja de forma fiable desde ese contexto y los subdominios redirigen a dominios personalizados.

Por eso, al sincronizar, la extensión inyecta con chrome.scripting.executeScript una función en una pestaña que acaba de abrir en la publicación del propio usuario. Esa función llama a los endpoints /api/v1 de Substack, devuelve el JSON y nada más. Está definida en background.js y viaja en el paquete: sin código remoto y sin eval.

Es estrictamente de solo lectura —solo peticiones GET— y se ejecuta únicamente en páginas de substack.com y solo cuando el usuario pulsa Sincronizar.
```

#### Justificación — `storage`

_726 de 1000 caracteres._

```text
chrome.storage.local guarda las estadísticas que recoge la extensión, para que la página del panel pueda dibujarlas y el usuario no tenga que recolectarlo todo cada vez que la abre.

También guarda un pequeño histórico por sincronización: suscriptores por día y totales por post a lo largo del tiempo. Es lo que permite ver la evolución: la propia API de Substack solo devuelve los últimos 30 días de suscriptores, así que cualquier serie más larga hay que acumularla en local.

chrome.storage.session se usa solo para publicar el progreso de la sincronización («leyendo la publicación X…») en el popup y en el panel.

Todo se queda en la máquina del usuario. No se escribe en ningún servidor, y la extensión no tiene ninguno.
```

#### Justificación — `unlimitedStorage`

_514 de 1000 caracteres._

```text
Los datos recogidos superan los 10 MB que permite chrome.storage.local por defecto: una publicación con cientos de posts guarda, por cada post, sus estadísticas más las cifras diarias de la primera semana, las fuentes de tráfico y los enlaces; y encima la extensión acumula un histórico entre sincronizaciones.

Sin este permiso, las escrituras fallan a mitad de una sincronización y el usuario se queda con datos incompletos.

Solo afecta al disco local del ordenador del usuario. No se sube nada a ninguna parte.
```

#### Justificación — `tabs`

_721 de 1000 caracteres._

```text
Al sincronizar se abre una pestaña en segundo plano por cada publicación que administra el usuario (chrome.tabs.create con active:false), se espera a que termine de cargar (chrome.tabs.onUpdated) para que el recolector inyectado trabaje sobre una página ya cargada, y se cierra (chrome.tabs.remove) en cuanto se han leído sus datos. Sin tabs la extensión no puede saber cuándo está lista la página ni recoger lo que ha abierto.

También se usa para traer al frente el panel si ya está abierto, en vez de abrir duplicados (chrome.tabs.query limitado a la URL dashboard.html de la propia extensión).

La extensión no lee el historial de navegación, no enumera las demás pestañas del usuario ni observa las páginas que abre.
```

#### Justificación — permisos de host

_866 de 1000 caracteres._

```text
La extensión solo accede a Substack.

https://substack.com/* da los datos de la cuenta: qué publicaciones administra el usuario y sus propias notas.

https://*.substack.com/* hace falta porque las estadísticas de cada publicación se sirven desde el subdominio de esa publicación, del mismo origen (por ejemplo miboletin.substack.com/api/v1/publish-dashboard/summary). El subdominio es distinto para cada usuario y solo se conoce en tiempo de ejecución, tras leer su perfil, así que no puede acotarse a una lista fija en el manifiesto.

Ambos se usan solo para abrir una pestaña en segundo plano en la publicación del propio usuario y leer sus propias estadísticas, y solo cuando pulsa Sincronizar. No se contacta con ningún otro host y ningún dato sale del navegador. (El panel incluye enlaces normales —GitHub, claude.ai— que solo se abren si el usuario los pulsa.)
```

#### Justificación del código remoto

_528 de 1000 caracteres._

```text
No se usa código remoto.

Todo el JavaScript que ejecuta la extensión va dentro del paquete: background.js, popup.js y los del panel (shape.js, dashboard-boot.js, dashboard.js). El recolector que se inyecta con chrome.scripting es una función definida en background.js, no un script descargado.

No hay eval, ni new Function, ni scripts u hojas de estilo alojados fuera, ni CDN. La página del panel carga solo sus propios .js locales; el mapamundi va incrustado y usa fuentes del sistema, así que se dibuja sin acceder a la red.
```

---

## English

### Detailed description

Substack shows you how a post did. It does not make it easy to see how your posts
are doing — which topics land, whether your open rate is drifting, how this month
compares with the last one, or how two of your publications stack up against each
other.

This extension builds that view. Press Sync and it reads the statistics of every
Substack publication you administer, using the session you are already signed in
with, and turns them into a dashboard you can actually read.

WHAT YOU GET

• Headline figures per publication: subscribers, views, open rate, CTR, reactions, attributed signups.
• A sortable table of every post — click one and its detail opens in place: traffic sources, most-clicked links, first-week daily views, and how it compares to your own typical post.
• Absolute or relative metrics. Tripling your likes after tripling your list is not an improvement; relative mode divides reach by the people who actually received each send, so old and new posts can be compared honestly.
• A comparison view across all your publications, with a global top 10.
• A world map of where your subscribers are.
• Your Notes, measured by reactions, restacks and replies.
• Analyze with Claude: questions worth asking about what you are looking at, each one copying itself together with your numbers, ready to paste into a conversation.
• A range filter (all time / 365 / 90 / 30 days) that recomputes every metric.
• Interface in English or Spanish.

WHERE YOUR DATA GOES: NOWHERE

There is no server, no account, no sign-up and no analytics. Your statistics are
stored by Chrome on your own computer and are never sent anywhere. The extension
talks to substack.com and to nothing else. It only reads: it never publishes,
edits, deletes or sends anything on your behalf, and it never touches your
subscribers' email addresses.

Every sync also keeps a local history, so your subscriber line keeps growing past
the 30 days Substack's own API returns.

It works only for publications where you are an administrator.

Open source, MIT licensed: https://github.com/polmarza/substack-dashboard

Not affiliated with, endorsed by or sponsored by Substack Inc. "Substack" is a
trademark of Substack Inc., used here only to describe what the extension works
with.

### Data usage disclosures

The extension collects no user data at all, so every category is left unticked.
See the certification checkboxes in the Privacy practices section above.

---

## Español

### Descripción detallada

Substack te enseña cómo fue un post. Lo que no pone fácil es ver cómo van tus
posts: qué temas funcionan, si tu tasa de apertura se está torciendo, cómo va
este mes comparado con el anterior, o cómo se comparan dos de tus publicaciones
entre sí.

Esta extensión construye esa vista. Pulsas Sincronizar y lee las estadísticas de
cada publicación de Substack que administras, con la sesión que ya tienes
iniciada, y las convierte en un panel que se puede leer de verdad.

QUÉ INCLUYE

• Cifras principales por publicación: suscriptores, vistas, tasa de apertura, CTR, reacciones, altas atribuidas.
• Una tabla ordenable con todos tus posts: pulsas uno y su detalle se abre ahí mismo, con fuentes de tráfico, enlaces más clicados, vistas diarias de la primera semana y cómo se compara con tu post típico.
• Métricas absolutas o relativas. Triplicar los «me gusta» después de triplicar la lista no es una mejora; el modo relativo divide el alcance entre quienes recibieron de verdad cada envío, para poder comparar posts viejos y nuevos con honestidad.
• Una vista comparativa entre todas tus publicaciones, con un top 10 global.
• Un mapamundi de dónde están tus suscriptores.
• Tus notas, medidas por reacciones, restacks y respuestas.
• Analizar con Claude: preguntas que vale la pena hacerse sobre lo que estás mirando, y cada una se copia junto con tus números, lista para pegar en una conversación.
• Un filtro de rango (todo / 365 / 90 / 30 días) que recalcula cada métrica.
• Interfaz en español o inglés.

DÓNDE VAN TUS DATOS: A NINGÚN SITIO

No hay servidor, ni cuenta, ni registro, ni analítica. Tus estadísticas las
guarda Chrome en tu propio ordenador y no se envían a ninguna parte. La extensión
habla con substack.com y con nada más. Solo lee: nunca publica, edita, borra ni
envía nada en tu nombre, y nunca toca las direcciones de correo de tus
suscriptores.

Cada sincronización guarda además un histórico local, así que tu línea de
suscriptores sigue creciendo más allá de los 30 días que devuelve la propia API
de Substack.

Funciona solo con las publicaciones donde eres administrador.

Código abierto, licencia MIT: https://github.com/polmarza/substack-dashboard

Sin relación, patrocinio ni respaldo de Substack Inc. «Substack» es una marca de
Substack Inc., usada aquí solo para describir con qué funciona la extensión.

### Declaración de uso de datos

La extensión no recoge ningún dato del usuario, así que no se marca ninguna
categoría. Las casillas de certificación están en la sección de prácticas de
privacidad, más arriba.
