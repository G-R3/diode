# Battery (Blender source)

- **`battery.blend`** — editable source of truth
- **`public/models/battery.glb`** — Draco-compressed runtime asset

The asset uses the app's existing battery coordinate contract:

- GLB is +Y up
- body size is `7 × 3.4 × 4.4` (X/Y/Z)
- local origin is at the center of the body
- negative and positive sockets are centered at local X `-1.8` and `+1.8`
- each rectangular socket is `0.72 × 0.384 × 0.72` (X/Y/Z)

The two black socket meshes are the complete visual connection interface. They
are ready for future paired red/black cables with rectangular connector
housings; there are no separate cylindrical contact meshes.

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
connectors should terminate at these anchors.

`hitbox_Battery` is the authored large-asset selection volume. It carries
`role = "hitbox"` and a transparent material. The app owns its raycast and
selection/debug visibility behavior.

The model intentionally uses only small beveled meshes and flat PBR materials:
no textures, cables, subdivision surfaces, or continuously animated effects.
