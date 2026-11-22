# Troca os dados embutidos do simulador pelos gerados por build2.py.
# Uso: python assemble.py fpv-minhocao.html saida.html
import sys, re
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
code = s[:s.index('<script type="application/json" id="d-meta">')]
out = code + '<script type="application/json" id="d-meta">' + open("meta2.json", encoding="utf-8").read() + '</script>\n'
for name, el in (("mesh2", "d-mesh"), ("spine2", "d-spine"), ("pts2", "d-pts")):
    out += f'<script type="application/octet-stream" id="{el}">' + open(name + ".b64").read() + '</script>\n'
open(dst, "w", encoding="utf-8").write(out)
print("gerado", dst, round(len(out) / 1e6, 1), "MB")
