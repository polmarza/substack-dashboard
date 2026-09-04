#!/usr/bin/env python3
"""Genera la página del panel que vive dentro de la extensión.

    python3 tools/make_extension_dashboard.py

`tools/template.html` lleva todo el panel en un `<script>` en línea, que es lo más
cómodo para un archivo suelto. Una página de extensión MV3 no puede: su CSP es
`script-src 'self'`, así que ningún script en línea se ejecuta. Este generador
parte la plantilla en dos —`extension/dashboard.html` y `extension/dashboard.js`—
y copia `tools/shape.mjs` como `extension/shape.js` sin los `export`.

Ejecútalo siempre que toques `tools/template.html` o `tools/shape.mjs`.
"""
import os
import re
import sys

from htmlcheck import assert_balanced

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.join(HERE, "..", "extension")
TEMPLATE = os.path.join(HERE, "template.html")
SHAPE = os.path.join(HERE, "shape.mjs")

SCRIPTS = """<script src="shape.js"></script>
<script src="dashboard-boot.js"></script>
<script src="dashboard.js"></script>
"""


def main():
    h = open(TEMPLATE, encoding="utf-8").read()
    assert_balanced(h, "tools/template.html")

    # El bloque de datos en línea se queda vacío: aquí los sirve dashboard-boot.js.
    data_tag = '<script id="data" type="application/json">/*__DATA__*/null</script>\n'
    if data_tag not in h:
        sys.exit("ERROR: no encuentro el bloque de datos en tools/template.html")
    h = h.replace(data_tag, "")

    # Saca el script del panel a su propio archivo.
    m = re.search(r"<script>\n(.*?)\n</script>", h, re.S)
    if not m:
        sys.exit("ERROR: no encuentro el script del panel en tools/template.html")
    code = m.group(1)
    h = h[: m.start()] + SCRIPTS + h[m.end():]

    if "<script" in h.replace('<script src="', ""):
        sys.exit("ERROR: queda algún script en línea; la CSP de MV3 no lo ejecutaría")

    assert_balanced(h, "extension/dashboard.html")

    shape = open(SHAPE, encoding="utf-8").read().replace("\nexport function ", "\nfunction ")
    if "export " in shape:
        sys.exit("ERROR: queda un «export» en shape.js; una página sin módulos no lo admite")

    open(os.path.join(EXT, "dashboard.html"), "w", encoding="utf-8").write(h)
    open(os.path.join(EXT, "dashboard.js"), "w", encoding="utf-8").write(code + "\n")
    open(os.path.join(EXT, "shape.js"), "w", encoding="utf-8").write(shape)
    print(f"extension/dashboard.html ({len(h)}), dashboard.js ({len(code)}), shape.js ({len(shape)})")


if __name__ == "__main__":
    main()
