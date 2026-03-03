/**
 * wavelengthToColor.js
 * Convierte longitud de onda (nm) a color RGB usando el algoritmo de Dan Bruton.
 * Rango válido: 380–780 nm (espectro visible).
 *
 * Referencia: https://www.physics.sfasu.edu/astro/color/spectra.html
 */

export function wavelengthToRGB(wavelength) {
  let r = 0, g = 0, b = 0;

  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0;
    g = (wavelength - 440) / (490 - 440);
    b = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0;
    g = 1;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1;
    g = -(wavelength - 645) / (645 - 580);
    b = 0;
  } else if (wavelength >= 645 && wavelength <= 780) {
    r = 1;
    g = 0;
    b = 0;
  }

  // Atenuación en los extremos del espectro visible
  let factor;
  if (wavelength >= 380 && wavelength < 420) {
    factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
  } else if (wavelength >= 420 && wavelength <= 700) {
    factor = 1.0;
  } else if (wavelength > 700 && wavelength <= 780) {
    factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
  } else {
    factor = 0.0;
  }

  const gamma = 0.8;
  r = r > 0 ? Math.pow(r * factor, gamma) : 0;
  g = g > 0 ? Math.pow(g * factor, gamma) : 0;
  b = b > 0 ? Math.pow(b * factor, gamma) : 0;

  return [r, g, b];
}

/**
 * Devuelve un string hex "#rrggbb" a partir de longitud de onda en nm.
 */
export function wavelengthToHex(wavelength) {
  const [r, g, b] = wavelengthToRGB(wavelength);
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Constantes físicas
 */
export const PLANCK_CONSTANT = 6.626e-34;   // J·s
export const SPEED_OF_LIGHT  = 2.998e8;     // m/s
export const BOLTZMANN_CONST = 1.381e-23;   // J/K

/**
 * Calcula energía de un fotón dada la longitud de onda en nm.
 * E = hν = hc/λ
 * Retorna energía en eV.
 */
export function photonEnergy(wavelengthNm) {
  const lambdaM = wavelengthNm * 1e-9;
  const E_joules = (PLANCK_CONSTANT * SPEED_OF_LIGHT) / lambdaM;
  return E_joules / 1.602e-19; // convertir a eV
}

/**
 * Calcula frecuencia (THz) a partir de longitud de onda en nm.
 */
export function wavelengthToFrequency(wavelengthNm) {
  const lambdaM = wavelengthNm * 1e-9;
  return (SPEED_OF_LIGHT / lambdaM) / 1e12; // en THz
}

/**
 * Nombres de las regiones del espectro electromagnético.
 */
export const SPECTRUM_REGIONS = [
  { name: 'Rayos Gamma', min: 0.001, max: 0.01, color: '#6a0dad' },
  { name: 'Rayos X',     min: 0.01,  max: 10,   color: '#8b5cf6' },
  { name: 'Ultravioleta', min: 10,   max: 380,  color: '#a78bfa' },
  { name: 'Visible',      min: 380,  max: 780,  color: '#ffffff' },
  { name: 'Infrarrojo',   min: 780,  max: 1e6,  color: '#ef4444' },
  { name: 'Microondas',   min: 1e6,  max: 1e9,  color: '#f97316' },
  { name: 'Radio',        min: 1e9,  max: 1e13, color: '#eab308' },
];
