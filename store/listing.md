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

### Single purpose

To show the author of a Substack publication the statistics of their own
publication in a dashboard, inside their browser.

### Permission justifications

**storage** — The dashboard keeps the statistics it collects, and their history
over time, in the browser's local storage for this extension. Without it the user
would have to re-collect everything on every visit and could never see change
over time.

**unlimitedStorage** — A publication with many posts, each with per-post daily
statistics, exceeds the 10 MB default quota, and the extension also keeps a
history across syncs. No data leaves the device, so this only affects local disk.

**scripting** — The collector runs inside the user's own Substack tabs, where the
requests are same-origin and carry the user's session. Running it from the
service worker does not work reliably: the session cookie is not sent from that
cross-site context. The injected code is read-only and ships inside the package.

**tabs** — To open a background tab for each of the user's publications, wait for
it to finish loading, and close it when its data has been collected. Also to
bring the dashboard tab to the front if it is already open instead of opening a
duplicate.

**Host permission https://\*.substack.com/\* and https://substack.com/\*** — These
are the only sites the extension reads. Each publication's statistics are served
from its own subdomain, and the account-level data (the list of publications the
user administers, and their Notes) from substack.com itself.

**Remote code** — No. Everything the extension executes is included in the
package.

### Data usage disclosures

The extension does not collect or transmit any user data. Nothing is sent to the
developer or to any third party; there is no server involved. Tick that you do
not sell or transfer user data, do not use it for unrelated purposes, and do not
use it for creditworthiness or lending.

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

### Propósito único

Enseñar al autor de una publicación de Substack las estadísticas de su propia
publicación en un panel, dentro de su navegador.

### Justificación de cada permiso

**storage** — El panel guarda las estadísticas que recoge, y su histórico, en el
almacenamiento local de la extensión. Sin este permiso habría que recolectarlo
todo en cada visita y nunca se podría ver la evolución en el tiempo.

**unlimitedStorage** — Una publicación con muchos posts, cada uno con
estadísticas diarias, supera la cuota de 10 MB por defecto, y además se guarda el
histórico entre sincronizaciones. Ningún dato sale del dispositivo: esto solo
afecta al disco local.

**scripting** — El recolector se ejecuta dentro de las propias pestañas de
Substack del usuario, donde las peticiones son del mismo origen y llevan su
sesión. Hacerlo desde el service worker no funciona de forma fiable: la cookie de
sesión no viaja desde ese contexto. El código inyectado es de solo lectura y
viaja dentro del paquete.

**tabs** — Para abrir una pestaña en segundo plano por cada publicación del
usuario, esperar a que termine de cargar y cerrarla cuando ya se han recogido sus
datos. También para traer al frente el panel si ya está abierto, en lugar de
abrir un duplicado.

**Permiso de host https://\*.substack.com/\* y https://substack.com/\*** — Son los
únicos sitios que lee la extensión. Las estadísticas de cada publicación se
sirven desde su propio subdominio, y los datos de la cuenta (qué publicaciones
administra el usuario y sus notas) desde substack.com.

**Código remoto** — No. Todo lo que ejecuta la extensión va incluido en el
paquete.

### Declaración de uso de datos

La extensión no recoge ni transmite datos del usuario. No se envía nada al
desarrollador ni a terceros; no hay ningún servidor. Marca que no vendes ni
transfieres datos de usuarios, que no los usas para fines ajenos y que no los
usas para evaluar solvencia ni conceder préstamos.
