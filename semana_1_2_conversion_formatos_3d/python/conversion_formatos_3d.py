#!/usr/bin/env python3
"""Compara y convierte modelos OBJ/STL/GLTF para el taller de formatos 3D."""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

import imageio.v2 as imageio
import matplotlib
import numpy as np
import trimesh
from mpl_toolkits.mplot3d.art3d import Line3DCollection, Poly3DCollection

matplotlib.use("Agg")
import matplotlib.pyplot as plt

SUPPORTED_INPUTS: Dict[str, str] = {
    ".obj": "OBJ",
    ".stl": "STL",
    ".glb": "GLB",
    ".gltf": "GLTF",
}
EXPORT_FORMATS: Tuple[str, ...] = ("obj", "stl", "glb")
FORMAT_COLORS: Dict[str, str] = {
    "OBJ": "#f5a623",
    "STL": "#4fc3f7",
    "GLB": "#81c784",
    "GLTF": "#81c784",
}


@dataclass
class MeshMetrics:
    file_name: str
    format: str
    vertices: int
    faces: int
    edges_unique: int
    vertex_normals: int
    face_normals: int
    duplicate_vertices: int
    duplicate_ratio: float
    watertight: bool
    has_uv: bool
    bbox_x: float
    bbox_y: float
    bbox_z: float
    surface_area: float
    o3d_vertices: int | None = None
    o3d_faces: int | None = None
    o3d_has_vertex_normals: bool | None = None
    assimp_info: str | None = None


def collect_input_files(models_dir: Path) -> List[Path]:
    files = [path for path in models_dir.iterdir() if path.suffix.lower() in SUPPORTED_INPUTS]
    return sorted(files, key=lambda path: path.name.lower())


def load_mesh(file_path: Path) -> trimesh.Trimesh:
    loaded = trimesh.load(file_path, force="mesh", process=False)
    if not isinstance(loaded, trimesh.Trimesh):
        raise ValueError(f"No fue posible cargar {file_path.name} como malla triangular.")

    mesh = loaded.copy()
    mesh.remove_unreferenced_vertices()
    return mesh


def duplicate_vertex_stats(vertices: np.ndarray, decimals: int = 6) -> Tuple[int, int]:
    if len(vertices) == 0:
        return 0, 0
    rounded = np.round(vertices.astype(np.float64), decimals=decimals)
    unique = np.unique(rounded, axis=0)
    duplicates = int(len(vertices) - len(unique))
    return duplicates, int(len(unique))


def to_metrics(file_path: Path, mesh: trimesh.Trimesh) -> MeshMetrics:
    duplicates, unique_vertices = duplicate_vertex_stats(mesh.vertices)
    uv = getattr(mesh.visual, "uv", None)
    extents = mesh.bounding_box.extents if mesh.vertices.size else np.array([0.0, 0.0, 0.0])

    return MeshMetrics(
        file_name=file_path.name,
        format=SUPPORTED_INPUTS[file_path.suffix.lower()],
        vertices=int(len(mesh.vertices)),
        faces=int(len(mesh.faces)),
        edges_unique=int(len(mesh.edges_unique)),
        vertex_normals=int(len(mesh.vertex_normals)),
        face_normals=int(len(mesh.face_normals)),
        duplicate_vertices=duplicates,
        duplicate_ratio=round((duplicates / len(mesh.vertices)) if len(mesh.vertices) else 0.0, 6),
        watertight=bool(mesh.is_watertight),
        has_uv=bool(uv is not None and len(uv) > 0),
        bbox_x=float(extents[0]),
        bbox_y=float(extents[1]),
        bbox_z=float(extents[2]),
        surface_area=float(mesh.area),
    )


def enrich_with_open3d(metrics: MeshMetrics, file_path: Path) -> None:
    try:
        import open3d as o3d  # type: ignore
    except ImportError:
        return

    o3d_mesh = o3d.io.read_triangle_mesh(str(file_path), enable_post_processing=True)
    metrics.o3d_vertices = int(len(o3d_mesh.vertices))
    metrics.o3d_faces = int(len(o3d_mesh.triangles))
    metrics.o3d_has_vertex_normals = bool(o3d_mesh.has_vertex_normals())


def enrich_with_assimp_info(metrics: MeshMetrics, file_path: Path) -> None:
    assimp_bin = shutil.which("assimp")
    if assimp_bin is None:
        return

    completed = subprocess.run(
        [assimp_bin, "info", str(file_path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        metrics.assimp_info = "error"
        return

    # Guardar solo la primera línea útil para mantener el CSV legible.
    for line in completed.stdout.splitlines():
        line = line.strip()
        if line:
            metrics.assimp_info = line[:120]
            return


def downsample_mesh(mesh: trimesh.Trimesh, max_faces: int, seed: int = 7) -> trimesh.Trimesh:
    if len(mesh.faces) <= max_faces:
        return mesh

    rng = np.random.default_rng(seed)
    face_index = rng.choice(len(mesh.faces), size=max_faces, replace=False)
    return trimesh.Trimesh(vertices=mesh.vertices.copy(), faces=mesh.faces[face_index], process=False)


def set_equal_axes(ax: plt.Axes, vertices: np.ndarray) -> None:
    mins = vertices.min(axis=0)
    maxs = vertices.max(axis=0)
    center = (mins + maxs) / 2.0
    radius = float((maxs - mins).max() / 2.0)
    radius = radius if radius > 0 else 1.0

    ax.set_xlim(center[0] - radius, center[0] + radius)
    ax.set_ylim(center[1] - radius, center[1] + radius)
    ax.set_zlim(center[2] - radius, center[2] + radius)


def style_3d_axes(ax: plt.Axes) -> None:
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_zticks([])
    ax.grid(False)


def draw_solid(ax: plt.Axes, mesh: trimesh.Trimesh, color: str, max_faces: int) -> None:
    sampled = downsample_mesh(mesh, max_faces=max_faces)
    triangles = sampled.triangles
    poly = Poly3DCollection(
        triangles,
        facecolor=color,
        edgecolor="#202020",
        linewidths=0.03,
        alpha=0.95,
    )
    ax.add_collection3d(poly)
    set_equal_axes(ax, sampled.vertices)
    style_3d_axes(ax)


def draw_wireframe(ax: plt.Axes, mesh: trimesh.Trimesh, color: str, max_faces: int) -> None:
    sampled = downsample_mesh(mesh, max_faces=max_faces)
    edges = sampled.edges_unique
    lines = sampled.vertices[edges]
    collection = Line3DCollection(lines, colors=color, linewidths=0.25, alpha=0.9)
    ax.add_collection3d(collection)
    set_equal_axes(ax, sampled.vertices)
    style_3d_axes(ax)


def draw_normals(ax: plt.Axes, mesh: trimesh.Trimesh, color: str, max_faces: int, max_vectors: int = 900) -> None:
    sampled = downsample_mesh(mesh, max_faces=max_faces)
    centers = sampled.triangles_center
    normals = sampled.face_normals

    if len(centers) > max_vectors:
        rng = np.random.default_rng(13)
        idx = rng.choice(len(centers), size=max_vectors, replace=False)
        centers = centers[idx]
        normals = normals[idx]

    length = float(np.linalg.norm(sampled.bounding_box.extents) * 0.03)
    length = length if length > 0 else 1.0
    ax.quiver(
        centers[:, 0],
        centers[:, 1],
        centers[:, 2],
        normals[:, 0],
        normals[:, 1],
        normals[:, 2],
        color=color,
        normalize=True,
        length=length,
        linewidth=0.4,
    )
    set_equal_axes(ax, sampled.vertices)
    style_3d_axes(ax)


def plot_grid(
    meshes: Sequence[Tuple[str, trimesh.Trimesh]],
    output_path: Path,
    drawer,
    title: str,
    max_faces: int,
) -> None:
    fig = plt.figure(figsize=(5 * len(meshes), 4.4))
    for idx, (label, mesh) in enumerate(meshes, start=1):
        ax = fig.add_subplot(1, len(meshes), idx, projection="3d")
        color = FORMAT_COLORS.get(label, "#90a4ae")
        drawer(ax, mesh, color, max_faces)
        ax.set_title(f"{label}\nV={len(mesh.vertices)} F={len(mesh.faces)}", fontsize=10)
    fig.suptitle(title, fontsize=12)
    fig.tight_layout()
    fig.savefig(output_path, dpi=220, bbox_inches="tight")
    plt.close(fig)


def plot_metrics_bars(metrics: Sequence[MeshMetrics], output_path: Path) -> None:
    keys = ["vertices", "faces", "edges_unique", "duplicate_vertices", "vertex_normals"]
    labels = ["Vertices", "Faces", "Edges", "Duplicados", "Normales V"]
    x = np.arange(len(keys))
    width = 0.8 / max(len(metrics), 1)

    fig, ax = plt.subplots(figsize=(12, 5))
    for idx, item in enumerate(metrics):
        values = [getattr(item, key) for key in keys]
        ax.bar(x + (idx * width) - 0.4 + (width / 2), values, width=width, label=item.format)

    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylabel("Cantidad")
    ax.set_title("Comparación cuantitativa por formato")
    ax.legend()
    ax.grid(axis="y", alpha=0.25)
    fig.tight_layout()
    fig.savefig(output_path, dpi=220, bbox_inches="tight")
    plt.close(fig)


def build_rotation_gif(
    meshes: Sequence[Tuple[str, trimesh.Trimesh]],
    output_path: Path,
    max_faces: int,
    n_frames: int = 48,
) -> None:
    fig = plt.figure(figsize=(5 * len(meshes), 4.4))
    axes: List[plt.Axes] = []
    for idx, (label, mesh) in enumerate(meshes, start=1):
        ax = fig.add_subplot(1, len(meshes), idx, projection="3d")
        color = FORMAT_COLORS.get(label, "#90a4ae")
        draw_solid(ax, mesh, color, max_faces=max_faces)
        ax.set_title(label, fontsize=10)
        axes.append(ax)

    frames = []
    for azimuth in np.linspace(0, 360, n_frames, endpoint=False):
        for ax in axes:
            ax.view_init(elev=22, azim=float(azimuth))
        fig.canvas.draw()
        width, height = fig.canvas.get_width_height()
        buffer = np.frombuffer(fig.canvas.buffer_rgba(), dtype=np.uint8)
        frame = buffer.reshape(height, width, 4)[:, :, :3].copy()
        frames.append(frame)

    imageio.mimsave(output_path, frames, duration=0.07, loop=0)
    plt.close(fig)


def export_conversions(meshes_by_path: Dict[Path, trimesh.Trimesh], output_dir: Path) -> List[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    converted: List[Path] = []

    for source_path, mesh in meshes_by_path.items():
        source_ext = source_path.suffix.lower().lstrip(".")
        for target in EXPORT_FORMATS:
            if target == source_ext:
                continue
            if source_ext == "gltf" and target == "glb":
                continue

            output_name = f"{source_path.stem}_from_{source_ext}.{target}"
            output_path = output_dir / output_name
            mesh.export(output_path, file_type=target)
            converted.append(output_path)

    return converted


def write_metrics_report(metrics: Sequence[MeshMetrics], output_dir: Path) -> Tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "comparison_metrics.csv"
    json_path = output_dir / "comparison_metrics.json"

    rows = [asdict(metric) for metric in metrics]
    with csv_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    json_path.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    return csv_path, json_path


def print_summary_table(metrics: Sequence[MeshMetrics]) -> None:
    headers = ["Formato", "Archivo", "Vértices", "Caras", "Duplicados", "Watertight", "UV"]
    rows = []
    for item in metrics:
        rows.append(
            [
                item.format,
                item.file_name,
                str(item.vertices),
                str(item.faces),
                str(item.duplicate_vertices),
                str(item.watertight),
                str(item.has_uv),
            ]
        )

    widths = [len(header) for header in headers]
    for row in rows:
        for idx, value in enumerate(row):
            widths[idx] = max(widths[idx], len(value))

    line = " | ".join(header.ljust(widths[i]) for i, header in enumerate(headers))
    separator = "-+-".join("-" * width for width in widths)
    print(line)
    print(separator)
    for row in rows:
        print(" | ".join(value.ljust(widths[i]) for i, value in enumerate(row)))


def run_workshop(
    models_dir: Path,
    media_dir: Path,
    converted_dir: Path,
    report_dir: Path,
    max_plot_faces: int,
    build_gif: bool,
    with_open3d: bool,
    with_assimp: bool,
) -> None:
    files = collect_input_files(models_dir)
    if not files:
        raise FileNotFoundError(
            f"No se encontraron modelos compatibles en {models_dir}. "
            "Se esperan archivos .obj, .stl, .glb o .gltf."
        )

    meshes_by_path: Dict[Path, trimesh.Trimesh] = {}
    metrics: List[MeshMetrics] = []
    for file_path in files:
        mesh = load_mesh(file_path)
        meshes_by_path[file_path] = mesh
        mesh_metrics = to_metrics(file_path, mesh)
        if with_open3d:
            enrich_with_open3d(mesh_metrics, file_path)
        if with_assimp:
            enrich_with_assimp_info(mesh_metrics, file_path)
        metrics.append(mesh_metrics)

    metrics.sort(key=lambda item: (item.format, item.file_name))
    print_summary_table(metrics)

    converted_files = export_conversions(meshes_by_path, converted_dir)
    print(f"\nConversiones generadas: {len(converted_files)}")
    for path in converted_files:
        print(f"- {path}")

    report_csv, report_json = write_metrics_report(metrics, report_dir)
    print(f"\nReporte CSV:  {report_csv}")
    print(f"Reporte JSON: {report_json}")

    media_dir.mkdir(parents=True, exist_ok=True)
    mesh_pairs = [(SUPPORTED_INPUTS[path.suffix.lower()], mesh) for path, mesh in meshes_by_path.items()]

    plot_grid(
        mesh_pairs,
        media_dir / "python_format_comparison.png",
        drawer=draw_solid,
        title="Comparación de formatos (sólido)",
        max_faces=max_plot_faces,
    )
    plot_grid(
        mesh_pairs,
        media_dir / "python_wireframe_comparison.png",
        drawer=draw_wireframe,
        title="Comparación de formatos (wireframe)",
        max_faces=max_plot_faces,
    )
    plot_grid(
        mesh_pairs,
        media_dir / "python_normals_comparison.png",
        drawer=draw_normals,
        title="Comparación de normales de cara",
        max_faces=max_plot_faces,
    )
    plot_metrics_bars(metrics, media_dir / "python_metrics_bar.png")

    if build_gif:
        build_rotation_gif(mesh_pairs, media_dir / "python_rotation.gif", max_faces=max_plot_faces)
        print(f"GIF generado en: {media_dir / 'python_rotation.gif'}")


def parse_args() -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    default_models = script_dir.parent / "models"
    default_media = script_dir.parent / "media"
    default_converted = script_dir / "converted_models"
    default_report = script_dir

    parser = argparse.ArgumentParser(
        description="Analiza, visualiza y convierte modelos OBJ/STL/GLTF del taller.",
    )
    parser.add_argument("--models-dir", type=Path, default=default_models, help="Carpeta con modelos fuente.")
    parser.add_argument("--media-dir", type=Path, default=default_media, help="Carpeta para imágenes y GIF.")
    parser.add_argument(
        "--converted-dir",
        type=Path,
        default=default_converted,
        help="Carpeta para archivos convertidos.",
    )
    parser.add_argument(
        "--report-dir",
        type=Path,
        default=default_report,
        help="Carpeta para reportes CSV/JSON.",
    )
    parser.add_argument(
        "--max-plot-faces",
        type=int,
        default=12000,
        help="Máximo de caras a dibujar por modelo en figuras (muestreo).",
    )
    parser.add_argument("--skip-gif", action="store_true", help="No generar GIF de rotación.")
    parser.add_argument(
        "--with-open3d",
        action="store_true",
        help="Agregar métricas cruzadas usando Open3D (si está instalado).",
    )
    parser.add_argument(
        "--with-assimp",
        action="store_true",
        help="Agregar metadatos básicos usando assimp CLI (si está instalado).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    run_workshop(
        models_dir=args.models_dir,
        media_dir=args.media_dir,
        converted_dir=args.converted_dir,
        report_dir=args.report_dir,
        max_plot_faces=args.max_plot_faces,
        build_gif=not args.skip_gif,
        with_open3d=args.with_open3d,
        with_assimp=args.with_assimp,
    )


if __name__ == "__main__":
    main()
