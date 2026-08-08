# Battery (Blender source)

- **`battery.blend`** — editable visual source
- **`public/models/battery.glb`** — Draco-compressed runtime asset

The GLB is the source of truth for the battery's physical geometry:

- GLB is +Y up
- body size is `7 × 3.4 × 4.4` (X/Y/Z)
- local origin is at the center of the body
- negative and positive sockets are centered at local X `-1.8` and `+1.8`
- each rectangular socket is `0.72 × 0.384 × 0.72` (X/Y/Z)

The joined black socket mesh is the complete visual connection interface. Its
two socket regions are ready for future paired red/black cables with rectangular
connector housings; there are no separate cylindrical contact meshes.

The black body and graphite terminal band are two material regions on the
single continuous `BatteryVisual_Body` mesh. They are not overlapping shells,
which prevents clipping and z-fighting at the color boundary.

The sockets, `5 VOLTS` label, polarity labels, and red positive mark are kept
within the black material region.

Terminal attachment nodes are exported with no geometry:

- `anchor_BatteryNegative` — `role = "terminal-anchor"`, `terminal = "-"`
- `anchor_BatteryPositive` — `role = "terminal-anchor"`, `terminal = "+"`

Their GLB-local positions are approximately `[-1.8, 1.942, -0.618]` and
`[1.8, 1.942, -0.618]`. Both current tube wires and future rectangular cable
connectors terminate at these anchors. The app discovers them through their
`role` and `terminal` properties; their coordinates are not duplicated in
TypeScript.

`hitbox_Battery` is the authored large-asset selection volume. It is a 12
triangle padded box with `role = "hitbox"`. The app keeps it hidden and disables
its raycast until sandbox dragging is implemented.

The runtime asset contains 724 triangles including the hitbox, five mesh nodes,
six primitives, and five visible material primitives. It has no textures, UV
attributes, double-sided materials, cables, subdivision surfaces, or animated
effects.

Export checklist:

- Export one embedded GLB with +Y up and Draco compression enabled.
- Include custom properties so terminal and hitbox roles remain discoverable.
- Do not export textures, UVs, animations, cameras, lights, skins, or morphs.
- Keep backface culling enabled on every material.
- Verify both anchors remain parented under `Battery` and tagged with `+` or `-`.
