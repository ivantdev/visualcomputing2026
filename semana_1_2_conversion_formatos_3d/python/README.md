# Python - Conversión de formatos 3D

Script del taller para comparar y convertir modelos `.obj`, `.stl` y `.gltf/.glb` usando `trimesh`.

## Qué hace

1. Carga automáticamente los modelos desde `../models`.
2. Compara métricas:
   - vértices, caras, aristas únicas
   - normales de vértice y cara
   - vértices duplicados
   - watertight, UV, área superficial
3. Convierte cada formato a los otros (`obj`, `stl`, `glb`) en `python/converted_models/`.
4. Genera reportes:
   - `comparison_metrics.csv`
   - `comparison_metrics.json`
5. Genera visualizaciones en `../media/`:
   - `python_format_comparison.png`
   - `python_wireframe_comparison.png`
   - `python_normals_comparison.png`
   - `python_metrics_bar.png`
   - `python_rotation.gif`

Bonus:
- `--with-open3d` agrega métricas cruzadas con Open3D.
- `--with-assimp` agrega una línea de info por archivo usando `assimp` CLI.

## Instalación

Desde esta carpeta:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Ejecución

```bash
python conversion_formatos_3d.py
```

Opciones útiles:

```bash
python conversion_formatos_3d.py --skip-gif
python conversion_formatos_3d.py --with-open3d
python conversion_formatos_3d.py --with-open3d --with-assimp --max-plot-faces 8000
```
