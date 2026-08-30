#!/usr/bin/env python3
"""Enforce this project's own rules. Run it before every commit; CI runs it too.

    python3 tools/validate.py

No dependencies — standard library only, same as the site itself.
"""
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "index.html")
STYLES = os.path.join(ROOT, "assets", "styles.css")
TOKENS = os.path.join(ROOT, "assets", "tokens.css")

failures = []
checks = 0


def check(name, ok, detail=""):
    global checks
    checks += 1
    if ok:
        print("  PASS  %s" % name)
    else:
        print("  FAIL  %s%s" % (name, ("\n        " + detail) if detail else ""))
        failures.append(name)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


# --------------------------------------------------------------- parse index

class Collector(HTMLParser):
    """Gathers what the checks below need, and proves the HTML parses at all."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.imgs = []
        self.local_refs = []
        self.stack = []
        self.mismatches = []
        self.ids = []
        self.buttons_without_type = 0

    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
            "link", "meta", "param", "source", "track", "wbr"}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.append(a["id"])
        if tag == "img":
            self.imgs.append(a)
        if tag == "button" and "type" not in a:
            self.buttons_without_type += 1
        for key in ("src", "href"):
            v = a.get(key)
            if v and not re.match(r"^(https?:|mailto:|#|//|data:)", v):
                self.local_refs.append(v)
        if tag not in self.VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.VOID:
            return
        if not self.stack:
            self.mismatches.append("stray </%s>" % tag)
        elif self.stack[-1] != tag:
            self.mismatches.append("expected </%s>, got </%s>" % (self.stack[-1], tag))
            if tag in self.stack:
                while self.stack and self.stack.pop() != tag:
                    pass
        else:
            self.stack.pop()


html = read(INDEX)
p = Collector()
p.feed(html)
p.close()

print("\nHTML")
check("parses with no tag mismatches", not p.mismatches, "; ".join(p.mismatches[:5]))
check("every element is closed", not p.stack, "still open: %s" % ", ".join(p.stack[-5:]))
check("document declares a language", 'lang="' in html[:200])
check("document declares a charset", "charset=" in html[:400])
check("every <button> has an explicit type", p.buttons_without_type == 0,
      "%d without type" % p.buttons_without_type)
check("no duplicate id attributes", len(p.ids) == len(set(p.ids)),
      "repeated: %s" % ", ".join(sorted({i for i in p.ids if p.ids.count(i) > 1})))

# --------------------------------------------------------------- images

print("\nImages")
no_alt = [i for i in p.imgs if "alt" not in i]
check("every <img> has an alt attribute", not no_alt,
      "%d missing" % len(no_alt))
no_dims = [i.get("src") for i in p.imgs if not (i.get("width") and i.get("height"))]
check("every <img> declares width and height", not no_dims,
      "missing on: %s" % ", ".join(x for x in no_dims if x))

# --------------------------------------------------------------- local files

print("\nLinks")
missing = [r for r in set(p.local_refs)
           if not os.path.exists(os.path.join(ROOT, r.split("?")[0].split("#")[0]))]
check("every local file referenced exists", not missing, ", ".join(sorted(missing)))

unused = []
sprite_dir = os.path.join(ROOT, "assets", "sprites")
if os.path.isdir(sprite_dir):
    referenced = {os.path.basename(r) for r in p.local_refs}
    unused = [f for f in sorted(os.listdir(sprite_dir)) if f not in referenced]
check("no orphaned sprite files", not unused, "unreferenced: %s" % ", ".join(unused))

# --------------------------------------------------------------- design rules

print("\nDesign system")
styles = read(STYLES)
# Los comentarios documentan la paleta DMG con sus hex reales; no son codigo.
styles_code = re.sub(r"/\*.*?\*/", "", styles, flags=re.S)
# Literal colours belong in tokens.css. The one carve-out is the scanline
# overlay, which is a neutral black at low alpha rather than a palette colour.
literals = re.findall(r"#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)", styles_code)
oklch_literals = [m for m in re.findall(r"oklch\([^)]*\)", styles_code)
                  if not re.match(r"oklch\(0%\s+0\s+0\s*/", m)]
check("no literal colours outside tokens.css", not literals and not oklch_literals,
      ", ".join((literals + oklch_literals)[:5]))

fonts = re.findall(r"font-family:\s*([^;]+);", styles_code)
bad_fonts = [f.strip() for f in fonts if "var(--font-" not in f]
check("every font-family uses a token", not bad_fonts, ", ".join(bad_fonts[:3]))

tokens = read(TOKENS)
tokens_code = re.sub(r"/\*.*?\*/", "", tokens, flags=re.S)
blocks = re.findall(r"\{([^{}]*)\}", tokens_code)
names = [set(re.findall(r"(--[\w-]+)\s*:", b)) for b in blocks if "--" in b]
base = names[0] if names else set()
# El bloque claro es la definicion completa; los oscuros solo REDEFINEN colores.
# Un token que exista solo en oscuro nunca se aplicaria en el estado sin marcar.
dark_only = sorted(set().union(*names[1:]) - base) if len(names) > 1 else []
check("no token exists only in the dark palette", not dark_only, ", ".join(dark_only[:6]))

# Solo cuentan los var() SIN respaldo: `var(--x, algo)` no puede romper nada
# aunque --x no exista, y --era/--i se fijan en linea desde el HTML.
bare = set(re.findall(r"var\((--[\w-]+)\s*\)", styles_code))
undefined = sorted(u for u in bare if u not in base)
check("every token used without a fallback is defined", not undefined,
      ", ".join(undefined))

# --------------------------------------------------------------- anti-patterns

print("\nAnti-patterns")
for label, pattern in [
    ("no `transition: all`", r"transition:\s*all"),
    ("no 100vw widths", r"\b100vw\b"),
    ("no z-index above 999", r"z-index:\s*(?:[1-9]\d{3,})"),
    ("no italic headings", r"h[1-6][^{]*\{[^}]*font-style:\s*italic"),
    ("no browser-default easing", r"transition:[^;]*\bease\b\s*[;,)]"),
]:
    check(label, not re.search(pattern, styles))

check("reduced motion is honoured", "prefers-reduced-motion" in styles)
check("focus is visible", "focus-visible" in styles)
check("horizontal overflow is clipped at the root", "overflow-x: clip" in styles)

# --------------------------------------------------------------- content

print("\nContent")
hours = [int(h) for h in re.findall(r"~(\d+)\s*H<", html)]
check("every stop declares an hour estimate", len(hours) == html.count('class="stage"'),
      "%d estimates for %d stops" % (len(hours), html.count('class="stage"')))
total_in_screen = re.search(r'id="screen-hours">~(\d+)', html)
check("the advertised total matches the sum of the stops",
      bool(total_in_screen) and int(total_in_screen.group(1)) == sum(hours),
      "page says ~%s, stops sum to %d" % (
          total_in_screen.group(1) if total_in_screen else "?", sum(hours)))
check("no stop ships pre-marked", 'class="stage done"' not in html)

# --------------------------------------------------------------- sharing card

print("\nSharing card")
ORIGIN = "https://pokemon.cativo.dev"


def meta(attr, name):
    m = re.search(r'<meta %s="%s" content="([^"]*)"' % (attr, re.escape(name)), html)
    return m.group(1) if m else None


def png_size(path):
    """Ancho y alto desde la cabecera IHDR. Sin dependencias, como todo aqui."""
    with open(path, "rb") as fh:
        head = fh.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return (int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big"))


check("the page declares an icon", 'rel="icon"' in html)

og_img = meta("property", "og:image")
tw_img = meta("name", "twitter:image")
check("a sharing image is declared for both cards", bool(og_img) and og_img == tw_img,
      "og:image=%s twitter:image=%s" % (og_img, tw_img))

# Las redes exigen URL absoluta, asi que hay que volver a local para comprobarla.
local = os.path.join(ROOT, og_img[len(ORIGIN):].lstrip("/")) if og_img and og_img.startswith(ORIGIN) else None
check("the sharing image is absolute and points into this site", bool(local),
      "must start with %s" % ORIGIN)
check("the sharing image file exists", bool(local) and os.path.exists(local),
      "missing: %s" % (local or "?"))

# Si alguien re-renderiza la tarjeta con otro tamano y olvida las metas, las
# redes recortan mal y nadie se entera. Que lo diga CI.
size = png_size(local) if local and os.path.exists(local) else None
declared = (meta("property", "og:image:width"), meta("property", "og:image:height"))
check("the declared image size matches the file",
      bool(size) and declared == (str(size[0]), str(size[1])),
      "file is %s, page says %s" % (size, declared))
check("the sharing image keeps the 1.91:1 ratio the networks crop to",
      bool(size) and abs(size[0] / size[1] - 1.91) < 0.03,
      "%s is %.2f:1" % (size, size[0] / size[1]) if size else "no image")

canon = re.search(r'<link rel="canonical" href="([^"]*)"', html)
check("canonical and og:url agree",
      bool(canon) and canon.group(1) == meta("property", "og:url"),
      "canonical=%s og:url=%s" % (canon.group(1) if canon else None, meta("property", "og:url")))

# --------------------------------------------------------------- report

print("\n%d checks, %d failed" % (checks + 1, len(failures)))
sys.exit(1 if failures else 0)
