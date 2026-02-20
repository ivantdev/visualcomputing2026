// ─────────────────────────────────────────────────────────────
// Lambert Fragment Shader
//
// Modelo de reflexión difusa (Lambert):
//   L_d = k_d * I * max(dot(N, L), 0)
//
//   N = normal de superficie (normalizada)
//   L = dirección hacia la luz (normalizada)
//   k_d = color difuso del material
//   I = intensidad/color de la luz
//
// Solo captura energía proporcional al coseno del ángulo de incidencia.
// No produce especular – la superficie se ve "mate" (matte).
// ─────────────────────────────────────────────────────────────

precision highp float;

varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3  uLightPos;        // Posición de la luz en espacio de vista
uniform vec3  uLightColor;      // Color/intensidad de la luz puntual
uniform vec3  uAmbientColor;    // Luz ambiental (aproximación muy simple)
uniform vec3  uDiffuseColor;    // Color difuso (k_d) del material

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightPos - vPosition);  // Dirección hacia la luz

  // Componente ambiental – constante, independiente del ángulo
  vec3 ambient = uAmbientColor * uDiffuseColor;

  // Componente difusa – Lambert's cosine law
  float NdotL   = max(dot(N, L), 0.0);
  vec3  diffuse = uLightColor * uDiffuseColor * NdotL;

  vec3 color = ambient + diffuse;

  // Corrección gamma simple (sRGB ≈ sqrt)
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(color, 1.0);
}
