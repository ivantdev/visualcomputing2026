/**
 * EnergyDiagram.jsx
 *
 * Visualización interactiva de la relación E = hν = hc/λ.
 * Muestra barras de energía para distintas longitudes de onda,
 * destacando la relación inversa entre λ y energía del fotón.
 */

import { useMemo } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { wavelengthToRGB, photonEnergy, wavelengthToFrequency } from '../utils/wavelengthToColor'

const WAVELENGTHS = [380, 420, 460, 500, 540, 580, 620, 660, 700, 740, 780]

export default function EnergyDiagram({ wavelength = 550 }) {
  const bars = useMemo(() => {
    return WAVELENGTHS.map((wl) => {
      const [r, g, b] = wavelengthToRGB(wl)
      const energy = photonEnergy(wl)
      const freq = wavelengthToFrequency(wl)
      return { wl, color: new THREE.Color(r, g, b), energy, freq }
    })
  }, [])

  // Energía máx para escala
  const maxEnergy = photonEnergy(380)

  // Datos del indicador actual
  const currentEnergy = photonEnergy(wavelength)
  const currentFreq = wavelengthToFrequency(wavelength)
  const [ccr, ccg, ccb] = wavelengthToRGB(wavelength)

  return (
    <group position={[0, 0, 0]}>
      {/* Título */}
      <Text position={[0, 3.0, 0]} fontSize={0.3} color="#90caf9" anchorX="center">
        Energía del fotón: E = hν = hc/λ
      </Text>

      {/* Barras de energía */}
      {bars.map((bar, i) => {
        const x = -4.5 + i * 0.9
        const height = (bar.energy / maxEnergy) * 3.5
        const isHighlighted = Math.abs(bar.wl - wavelength) < 25

        return (
          <group key={bar.wl}>
            {/* Barra */}
            <mesh position={[x, height / 2 - 1.2, 0]}>
              <boxGeometry args={[0.5, height, 0.3]} />
              <meshStandardMaterial
                color={bar.color}
                emissive={bar.color}
                emissiveIntensity={isHighlighted ? 1.5 : 0.3}
                toneMapped={false}
                transparent
                opacity={isHighlighted ? 1 : 0.6}
              />
            </mesh>

            {/* Etiqueta λ */}
            <Text
              position={[x, -1.5, 0]}
              fontSize={0.16}
              color="#aaa"
              anchorX="center"
              anchorY="top"
            >
              {`${bar.wl}`}
            </Text>

            {/* Etiqueta energía */}
            <Text
              position={[x, height / 2 - 1.2 + height / 2 + 0.2, 0]}
              fontSize={0.14}
              color="#ffcc80"
              anchorX="center"
            >
              {`${bar.energy.toFixed(2)} eV`}
            </Text>
          </group>
        )
      })}

      {/* Etiqueta eje X */}
      <Text position={[0, -1.9, 0]} fontSize={0.2} color="#888" anchorX="center">
        Longitud de onda λ (nm)
      </Text>

      {/* Panel de información actual */}
      <group position={[0, -2.6, 0]}>
        <Text position={[0, 0, 0]} fontSize={0.25} color={[ccr, ccg, ccb]} anchorX="center">
          {`λ = ${wavelength} nm  |  ν = ${currentFreq.toFixed(1)} THz  |  E = ${currentEnergy.toFixed(3)} eV`}
        </Text>
      </group>

      {/* Constantes */}
      <Text position={[0, -3.1, 0]} fontSize={0.15} color="#666" anchorX="center">
        h = 6.626 × 10⁻³⁴ J·s    c = 2.998 × 10⁸ m/s
      </Text>
    </group>
  )
}
