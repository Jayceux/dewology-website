// ─────────────────────────────────────────────────────────────
//  What makes glass read as photographed glass on a light background,
//  which real-time refraction of a plain pink page cannot give:
//   - dark edges: at its outline, glass bends in light from the darker
//     studio around it (photographers call it bright-field lighting), so
//     every bottle has crisp deep-rose edges fading inwards
//   - a light band in the liquid: side light focused through a round
//     bottle glows on the far side (the key light is on the left, so the
//     band sits right of centre)
//  Set per material in the studio as userData.glass (it travels in the
//  .glb), applied here to the material's shader.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';

export function applyGlassLook(material) {
  const g = material.userData?.glass;
  if (!g || material.userData.glassApplied) return;
  material.userData.glassApplied = true;
  const uniforms = {
    uEdgeAmt: { value: g.edge ?? 0.6 },
    uEdgePow: { value: g.edgePow ?? 3 },
    uEdgeTint: { value: new THREE.Color(...(g.edgeTint ?? [0.42, 0.14, 0.2])) },
    uGlowAmt: { value: g.glow ?? 0 },
    uGlowCol: { value: new THREE.Color(...(g.glowCol ?? [1, 0.72, 0.78])) },
    uGlowAt: { value: g.glowAt ?? 0.42 },
  };
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uEdgeAmt;\nuniform float uEdgePow;\nuniform vec3 uEdgeTint;\nuniform float uGlowAmt;\nuniform vec3 uGlowCol;\nuniform float uGlowAt;',
      )
      .replace(
        '#include <transmission_fragment>',
        `#include <transmission_fragment>
        {
          // facing us = 1, at the outline = 0
          float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
          float edge = pow(1.0 - facing, uEdgePow);
          // the band of focused light, right of centre, gone at the edges
          float band = exp(-pow((normal.x - uGlowAt) / 0.16, 2.0)) * (1.0 - edge) * facing;
          totalDiffuse = totalDiffuse * mix(vec3(1.0), uEdgeTint, clamp(edge * uEdgeAmt, 0.0, 1.0)) + uGlowCol * band * uGlowAmt;
        }`,
      );
  };
  material.customProgramCacheKey = () => 'dewology-glass-look';
  material.needsUpdate = true;
}
