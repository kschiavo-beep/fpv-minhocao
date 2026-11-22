# FPV Minhocão: simulador e pipeline

## Só jogar
Abra `fpv-minhocao.html` no Chrome ou Edge (duplo clique).
Os dados do mapa estão dentro do arquivo. A biblioteca 3D (three.js) vem da internet
na primeira vez, então precisa estar online.

## Refazer o mapa (ou fazer outro lugar)
Requisitos: Python 3.10+ e
    pip install "laspy[lazrs]" pyproj scipy numpy pillow

Rode, nesta ordem, dentro desta pasta:

| passo | script | o que faz |
|---|---|---|
| 1 | `python list.py` | lista os 5.544 blocos LiDAR do bucket público da PMSP (AWS) → `keys.json` |
| 2 | `python hdr.py` | lê só o cabeçalho de cada bloco para saber onde ele fica → `hdrs.json` |
| 3 | `python route.py` | escolhe os blocos perto do trajeto aproximado (lat/lon dentro do script) → `sel.json` |
| 4 | `python download.py` | baixa os blocos (~420 MB) para `laz/` |
| 5 | `python dsm.py` | gera a superfície de 1 m (altura + cor) → `dsm.npz` |
| 6 | `python cls.py` | conta as classes LiDAR por célula → `cls.npy` |
| 7 | `python center.py` | acha o eixo do viaduto nos dados → `center.json` (+ `center.png` para conferir) |
| 8 | `python build2.py` | monta a faixa reta, a linha-guia e a amostra de pontos → `meta2.json`, `*.b64` |
| 9 | `python assemble.py fpv-minhocao.html novo.html` | coloca os dados novos no simulador |

Para outro lugar: troque os pontos de `route.py` e a linha aproximada `H` dentro de
`center.py` (em pixels da imagem `ortho.png` reduzida pela metade). A largura da faixa é
`HALF` em `build2.py` (58 m de cada lado).

Fonte dos dados: PMSP LiDAR Point Cloud, https://registry.opendata.aws/pmsp-lidar/

## V 1 / V 2 (low-poly estilo N64)
Depois dos passos 1-9 acima (com `route.py` na margem de 300 m):

| passo | script | o que faz |
|---|---|---|
| 05 | `python 05_patch_v01.py novo.html fpv-minhocao-v0.1.html` | V 0.1: charset, chão de fora invisível, eixo da câmera relativo |
| 10-31 | `10_strip.py`, `20_lidar_cells.py`, `30_classify.py`, `31_figures1.py` | classificação só com LiDAR |
| 40-50 | `40_osm.py`, `41_geosampa.py`, `50_fuse.py` | cruza com OpenStreetMap e GeoSampa |
| 70-74 | `70_mapillary.py` (precisa de `MAPILLARY_TOKEN`), `71_facades.py`, `74_rotations.py`, `72_facade_params.py`, `73_empenas.py` | fachadas e empenas |
| 60 | `python 60_lowpoly.py` | cena low-poly → `lp.json` + `lp.bin.gz` |
| 65 | `python 65_patch_v1.py fpv-minhocao-v0.1.html fpv-minhocao-v2.html` | injeta `lp_module.js` (murais, balões, colisão) e a imagem da Elis (`../elis/elis-a-512.jpg`) |

Saída final: `fpv-minhocao-lowpoly.html` (cópia da V 2).
