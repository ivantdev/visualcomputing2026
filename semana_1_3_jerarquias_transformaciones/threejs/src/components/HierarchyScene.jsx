import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { Grid, Line } from '@react-three/drei'
import * as THREE from 'three'

// ─── Grandchild: a small torus attached to each child ───────────────────────
function Grandchild({ offset = [0.8, 0, 0], autoRotate }) {
  const ref = useRef()

  useFrame((_, dt) => {
    if (!ref.current) return
    if (autoRotate) ref.current.rotation.z += dt * 2.5
  })

  return (
    // offset from the parent child node
    <group position={offset}>
      <mesh ref={ref}>
        <torusGeometry args={[0.18, 0.06, 12, 24]} />
        <meshStandardMaterial color="#ff9f43" metalness={0.4} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── Child: a sphere that orbits; carries two grandchildren ─────────────────
function Child({ orbitRadius = 1.6, orbitSpeed = 1, color, autoRotate }) {
  const ref = useRef()
  // Keep track of cumulative angle to orbit independently per child
  const angle = useRef(Math.random() * Math.PI * 2)

  useFrame((_, dt) => {
    if (!ref.current) return
    if (autoRotate) {
      angle.current += dt * orbitSpeed
      ref.current.position.x = Math.cos(angle.current) * orbitRadius
      ref.current.position.z = Math.sin(angle.current) * orbitRadius
    }
    ref.current.rotation.y += dt * 1.2
  })

  return (
    <group ref={ref}>
      {/* Child sphere */}
      <mesh>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.25} />
      </mesh>
      {/* Grandchildren – level 3 of the hierarchy */}
      <Grandchild offset={[0.55, 0, 0]} autoRotate={autoRotate} />
      <Grandchild offset={[-0.55, 0, 0]} autoRotate={autoRotate} />
    </group>
  )
}

// ─── Parent: the root node that carries all children ────────────────────────
function Parent({ position, rotation, scale, autoRotate }) {
  const ref = useRef()

  // Convert degrees → radians for rotation props
  const toRad = deg => (deg * Math.PI) / 180

  useFrame((_, dt) => {
    if (!ref.current || !autoRotate) return
    ref.current.rotation.y += dt * 0.4
  })

  return (
    <group
      ref={ref}
      position={[position.x, position.y, position.z]}
      rotation={[toRad(rotation.x), toRad(rotation.y), toRad(rotation.z)]}
      scale={scale}
    >
      {/* Parent mesh – central cube ---------------------------------------- */}
      <mesh>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#74b9ff" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Axis arrows to make the parent's local axes visible */}
      <arrowHelper
        args={[
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(0, 0, 0),
          1.1,
          0xff4757,
          0.15,
          0.08,
        ]}
      />
      <arrowHelper
        args={[
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, 0, 0),
          1.1,
          0x2ed573,
          0.15,
          0.08,
        ]}
      />
      <arrowHelper
        args={[
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 0, 0),
          1.1,
          0x1e90ff,
          0.15,
          0.08,
        ]}
      />

      {/* Three children at different initial orbit phases ------------------- */}
      <Child orbitRadius={1.7} orbitSpeed={0.9} color="#fd79a8" autoRotate={autoRotate} />
      <Child orbitRadius={1.7} orbitSpeed={0.7} color="#a29bfe" autoRotate={autoRotate} />
      <Child orbitRadius={1.7} orbitSpeed={1.2} color="#55efc4" autoRotate={autoRotate} />
    </group>
  )
}

// ─── HierarchyScene – exported ──────────────────────────────────────────────
export default function HierarchyScene() {
  // ── Leva controls ─────────────────────────────────────────────────────────
  const { autoRotate } = useControls('Animation', {
    autoRotate: { value: true, label: 'Auto Rotate' },
  })

  const position = useControls('Parent – Position', {
    x: { value: 0, min: -5, max: 5, step: 0.01 },
    y: { value: 0, min: -3, max: 3, step: 0.01 },
    z: { value: 0, min: -5, max: 5, step: 0.01 },
  })

  const rotation = useControls('Parent – Rotation (deg)', {
    x: { value: 0, min: -180, max: 180, step: 1 },
    y: { value: 0, min: -180, max: 180, step: 1 },
    z: { value: 0, min: -180, max: 180, step: 1 },
  })

  const { scale } = useControls('Parent – Scale', {
    scale: { value: 1, min: 0.1, max: 3, step: 0.01 },
  })

  return (
    <>
      {/* Ambient + directional lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <pointLight position={[-4, 3, -4]} intensity={0.6} color="#a29bfe" />

      {/* Reference grid */}
      <Grid
        args={[16, 16]}
        position={[0, -1.5, 0]}
        cellColor="#2d2d3a"
        sectionColor="#4a4a66"
        fadeDistance={20}
        receiveShadow
      />

      {/* The three-level hierarchy */}
      <Parent
        position={position}
        rotation={rotation}
        scale={scale}
        autoRotate={autoRotate}
      />
    </>
  )
}
