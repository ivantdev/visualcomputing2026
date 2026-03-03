/**
 * PrismDispersion.jsx
 *
 * Simulación 3D de la dispersión de luz blanca a través de un prisma.
 * Demuestra cómo diferentes longitudes de onda se refractan con ángulos
 * distintos según la ley de Snell, separando los colores del espectro.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { wavelengthToRGB } from '../utils/wavelengthToColor'

const NUM_RAYS = 14

/* ── Triangular prism geometry (manually built so orientation is correct) ── */
function PrismMesh() {
  const geometry = useMemo(() => {
    // Triángulo equilátero en el plano XY, extruido en Z
    const s = 1.3
    const h = s * Math.sqrt(3) / 2 // altura del triángulo

    // Vértices del triángulo (centrado en Y)
    const A = new THREE.Vector3(0, h * 0.6, 0)          // punta superior
    const B = new THREE.Vector3(-s / 2, -h * 0.4, 0)    // inferior izquierda
    const C = new THREE.Vector3(s / 2, -h * 0.4, 0)     // inferior derecha

    const depth = 1.0
    const dz = depth / 2

    // Front face (z = +dz) and back face (z = -dz)
    const Af = A.clone().setZ(dz), Bf = B.clone().setZ(dz), Cf = C.clone().setZ(dz)
    const Ab = A.clone().setZ(-dz), Bb = B.clone().setZ(-dz), Cb = C.clone().setZ(-dz)

    const positions = []
    const normals = []

    // Helper: push a triangle
    const tri = (p1, p2, p3, n) => {
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z)
      for (let i = 0; i < 3; i++) normals.push(n.x, n.y, n.z)
    }

    // Front face
    tri(Af, Bf, Cf, new THREE.Vector3(0, 0, 1))
    // Back face
    tri(Ab, Cb, Bb, new THREE.Vector3(0, 0, -1))

    // Side faces (quads = 2 tris each)
    const quad = (p1, p2, p3, p4) => {
      const edge1 = new THREE.Vector3().subVectors(p2, p1)
      const edge2 = new THREE.Vector3().subVectors(p3, p1)
      const n = new THREE.Vector3().crossVectors(edge1, edge2).normalize()
      tri(p1, p2, p3, n)
      tri(p2, p4, p3, n)
    }

    // Left face: A-B front/back
    quad(Ab, Af, Bb, Bf)
    // Right face: A-C front/back
    quad(Af, Ab, Cf, Cb)
    // Bottom face: B-C front/back
    quad(Bf, Bb, Cf, Cb)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    return geo
  }, [])

  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial
        color="#aad4ee"
        transparent
        opacity={0.35}
        roughness={0.05}
        metalness={0.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/* ── Prism wireframe (edges) ── */
function PrismEdges() {
  const lineGeo = useMemo(() => {
    const s = 1.3
    const h = s * Math.sqrt(3) / 2
    const A = [0, h * 0.6]
    const B = [-s / 2, -h * 0.4]
    const C = [s / 2, -h * 0.4]
    const dz = 0.5

    const edges = [
      // Front triangle
      [A[0], A[1], dz], [B[0], B[1], dz],
      [B[0], B[1], dz], [C[0], C[1], dz],
      [C[0], C[1], dz], [A[0], A[1], dz],
      // Back triangle
      [A[0], A[1], -dz], [B[0], B[1], -dz],
      [B[0], B[1], -dz], [C[0], C[1], -dz],
      [C[0], C[1], -dz], [A[0], A[1], -dz],
      // Connecting edges
      [A[0], A[1], dz], [A[0], A[1], -dz],
      [B[0], B[1], dz], [B[0], B[1], -dz],
      [C[0], C[1], dz], [C[0], C[1], -dz],
    ]

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(edges.flat(), 3))
    return geo
  }, [])

  return (
    <lineSegments geometry={lineGeo}>
      <lineBasicMaterial color="#88c8e8" transparent opacity={0.6} />
    </lineSegments>
  )
}

/* ── Main component ── */
export default function PrismDispersion({ animate = true }) {
  const groupRef = useRef()
  const timeRef = useRef(0)
  const raysRef = useRef([])

  // Punto donde el rayo blanco entra al prisma (cara izquierda)
  const entryPoint = [-0.42, 0.1, 0]
  // Punto donde los rayos salen del prisma (cara derecha)
  const exitPoint = [0.42, 0.1, 0]

  // Rayos de salida del espectro dispersado
  const rays = useMemo(() => {
    const result = []
    for (let i = 0; i < NUM_RAYS; i++) {
      const t = i / (NUM_RAYS - 1)
      const wl = 380 + t * 400
      const [r, g, b] = wavelengthToRGB(wl)
      // Violeta (t=0) se desvía más hacia abajo; rojo (t=1) menos
      const angle = THREE.MathUtils.mapLinear(t, 0, 1, -0.5, 0.5)
      result.push({ wl, color: new THREE.Color(r, g, b), angle, t })
    }
    return result
  }, [])

  useFrame((_, delta) => {
    if (animate) timeRef.current += delta

    // Pulso viajero en los rayos dispersados
    raysRef.current.forEach((mesh, i) => {
      if (mesh && mesh.material) {
        const phase = Math.sin(timeRef.current * 2.5 - i * 0.2) * 0.5 + 0.5
        mesh.material.opacity = 0.45 + phase * 0.45
      }
    })
  })

  return (
    <group ref={groupRef}>
      {/* ── Prisma triangular ── */}
      <PrismMesh />
      <PrismEdges />

      {/* ── Rayo de entrada: luz blanca (horizontal, desde la izquierda) ── */}
      <mesh position={[(-4.5 + entryPoint[0]) / 2, entryPoint[1], 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, Math.abs(-4.5 - entryPoint[0]), 8]} />
        <meshBasicMaterial color="#fffff0" toneMapped={false} />
      </mesh>

      {/* Glow del rayo de entrada */}
      <mesh position={[(-4.5 + entryPoint[0]) / 2, entryPoint[1], 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, Math.abs(-4.5 - entryPoint[0]), 8]} />
        <meshBasicMaterial color="#fffff0" transparent opacity={0.08} toneMapped={false} />
      </mesh>

      {/* Etiqueta "Luz blanca" */}
      <Text position={[-3.5, entryPoint[1] + 0.4, 0]} fontSize={0.22} color="#fffff0" anchorX="center">
        Luz blanca
      </Text>

      {/* ── Rayos dispersados (desde la cara derecha del prisma) ── */}
      {rays.map((ray, i) => {
        const len = 4.0
        const angle = ray.angle
        const sx = exitPoint[0]
        const sy = exitPoint[1]
        const ex = sx + len * Math.cos(angle)
        const ey = sy + len * Math.sin(angle)
        const mx = (sx + ex) / 2
        const my = (sy + ey) / 2
        const dist = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2)
        const rot = Math.atan2(ey - sy, ex - sx)

        return (
          <group key={i}>
            {/* Rayo coloreado */}
            <mesh
              ref={(el) => { raysRef.current[i] = el }}
              position={[mx, my, 0]}
              rotation={[0, 0, rot]}
            >
              <boxGeometry args={[dist, 0.028, 0.028]} />
              <meshBasicMaterial
                color={ray.color}
                transparent
                opacity={0.85}
                toneMapped={false}
              />
            </mesh>
            {/* Glow sutil */}
            <mesh position={[mx, my, 0]} rotation={[0, 0, rot]}>
              <boxGeometry args={[dist, 0.09, 0.09]} />
              <meshBasicMaterial
                color={ray.color}
                transparent
                opacity={0.06}
                toneMapped={false}
              />
            </mesh>
            {/* Etiquetas de longitud de onda (cada 3) */}
            {(i === 0 || i === Math.floor(NUM_RAYS / 3) || i === Math.floor(2 * NUM_RAYS / 3) || i === NUM_RAYS - 1) && (
              <Text
                position={[ex + 0.15, ey, 0]}
                fontSize={0.17}
                color={ray.color}
                anchorX="left"
              >
                {`${ray.wl.toFixed(0)} nm`}
              </Text>
            )}
          </group>
        )
      })}

      {/* ── Rayo interno (dentro del prisma, representación simplificada) ── */}
      {(() => {
        const sx = entryPoint[0]
        const sy = entryPoint[1]
        const ex = exitPoint[0]
        const ey = exitPoint[1]
        const mx = (sx + ex) / 2
        const my = (sy + ey) / 2
        const dist = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2)
        const rot = Math.atan2(ey - sy, ex - sx)
        return (
          <mesh position={[mx, my, 0]} rotation={[0, 0, rot]}>
            <boxGeometry args={[dist, 0.04, 0.04]} />
            <meshBasicMaterial color="#fffff0" transparent opacity={0.3} toneMapped={false} />
          </mesh>
        )
      })()}

      {/* ── Etiquetas ── */}
      <Text position={[0, -1.3, 0]} fontSize={0.24} color="#90caf9" anchorX="center">
        {'Prisma (n \u2248 1.5)'}
      </Text>

      <Text position={[0, -1.75, 0]} fontSize={0.17} color="#ffcc80" anchorX="center">
        {'Ley de Snell: n1 sin(t1) = n2 sin(t2)'}
      </Text>

      <Text position={[0, -2.1, 0]} fontSize={0.14} color="#888" anchorX="center">
        {'El indice de refraccion n(l) depende de la longitud de onda'}
      </Text>

      {/* ── Iluminación de ambiente ── */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 4]} intensity={0.4} />
    </group>
  )
}
