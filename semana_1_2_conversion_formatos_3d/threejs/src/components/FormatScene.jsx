import { useEffect, useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import * as THREE from 'three'

/* ──────────────────────────────────────────────────────────
   Stats helper – count vertices, triangles, unique edges
────────────────────────────────────────────────────────── */
function gatherStats(object3D) {
  let vertices = 0
  let triangles = 0
  let edges = 0
  let meshCount = 0

  object3D.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    meshCount++
    const geo = node.geometry

    // vertex count
    vertices += geo.attributes.position?.count ?? 0

    // triangle count
    if (geo.index) {
      triangles += geo.index.count / 3
    } else {
      triangles += (geo.attributes.position?.count ?? 0) / 3
    }

    // unique edge count (topological)
    const merged = mergeVertices(geo.clone(), 1e-6)
    if (merged.index) {
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
      edges += edgeSet.size
    }
  })

  return { vertices, triangles: Math.round(triangles), edges, meshCount }
}

/* ──────────────────────────────────────────────────────────
   Load model from a URL given its extension.
   Options:
     mtlUrl      — URL of the .mtl file for OBJ models
     mtlBasePath — base path for texture resolution
   Returns a Promise<THREE.Object3D>.
────────────────────────────────────────────────────────── */
function loadModelFromUrl(url, extension, { mtlUrl, mtlBasePath } = {}) {
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
          // STL: flat shading (no smoothed normals, monochrome)
          const mat = new THREE.MeshStandardMaterial({
            color: '#4fc3f7',
            flatShading: true,
            metalness: 0.1,
            roughness: 0.85,
          })
          geo.computeVertexNormals()
          const group = new THREE.Group()
          group.add(new THREE.Mesh(geo, mat))
          resolve(group)
        }, undefined, reject)
        break
      }
      case 'obj': {
        const doLoad = (materials) => {
          const loader = new OBJLoader()
          if (materials) {
            materials.preload()
            loader.setMaterials(materials)
            loader.load(url, resolve, undefined, reject)
          } else {
            loader.load(url, obj => {
              obj.traverse(n => {
                if (n instanceof THREE.Mesh && !n.material?.map) {
                  n.material = new THREE.MeshStandardMaterial({
                    color: '#f5a623',
                    metalness: 0.05,
                    roughness: 0.9,
                  })
                }
              })
              resolve(obj)
            }, undefined, reject)
          }
        }
        if (mtlUrl) {
          const mtlLoader = new MTLLoader()
          if (mtlBasePath) mtlLoader.setPath(mtlBasePath)
          mtlLoader.load(mtlUrl, doLoad, undefined, () => doLoad(null))
        } else {
          doLoad(null)
        }
        break
      }
      default:
        reject(new Error(`Unsupported format: .${extension}`))
    }
  })
}

/* ──────────────────────────────────────────────────────────
   Center + normalise an Object3D to fit a ~3-unit sphere
────────────────────────────────────────────────────────── */
function normaliseObject(obj) {
  const box    = new THREE.Box3().setFromObject(obj)
  const center = box.getCenter(new THREE.Vector3())
  const size   = box.getSize(new THREE.Vector3())
  const scale  = 3 / Math.max(size.x, size.y, size.z, 0.001)
  obj.scale.setScalar(scale)
  obj.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
}

/* ──────────────────────────────────────────────────────────
   Default mesh: a torus knot rendered per-format style
   (shown when the user hasn't loaded a file yet)
────────────────────────────────────────────────────────── */
function DefaultMesh({ format, mode }) {
  const ref = useRef()

  // Slow auto-rotation
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.4
  })

  const geo = new THREE.TorusKnotGeometry(1, 0.36, 120, 24)

  // Per-format material style
  const material = (() => {
    if (format === 'stl') {
      return new THREE.MeshStandardMaterial({
        color: '#4fc3f7',
        flatShading: true,   // mimics STL per-face normals
        metalness: 0.1,
        roughness: 0.85,
      })
    }
    if (format === 'obj') {
      return new THREE.MeshStandardMaterial({
        color: '#f5a623',
        metalness: 0.05,
        roughness: 0.9,
      })
    }
    // gltf – PBR smooth
    return new THREE.MeshStandardMaterial({
      color: '#a5d6a7',
      metalness: 0.55,
      roughness: 0.35,
    })
  })()

  if (mode === 'wireframe') {
    return (
      <group ref={ref}>
        <lineSegments>
          <edgesGeometry args={[geo]} />
          <lineBasicMaterial color={format === 'stl' ? '#4fc3f7' : format === 'obj' ? '#f5a623' : '#a5d6a7'} />
        </lineSegments>
      </group>
    )
  }

  if (mode === 'points') {
    return (
      <group ref={ref}>
        <points>
          <primitive object={geo} />
          <pointsMaterial size={0.025} color={format === 'stl' ? '#4fc3f7' : format === 'obj' ? '#f5a623' : '#a5d6a7'} />
        </points>
      </group>
    )
  }

  return (
    <group ref={ref}>
      <mesh geometry={geo} material={material} castShadow receiveShadow />
      {mode === 'combined' && (
        <lineSegments>
          <edgesGeometry args={[geo]} />
          <lineBasicMaterial color="#ffffff" transparent opacity={0.15} />
        </lineSegments>
      )}
    </group>
  )
}

/* ──────────────────────────────────────────────────────────
   Loaded model scene node – applies render mode
   
   Key design decisions:
   - normalise ONCE on load into a stable normClone ref
   - call updateMatrixWorld(true) before traversal so every node's
     matrixWorld reflects the normalised root transform
   - for wireframe / points: bake node.matrixWorld into a cloned
     geometry (applyMatrix4) → each line/point cloud sits at the
     exact world-space position without needing a transform hierarchy
   - accent color is passed in from the format panel
────────────────────────────────────────────────────────── */
function LoadedModel({ object3D, mode, accentColor = '#ffffff' }) {
  const groupRef   = useRef()
  const normRef    = useRef(null)   // stable deep-clone with normalised transform

  // ── Normalise the object once per new model ──────────────────────────────
  useEffect(() => {
    const clone = object3D.clone(true)
    normaliseObject(clone)
    clone.updateMatrixWorld(true)   // bake transforms into matrixWorld
    normRef.current = clone
  }, [object3D])

  // ── Rebuild scenegraph whenever mode or object changes ───────────────────
  useEffect(() => {
    if (!groupRef.current || !normRef.current) return
    const group = groupRef.current
    const norm  = normRef.current
    group.clear()

    // Re-run updateMatrixWorld in case mode changed before the first effect settled
    norm.updateMatrixWorld(true)

    /* ── Solid (or Combined base) ────────────── */
    if (mode === 'solid' || mode === 'combined') {
      group.add(norm.clone(true))
    }

    /* ── Wireframe overlay ───────────────────── */
    if (mode === 'wireframe' || mode === 'combined') {
      const wireGroup = new THREE.Group()
      norm.traverse(node => {
        if (!(node instanceof THREE.Mesh) || !node.geometry) return

        // Clone geometry and bake the full world matrix (translation + rotation + scale)
        const baked = node.geometry.clone()
        baked.applyMatrix4(node.matrixWorld)

        const edges = new THREE.EdgesGeometry(baked)
        wireGroup.add(new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({
            color: accentColor,
            transparent: true,
            opacity: mode === 'combined' ? 0.35 : 0.85,
          })
        ))
      })
      group.add(wireGroup)
    }

    /* ── Points overlay ──────────────────────── */
    if (mode === 'points') {
      const ptGroup = new THREE.Group()
      norm.traverse(node => {
        if (!(node instanceof THREE.Mesh) || !node.geometry) return

        const baked = node.geometry.clone()
        baked.applyMatrix4(node.matrixWorld)

        ptGroup.add(new THREE.Points(
          baked,
          new THREE.PointsMaterial({
            size: 0.012,
            color: accentColor,
            sizeAttenuation: true,
          })
        ))
      })
      group.add(ptGroup)
    }
  }, [object3D, mode, accentColor])

  return <group ref={groupRef} />
}

/* ──────────────────────────────────────────────────────────
   Main export: hook for other files to use
   (actual JSX panels are in App.jsx)
────────────────────────────────────────────────────────── */
export { gatherStats, loadModelFromUrl, normaliseObject, DefaultMesh, LoadedModel }

// Name of the bundled default model (placed in threejs/public/models/)
export const DEFAULT_MODEL_NAME = 'ship_in_a_bottle'
