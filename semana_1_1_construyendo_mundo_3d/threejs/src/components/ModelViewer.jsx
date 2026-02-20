import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Weld coincident vertices, then count topologically unique edges.
 *
 * Why mergeVertices?
 *   STL files store every triangle independently — each face has its own 3
 *   vertices even when adjacent faces share an edge. Without welding, (a,b)
 *   from triangle 1 and (a',b') from triangle 2 look like different indices
 *   even though a≡a' and b≡b' in world space. mergeVertices fixes that,
 *   making the result match trimesh.edges_unique exactly.
 */
function countUniqueEdgesExact(geometry) {
  const merged = mergeVertices(geometry.clone(), 1e-6)
  if (!merged.index) return 0

  const edgeSet = new Set()
  const n = merged.index.count / 3

  for (let t = 0; t < n; t++) {
    const a = merged.index.getX(t * 3)
    const b = merged.index.getX(t * 3 + 1)
    const c = merged.index.getX(t * 3 + 2)
    edgeSet.add(a < b ? `${a}_${b}` : `${b}_${a}`)
    edgeSet.add(b < c ? `${b}_${c}` : `${c}_${b}`)
    edgeSet.add(c < a ? `${c}_${a}` : `${a}_${c}`)
  }

  return edgeSet.size
}

/**
 * Load a model from a URL (file:// blob or /public path) given its extension.
 * Returns a Promise<THREE.Object3D> (always a Group or Scene).
 */
function loadModel(url, extension) {
  return new Promise((resolve, reject) => {
    switch (extension) {
      case 'glb':
      case 'gltf': {
        const draco = new DRACOLoader()
        draco.setDecoderPath(
          'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
        )
        const loader = new GLTFLoader()
        loader.setDRACOLoader(draco)
        loader.load(url, gltf => resolve(gltf.scene), undefined, reject)
        break
      }
      case 'stl': {
        new STLLoader().load(url, geo => {
          geo.computeVertexNormals()
          const mesh = new THREE.Mesh(
            geo,
            new THREE.MeshStandardMaterial({
              color: '#b8a99a',
              metalness: 0.2,
              roughness: 0.8,
            })
          )
          const group = new THREE.Group()
          group.add(mesh)
          resolve(group)
        }, undefined, reject)
        break
      }
      case 'obj': {
        new OBJLoader().load(url, resolve, undefined, reject)
        break
      }
      default:
        reject(new Error(`Unsupported format: .${extension}`))
    }
  })
}

/**
 * ModelViewer — generic 3D model viewer.
 *
 * Props:
 *  - url        : blob URL or /public path
 *  - extension  : 'glb' | 'gltf' | 'stl' | 'obj'
 *  - mode       : 'solid' | 'wireframe' | 'points' | 'combined'
 *  - onStats    : ({ vertices, triangles, edges, meshes }) => void
 */
export default function ModelViewer({ url, extension, mode, onStats }) {
  // { object3D: THREE.Object3D, meshData: [{ mesh, origMaterial }] }
  const [loaded, setLoaded] = useState(null)
  const helpers = useRef([])

  // ── Load & analyse whenever the URL changes ───────────────────────────────
  useEffect(() => {
    let cancelled = false

    loadModel(url, extension)
      .then(object3D => {
        if (cancelled) return

        // Center & normalize scale to fit within a ~3-unit sphere
        const box    = new THREE.Box3().setFromObject(object3D)
        const center = box.getCenter(new THREE.Vector3())
        const size   = box.getSize(new THREE.Vector3())
        const scale  = 3 / Math.max(size.x, size.y, size.z)
        object3D.scale.setScalar(scale)
        object3D.position.set(
          -center.x * scale,
          -center.y * scale,
          -center.z * scale
        )

        // Collect all meshes and compute stats
        const meshData    = []
        let totalVertices = 0
        let totalTris     = 0
        let totalEdges    = 0

        object3D.traverse(obj => {
          if (!obj.isMesh) return
          meshData.push({ mesh: obj, origMaterial: obj.material })

          const geo     = obj.geometry
          const posAttr = geo.attributes.position
          if (!posAttr) return

          totalVertices += posAttr.count
          totalTris     += geo.index ? geo.index.count / 3 : posAttr.count / 3

          // Exact topology: weld vertices first, then count unique edge pairs
          totalEdges += countUniqueEdgesExact(geo)
        })

        onStats?.({
          vertices:  totalVertices,
          triangles: Math.round(totalTris),
          edges:     totalEdges,
          meshes:    meshData.length,
        })

        setLoaded({ object3D, meshData })
      })
      .catch(err => console.error('Model load error:', err))

    return () => {
      cancelled = true
    }
  }, [url, extension]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Apply visualization mode whenever mode or model changes ───────────────
  useEffect(() => {
    if (!loaded) return
    const { meshData } = loaded

    // Remove previous helpers
    helpers.current.forEach(obj => obj.removeFromParent())
    helpers.current = []

    meshData.forEach(({ mesh, origMaterial }) => {
      // Always start from a clean slate
      mesh.material = origMaterial
      mesh.visible  = true

      if (mode === 'solid') return

      // In wireframe / points mode, hide the opaque mesh
      if (mode === 'wireframe' || mode === 'points') {
        mesh.visible = false
      }

      // ── edges overlay ────────────────────────────────────────────────────
      if (mode === 'wireframe' || mode === 'combined') {
        const line = new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry, 15),
          new THREE.LineBasicMaterial({
            color: mode === 'combined' ? '#00d4ff' : '#00ff88',
          })
        )
        line.matrix.copy(mesh.matrix)
        line.matrixAutoUpdate = false
        mesh.parent?.add(line)
        helpers.current.push(line)
      }

      // ── vertex points overlay ────────────────────────────────────────────
      if (mode === 'points' || mode === 'combined') {
        const pts = new THREE.Points(
          mesh.geometry,
          new THREE.PointsMaterial({
            color: mode === 'combined' ? '#ffdd00' : '#ff6b6b',
            size: 0.015,
            sizeAttenuation: true,
          })
        )
        pts.matrix.copy(mesh.matrix)
        pts.matrixAutoUpdate = false
        mesh.parent?.add(pts)
        helpers.current.push(pts)
      }
    })

    return () => {
      helpers.current.forEach(obj => obj.removeFromParent())
      helpers.current = []
      meshData.forEach(({ mesh, origMaterial }) => {
        mesh.material = origMaterial
        mesh.visible  = true
      })
    }
  }, [mode, loaded])

  if (!loaded) return null
  return <primitive object={loaded.object3D} />
}
