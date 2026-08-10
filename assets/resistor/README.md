# Resistor (Blender source)

- **`resistor.blend`** — editable source of truth
- **`public/models/resistor.glb`** — Draco-compressed runtime asset

The asset uses breadboard-hole-pitch units and exports with +Y up. Its fixed
terminal anchors are three world units apart, so the resistor fits `f1` to `d1`
across the breadboard's center channel without scaling.

Runtime contract:

- Root: `Resistor`
- Visual body: `ResistorVisual_Body`
- Combined visual leads: `ResistorVisual_Leads`
- Configurable bands: `band_1` through `band_6`, tagged `role = "resistor-band"`
- Terminal anchors: `anchor_ResistorA` and `anchor_ResistorB`, tagged
  `role = "terminal-anchor"` with terminals `a` and `b`
- Selection target: `hitbox_Resistor`, tagged `role = "hitbox"`

The app currently shows four bands: two significant digits, multiplier, and a
gold tolerance band. Band geometry comes from Blender; visibility and shared
runtime materials come from the resistor's `ohms` value.

The band meshes follow the body profile with approximately `0.008` units of
surface clearance. Their authored and runtime finishes are matte (`0.82`
roughness); the gold band uses restrained `0.15` metalness.

Export one embedded GLB with Draco compression enabled. Include custom
properties, convert the editable lead curve to a mesh for export, and omit
textures, UVs, animations, cameras, and lights. Disable the glTF exporter's
`+Y Up` conversion: this source is already authored with Y as its vertical
axis, so enabling that conversion rotates the resistor onto the breadboard.
