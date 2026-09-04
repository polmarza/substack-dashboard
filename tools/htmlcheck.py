"""Comprueba que las etiquetas de bloque del panel están bien anidadas.

Los generadores recortan trozos de `tools/template.html` buscando texto. Un corte
que se pase por un `</div>` no rompe nada visible al abrir el archivo —el navegador
lo repara— pero cierra el contenedor antes de tiempo y el panel pierde su ancho
máximo y sus márgenes. Pasó una vez; esto es para que no vuelva a pasar en silencio.
"""
import re
import sys
from html.parser import HTMLParser

BLOCK = {"div", "section", "header", "footer", "ul", "ol", "li",
         "table", "thead", "tbody", "tr", "td", "th", "textarea"}


class _Nesting(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag in BLOCK:
            self.stack.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag):
        if tag not in BLOCK:
            return
        if not self.stack:
            self.errors.append(f"</{tag}> de más en la línea {self.getpos()[0]}")
        elif self.stack[-1][0] == tag:
            self.stack.pop()
        else:
            open_tag, line = self.stack[-1]
            self.errors.append(
                f"</{tag}> en la línea {self.getpos()[0]} cierra un <{open_tag}> abierto en la {line}")


def assert_balanced(html, where):
    """Sale con error si el HTML tiene etiquetas de bloque descuadradas."""
    p = _Nesting()
    p.feed(re.sub(r"<script.*?</script>", "", html, flags=re.S))
    problems = p.errors + [f"<{t}> sin cerrar (línea {l})" for t, l in p.stack]
    if problems:
        sys.exit(f"ERROR: etiquetas descuadradas en {where}:\n  " + "\n  ".join(problems))
