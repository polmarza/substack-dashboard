# Privacy policy — Dashboard for Substack

_Last updated: 4 September 2026 · [Versión en español más abajo](#política-de-privacidad--panel-para-substack)_

## The short version

The extension reads your own Substack statistics and keeps them on your own
computer. It never transmits them: there is no server, no account, no analytics
and no third party. It does not sell or share anything with anyone.

Chrome asks every extension to declare what user data it handles, including data
that never leaves the device. Ours handles two of Chrome's categories, both
locally: **personally identifiable information** (your Substack display name and
handle, so the dashboard can show whose account it is) and **website content**
(your post titles, note texts, links and statistics read from substack.com).

## What it reads

When you press **Sync**, the extension opens a short-lived background tab on
each Substack publication where you are an administrator and reads, using the
Substack session you are already signed in with:

- the list of your published posts and their statistics (views, opens, open
  rate, clicks, reactions, comments, attributed signups);
- your publication summaries and subscriber counts;
- your growth sources and the country breakdown of your subscribers, as
  aggregate figures;
- your own Substack Notes and their reactions, restacks and replies.

It reads only publications where you are an administrator. It never reads other
people's publications, and it performs no write of any kind: it does not
publish, edit, delete or send anything on your behalf.

**It does not read your subscribers' email addresses or any other personal
information about them.** The country breakdown is aggregate counts per country,
never individual records.

## Where the data goes

Into `chrome.storage.local`, which is storage that Chrome reserves for this
extension on your own computer. It is not synced to your Google account and it
is not sent anywhere. The extension makes no network request to any server other
than `substack.com` itself, and only to read the pages and endpoints listed
above.

Uninstalling the extension deletes its data along with it.

## Your Substack session

The extension uses the session cookie your browser already holds for Substack,
the same way the site itself does. It never reads, copies, stores or transmits
that cookie. All requests happen inside a real Substack tab in your own browser.

## The "Analyze with Claude" feature

This feature copies a question, together with the numbers currently shown on
screen, to your clipboard. It sends nothing anywhere. Whether that text ever
reaches Claude — or any other tool — depends entirely on you choosing to paste
it somewhere.

## Permissions and why they exist

| Permission | Why |
|---|---|
| `storage`, `unlimitedStorage` | To keep your statistics and their history on your computer. A publication with many posts exceeds the default 10 MB quota. |
| `scripting` | To run the read-only collector inside your own Substack tabs, which is the only reliable way to use your session. |
| `tabs` | To open the background tab for each publication, wait for it to load, close it afterwards, and to focus the dashboard tab if it is already open. |
| `https://*.substack.com/*`, `https://substack.com/*` | The only sites the extension touches. |

The extension loads no remote code: everything it runs ships inside the package.

## Contact

Questions or problems: open an issue at
<https://github.com/polmarza/substack-dashboard/issues>.

---

# Política de privacidad — Panel para Substack

_Última actualización: 4 de septiembre de 2026_

## En corto

La extensión lee tus propias estadísticas de Substack y las guarda en tu propio
ordenador. Nunca las transmite: no hay servidor, ni cuenta, ni analítica, ni
terceros. No vende ni comparte nada con nadie.

Chrome pide a toda extensión que declare qué datos del usuario maneja, incluidos
los que nunca salen del dispositivo. La nuestra maneja dos de las categorías de
Chrome, y las dos en local: **información de identificación personal** (tu nombre
y tu identificador de Substack, para que el panel sepa de quién es la cuenta) y
**contenido del sitio web** (los títulos de tus posts, el texto de tus notas, los
enlaces y las estadísticas que lee de substack.com).

## Qué lee

Al pulsar **Sincronizar**, la extensión abre una pestaña en segundo plano en cada
publicación de Substack donde eres administrador y lee, con la sesión de Substack
que ya tienes iniciada:

- la lista de tus posts publicados y sus estadísticas (vistas, aperturas, tasa de
  apertura, clics, reacciones, comentarios, altas atribuidas);
- los resúmenes de tus publicaciones y el número de suscriptores;
- tus fuentes de captación y el reparto por país de tus suscriptores, en cifras
  agregadas;
- tus propias notas de Substack con sus reacciones, restacks y respuestas.

Solo lee publicaciones donde eres administrador. Nunca lee las de otras personas,
y no escribe nada de nada: no publica, ni edita, ni borra, ni envía nada en tu
nombre.

**No lee las direcciones de correo de tus suscriptores ni ninguna otra
información personal sobre ellos.** El reparto por país son recuentos agregados,
nunca registros individuales.

## Dónde van los datos

A `chrome.storage.local`, el almacenamiento que Chrome reserva para esta
extensión en tu propio ordenador. No se sincroniza con tu cuenta de Google y no
se envía a ningún sitio. La extensión no hace ninguna petición de red a otro
servidor que no sea `substack.com`, y solo para leer lo que se enumera arriba.

Al desinstalarla, sus datos se borran con ella.

## Tu sesión de Substack

La extensión usa la cookie de sesión que tu navegador ya tiene de Substack, igual
que la hace servir la propia web. Nunca lee, copia, guarda ni transmite esa
cookie. Todas las peticiones ocurren dentro de una pestaña real de Substack en tu
navegador.

## La función «Analizar con Claude»

Copia una pregunta, junto con los números que tienes en pantalla, a tu
portapapeles. No envía nada a ningún sitio. Que ese texto llegue a Claude —o a
cualquier otra herramienta— depende por completo de que tú decidas pegarlo.

## Permisos y para qué son

| Permiso | Para qué |
|---|---|
| `storage`, `unlimitedStorage` | Guardar tus estadísticas y su histórico en tu ordenador. Una publicación con muchos posts supera la cuota de 10 MB por defecto. |
| `scripting` | Ejecutar el recolector de solo lectura dentro de tus propias pestañas de Substack, la única vía fiable de usar tu sesión. |
| `tabs` | Abrir la pestaña en segundo plano de cada publicación, esperar a que cargue, cerrarla después, y traer al frente el panel si ya está abierto. |
| `https://*.substack.com/*`, `https://substack.com/*` | Los únicos sitios que toca la extensión. |

La extensión no carga código remoto: todo lo que ejecuta viaja dentro del paquete.

## Contacto

Dudas o problemas: abre una incidencia en
<https://github.com/polmarza/substack-dashboard/issues>.
