/**
 * ElectromagneticSpectrum.jsx
 *
 * Visualización 3D del espectro electromagnético.
 * Renderiza una barra espectral con longitudes de onda del visible (380–780 nm)
 * y etiquetas para las regiones UV, Visible e IR.
 * Incluye un indicador interactivo controlado por el slider de Leva.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { wavelengthToRGB } from '../utils/wavelengthToColor'

const BAND_COUNT = 120
const BAR_WIDTH = 8
const BAR_HEIGHT = 1.2

export default function ElectromagneticSpectrum({ wavelength = 550 }) {
  const indicatorRef = useRef()

  // Genera una geometría coloreada con el espectro visible
  const spectrumMesh = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = []
    const colors = []

    const segW = BAR_WIDTH / BAND_COUNT

    for (let i = 0; i < BAND_COUNT; i++) {
      const t = i / (BAND_COUNT - 1)
      const wl = 380 + t * 400 // 380–780 nm
      const [r, g, b] = wavelengthToRGB(wl)

      const x0 = -BAR_WIDTH / 2 + i * segW
      const x1 = x0 + segW
      const y0 = -BAR_HEIGHT / 2
      const y1 = BAR_HEIGHT / 2

      // Dos triángulos por segmento
      positions.push(x0, y0, 0, x1, y0, 0, x0, y1, 0)
      positions.push(x1, y0, 0, x1, y1, 0, x0, y1, 0)

      for (let j = 0; j < 6; j++) {
        colors.push(r, g, b)
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return geometry
  }, [])

  // Posición X del indicador según longitud de onda
  const indicatorX = useMemo(() => {
    const t = (wavelength - 380) / 400
    return -BAR_WIDTH / 2 + t * BAR_WIDTH
  }, [wavelength])

  useFrame(() => {
    if (indicatorRef.current) {
      indicatorRef.current.position.x = THREE.MathUtils.lerp(
        indicatorRef.current.position.x,
        indicatorX,
        0.12
      )
    }
  })

  const [cr, cg, cb] = wavelengthToRGB(wavelength)

  return (
    <group position={[0, 0, 0]}>
      {/* Barra espectral */}
      <mesh geometry={spectrumMesh}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>

      {/* Indicador de longitud de onda */}
      <group ref={indicatorRef} position={[indicatorX, 0, 0.05]}>
        {/* Línea vertical */}
        <mesh>
          <planeGeometry args={[0.04, BAR_HEIGHT + 0.8]} />
          <meshBasicMaterial color="white" transparent opacity={0.9} />
        </mesh>
        {/* Círculo indicador */}
        <mesh position={[0, BAR_HEIGHT / 2 + 0.6, 0]}>
          <circleGeometry args={[0.15, 32]} />
          <meshBasicMaterial color={[cr, cg, cb]} />
        </mesh>
        {/* Etiqueta */}
        <Text
          position={[0, BAR_HEIGHT / 2 + 1.05, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="bottom"
        >
          {`${wavelength} nm`}
        </Text>
      </group>

      {/* Etiquetas del espectro */}
      <Text position={[-BAR_WIDTH / 2 - 0.6, 0, 0]} fontSize={0.25} color="#a78bfa" anchorX="right" rotation={[0, 0, Math.PI / 2]}>
        UV
      </Text>
      <Text position={[0, -BAR_HEIGHT / 2 - 0.4, 0]} fontSize={0.22} color="#ccc" anchorX="center">
        Espectro Visible (380–780 nm)
      </Text>
      <Text position={[BAR_WIDTH / 2 + 0.6, 0, 0]} fontSize={0.25} color="#ef4444" anchorX="left" rotation={[0, 0, -Math.PI / 2]}>
        IR
      </Text>

      {/* Etiquetas de longitudes de onda clave */}
      {[380, 440, 490, 510, 580, 645, 780].map((wl) => {
        const t = (wl - 380) / 400
        const x = -BAR_WIDTH / 2 + t * BAR_WIDTH
        return (
          <Text
            key={wl}
            position={[x, -BAR_HEIGHT / 2 - 0.15, 0]}
            fontSize={0.15}
            color="#888"
            anchorX="center"
            anchorY="top"
          >
            {`${wl}`}
          </Text>
        )
      })}
    </group>
  )
}
