// ─────────────────────────────────────────────────────────────
// Blinn-Phong Fragment Shader
//
// Mejora de Phong propuesta por Jim Blinn (1977):
//   Reemplaza el vector R (reflexión) por el vector H (halfway / bisector)
//
//   H = normalize(L + V)   ← bisectriz entre L y V
//   L_s = k_s * I * max(dot(N, H), 0)^n
//
// Ventajas sobre Phong:
//   ✓ Nunca produce RdotV < 0 → sin artefactos en ángulos grazing
//   ✓ Mejor aproximación física (microsuperficies alineadas con H reflejan hacia V)
//   ✓ Más rápido en hardware clásico (no necesita calcular R)
//   ✓ Es el modelo usado por OpenGL/DirectX fixed-function pipeline
//
// Equivalencia: Blinn-Phong con shininess ≈ 4× Phong produce aspecto similar.
// ─────────────────────────────────────────────────────────────

precision highp float;

varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3  uLightPos;
uniform vec3  uLightColor;
uniform vec3  uAmbientColor;
uniform vec3  uDiffuseColor;
uniform vec3  uSpecularColor;
uniform float uShininess;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightPos - vPosition);
  vec3 V = normalize(-vPosition);

  // Vector halfway – Blinn's key insight
  vec3 H = normalize(L + V);

  // Ambiental
  vec3 ambient = uAmbientColor * uDiffuseColor;

  // Difusa
  float NdotL  = max(dot(N, L), 0.0);
  vec3  diffuse = uLightColor * uDiffuseColor * NdotL;

  // Especular de Blinn-Phong: usa N·H en lugar de R·V
  float NdotH    = max(dot(N, H), 0.0);
  vec3  specular = uLightColor * uSpecularColor * pow(NdotH, uShininess);

  specular *= step(0.0, NdotL);

  vec3 color = ambient + diffuse + specular;
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(color, 1.0);
}
