# Panel de Substack

Panel local de estadísticas para **tus propias** publicaciones de Substack: vistas, aperturas, tasa de apertura, clics, reacciones, comentarios, altas atribuidas, fuentes de tráfico, detalle por post y una comparativa entre todas tus publicaciones.

Substack no tiene API pública. Su panel de escritor habla con una API privada en `/api/v1/…` que funciona con la sesión de tu navegador. Este proyecto lee esa API **con tu propia sesión**, guarda los datos en local y genera un HTML autocontenido. No se envía nada a ningún sitio.

*[Read me in English](README.md)*

---

## Tres formas de usarlo

Elige una. Las tres producen el mismo panel.

| | Ideal si | Necesitas |
|---|---|---|
| **1. Skill de Claude Code** | Solo quieres el panel, sin instalar nada | Claude Code |
| **2. App local** | Uso recurrente, histórico en el tiempo | Node 22+ |
| **3. Extensión de Chrome** | Usas la app local pero el login de Playwright falla | Node 22+ y Chrome |

---

### 1. Skill de Claude Code (lo más simple)

Instala la skill y pide tus estadísticas. Claude abre un navegador, tú inicias sesión en Substack, y Claude descarga todo y construye el panel.

```bash
cp -R substack-dashboard ~/.claude/skills/
```

Después basta con pedirlo: *"enséñame cómo van mis posts de Substack"*.

La skill es autocontenida (`SKILL.md`, el recolector para el navegador, un generador en Python sin dependencias y la documentación de los endpoints). No necesita servidor, ni Playwright, ni extensión. Ver [`substack-dashboard/SKILL.md`](substack-dashboard/SKILL.md).

### 2. App local

Un servidor Node pequeño que sirve el panel, guarda un histórico en SQLite y añade un botón **Sincronizar**.

```bash
npm install
npm start          # http://127.0.0.1:8787/
```

Desde el panel:

1. **Iniciar sesión en Substack** — abre una ventana de Chrome; inicias sesión una vez. El perfil queda en `.profile/`.
2. **Sincronizar** — descarga todas las publicaciones, guarda una nueva foto y regenera el panel.

Equivalentes por terminal: `npm run login`, `npm run sync` (o `npm run sync -- mi-newsletter` para una sola), `npm run build`, `npm run import`.

Para que arranque solo al iniciar sesión (macOS): `npm run install-service` (se deshace con `npm run uninstall-service`).

> **Sobre el inicio de sesión.** Playwright usa un perfil de Chrome aparte, así que hay que iniciar sesión otra vez ahí. Si el código por email de Substack no llega, usa *"Iniciar sesión con contraseña"* en esa pantalla, o pasa a la opción 3, que reutiliza la sesión que ya tienes.

### 3. Extensión de Chrome

Usa la sesión de Substack que ya tienes en tu Chrome normal, así que no hay segundo inicio de sesión.

1. Abre `chrome://extensions`, activa **Modo de desarrollador** y pulsa **Cargar descomprimida**.
2. Elige la carpeta `extension/`.
3. Con `npm start` en marcha, pulsa el icono de la extensión y **Sincronizar todas las publicaciones**.

Solo habla con `*.substack.com` (lectura) y con tu `127.0.0.1:8787`. La cookie nunca sale del navegador.

---

## Qué muestra el panel

**Pestaña Comparativa** — tabla ordenable de todas las publicaciones (suscriptores, variación a 30 días, posts, vistas, vistas por post, apertura, CTR, reacciones por post, comentarios, altas), gráficos de barras con un color fijo por publicación y un top 10 global de posts.

**Pestaña por publicación** — tarjetas de cabecera, la serie de suscriptores, fuentes de crecimiento, vistas por post en el tiempo y una tabla ordenable con una columna *vs media* que compara cada post con el promedio de posts comparables que calcula el propio Substack. Al pinchar un post ves sus fuentes de tráfico, enlaces más clicados, vistas diarias de la primera semana y (con la app local) cómo se movieron sus números entre sincronizaciones.

El filtro de rango (todo / 365 / 90 / 30 días) recalcula todas las métricas de posts.

---

## Datos y privacidad

- Todo se queda en tu máquina: los JSON en `data/`, el histórico en `data/substack.sqlite` y un `dashboard.html` autocontenido.
- `data/`, `.profile/` y `dashboard.html` están en el `.gitignore`: contienen tus estadísticas y tu sesión.
- **Tu sesión vale tanto como tu contraseña.** Permite publicar y borrar, no solo leer. Este proyecto solo lee. No compartas `.profile/` ni pegues tu cookie en ningún sitio.
- Solo devuelven estadísticas las publicaciones donde eres **administrador**.

## Requisitos

- **Skill**: Claude Code y Python 3.
- **App local**: Node 22+ (usa el `node:sqlite` incorporado). Playwright controla el Chrome que ya tienes instalado; no descarga otro navegador.

## Estructura

```
substack-dashboard/     la skill portable de Claude Code (SKILL.md, recolector, generador, endpoints)
tools/                  app local: servidor, sincronización con Playwright, capa SQLite, generador
extension/              extensión de Chrome opcional (sincroniza con tu sesión normal)
data/                   tus datos e histórico (fuera de git)
```

## Avisos

Esto usa una API **no documentada**. Substack puede cambiarla sin previo aviso y los endpoints pueden dejar de funcionar. Tómalo como una herramienta de trabajo, no como un producto con soporte. Las peticiones van a menos de 1 por segundo para no forzar los límites.

Documentación de endpoints: [`substack-dashboard/references/endpoints.md`](substack-dashboard/references/endpoints.md). Referencia de la comunidad: [substack-api-reference](https://github.com/AnthonyDavidAdams/substack-api-reference).

## Licencia

MIT — ver [LICENSE](LICENSE).
