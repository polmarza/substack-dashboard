#!/usr/bin/env python3
"""Deriva la plantilla de la skill a partir de la del proyecto.

    python3 tools/make_skill_template.py

`tools/template.html` es la plantilla completa: incluye el botón de sincronización
(que habla con el servidor local) y el histórico guardado en SQLite. La skill no
tiene ninguna de las dos cosas, así que su plantilla es la misma sin esas partes.
Mantener una sola fuente y derivar la otra evita que se separen con el tiempo.

Ejecútalo siempre que toques `tools/template.html`.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "template.html")
DST = os.path.join(HERE, "..", "substack-dashboard", "assets", "template.html")


def cut_between(h, start_marker, end_marker, keep_end=True):
    i = h.index(start_marker)
    j = h.index(end_marker, i)
    return h[:i] + (h[j:] if keep_end else h[j + len(end_marker):])


def derive(h):
    # 1. Fuera el bloque que consulta al servidor local (botón Sincronizar).
    h = cut_between(h, "  // ---------- sincronización ----------",
                    "  addEventListener('resize',")

    # 2. La serie de suscriptores sale solo del dataset: sin base de datos no hay histórico.
    i = h.index("    // El histórico de la base de datos crece")
    j = h.index("    let ts = serie.map(", i)
    k = h.index("\n", j)
    h = h[:i] + ("    let ts = p.subscribers_ts.map(([d, v]) => "
                 "({ t: new Date(String(d).replace(/\\//g, '-')).getTime(), v }))"
                 ".filter(x => !isNaN(x.t));") + h[k:]

    # 3. Fuera la evolución entre sincronizaciones, que también depende del histórico.
    i = h.index("    const evo = (pub().history?.posts?.[p.id] || []);")
    j = h.index("    return `", i)
    h = h[:i] + h[j:]
    h = h.replace("        ${evoHtml}\n", "")

    # 4. Fuera la barra de sincronización de la cabecera.
    bar = """        <div class="syncbar" id="syncbar" hidden>
          <button class="btn primary" id="sync-btn" data-i18n="sync"></button>
          <button class="btn" id="install-btn" data-i18n="installExt" hidden></button>
        </div>
"""
    assert bar in h, "no encuentro la barra de sincronización"
    h = h.replace(bar, "")
    # La capa de ayuda para instalar la extensión tampoco aplica sin servidor.
    i = h.index('  <div class="palette" id="installhelp" hidden>')
    j = h.index("</div>\n", h.index('id="installclose"')) + len("</div>\n")
    j = h.index("  </div>\n", j) + len("  </div>\n")
    h = h[:i] + h[j:]

    # 5. Y sus reglas CSS, que sin la barra no las usa nadie.
    h = re.sub(r"^  \.(syncbar|syncstate|synclog)\b[^\n]*\n", "", h, flags=re.M)
    return h


def main():
    h = derive(open(SRC, encoding="utf-8").read())
    for leftover in ("syncUI", "history", "evoHtml", 'id="syncbar"', "syncstate"):
        if leftover in h:
            sys.exit(f"ERROR: queda una referencia a «{leftover}» en la plantilla derivada")
    if 'class="credit"' not in h:
        sys.exit("ERROR: falta el crédito al pie")
    with open(DST, "w", encoding="utf-8") as f:
        f.write(h)
    print(f"substack-dashboard/assets/template.html regenerada ({len(h)} caracteres)")


if __name__ == "__main__":
    main()
