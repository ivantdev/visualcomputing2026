/**
 * WaveSimulation.jsx
 *
 * Simula una onda electromagnética en 3D.
 * Muestra los campos eléctrico (E) y magnético (B) perpendiculares,
 * ilustrando la dualidad onda-partícula y la relación λ–ν.
 *
 * Los parámetros de longitud de onda controlan visualmente la frecuencia
 * y el color de la onda.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { wavelengthToRGB } from '../utils/wavelengthToColor'

const POINTS = 200
const WAVE_LENGTH_VISUAL = 6 // longitud visual total del eje de propagación

export default function WaveSimulation({ wavelength = 550 }) {
  const eFieldRef = useRef()
  const bFieldRef = useRef()
  const photonRef = useRef()
  const timeRef = useRef(0)

  // Mapear longitud de onda (nm) a frecuencia visual (ciclos en la escena)
  // Longitudes de onda cortas → más ciclos (mayor frecuencia)
  const cycles = useMemo(() => {
    return THREE.MathUtils.mapLinear(wavelength, 380, 780, 5, 1.8)
  }, [wavelength])

  const [cr, cg, cb] = wavelengthToRGB(wavelength)
  const waveColor = useMemo(() => new THREE.Color(cr, cg, cb), [cr, cg, cb])

  // Velocidad de animación proporcional a la frecuencia
  const speed = useMemo(() => {
    return THREE.MathUtils.mapLinear(wavelength, 380, 780, 3.5, 1.2)
  }, [wavelength])

  useFrame((_, delta) => {
    timeRef.current += delta * speed

    // Actualizar campo eléctrico (eje Y)
    if (eFieldRef.current) {
      const positions = eFieldRef.current.geometry.attributes.position
      for (let i = 0; i < POINTS; i++) {
        const t = i / (POINTS - 1)
        const x = -WAVE_LENGTH_VISUAL / 2 + t * WAVE_LENGTH_VISUAL
        const y = Math.sin(2 * Math.PI * cycles * t - timeRef.current) * 0.8
        positions.setXYZ(i, x, y, 0)
      }
      positions.needsUpdate = true
      eFieldRef.current.material.color.lerp(waveColor, 0.1)
    }

    // Actualizar campo magnético (eje Z) — perpendicular
    if (bFieldRef.current) {
      const positions = bFieldRef.current.geometry.attributes.position
      for (let i = 0; i < POINTS; i++) {
        const t = i / (POINTS - 1)
        const x = -WAVE_LENGTH_VISUAL / 2 + t * WAVE_LENGTH_VISUAL
        const z = Math.sin(2 * Math.PI * cycles * t - timeRef.current) * 0.8
        positions.setXYZ(i, x, 0, z)
      }
      positions.needsUpdate = true
    }

    // Fotón viajando a lo largo de la onda
    if (photonRef.current) {
      const photonT = ((timeRef.current * 0.3) % 1)
      const px = -WAVE_LENGTH_VISUAL / 2 + photonT * WAVE_LENGTH_VISUAL
      const py = Math.sin(2 * Math.PI * cycles * photonT - timeRef.current) * 0.8
      photonRef.current.position.set(px, py, 0)
      photonRef.current.material.emissive.lerp(waveColor, 0.1)
    }
  })

  // Geometría de línea inicial
  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(POINTS * 3)
    for (let i = 0; i < POINTS; i++) {
      const t = i / (POINTS - 1)
      positions[i * 3] = -WAVE_LENGTH_VISUAL / 2 + t * WAVE_LENGTH_VISUAL
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [])

  const lineGeometry2 = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(POINTS * 3)
    for (let i = 0; i < POINTS; i++) {
      const t = i / (POINTS - 1)
      positions[i * 3] = -WAVE_LENGTH_VISUAL / 2 + t * WAVE_LENGTH_VISUAL
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [])

  return (
    <group position={[0, 0, 0]}>
      {/* Eje de propagación */}
      <mesh>
        <cylinderGeometry args={[0.01, 0.01, WAVE_LENGTH_VISUAL, 8]} />
        <meshBasicMaterial color="#444" />
      </mesh>
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.01, 0.01, WAVE_LENGTH_VISUAL, 8]} />
          <meshBasicMaterial color="#444" />
        </mesh>
      </group>

      {/* Campo eléctrico E (oscila en Y) */}
      <line ref={eFieldRef} geometry={lineGeometry}>
        <lineBasicMaterial color={waveColor} linewidth={2} />
      </line>

      {/* Campo magnético B (oscila en Z) */}
      <line ref={bFieldRef} geometry={lineGeometry2}>
        <lineBasicMaterial color="#4fc3f7" linewidth={2} transparent opacity={0.5} />
      </line>

      {/* Fotón (partícula viajando) */}
      <mesh ref={photonRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={waveColor}
          emissive={waveColor}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

      {/* Etiquetas */}
      <Text position={[0, 1.2, 0]} fontSize={0.2} color={[cr, cg, cb]} anchorX="center">
        Campo E (eléctrico)
      </Text>
      <Text position={[0, 0, 1.3]} fontSize={0.2} color="#4fc3f7" anchorX="center">
        Campo B (magnético)
      </Text>
      <Text position={[WAVE_LENGTH_VISUAL / 2 + 0.5, 0, 0]} fontSize={0.18} color="#888" anchorX="left">
        Dirección de propagación →
      </Text>

      {/* Anotación de longitud de onda */}
      <Text position={[0, -1.1, 0]} fontSize={0.22} color="#ffcc80" anchorX="center">
        {`λ = ${wavelength} nm`}
      </Text>
    </group>
  )
}
