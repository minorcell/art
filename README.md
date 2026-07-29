# 3D Gaussian Splatting — 玫瑰

Procedurally generated 3D rose using point-based Gaussian splatting with Three.js. The animation transitions from scattered particles into a tight bud, then blooms into a full rose with stem, thorns, and leaves.

## Controls

| Key | Action |
|-----|--------|
| `Space` | Replay the bud → bloom sequence |
| `R` | Reset camera |
| `F` | Front view |
| `T` | Top-down view |
| `A` | Toggle auto-rotate |
| Mouse drag | Orbit camera |
| Scroll | Zoom |

## Project Structure

```
art/
├── index.html
├── styles/
│   └── style.css
├── scripts/
│   └── main.js
└── README.md
```

## Tech

- [Three.js 0.157](https://threejs.org/) — WebGL renderer, custom shaders
- OrbitControls for camera interaction
- Deterministic PRNG for reproducible procedural geometry
- All geometry and animation runs client-side with no dependencies beyond Three.js CDN
