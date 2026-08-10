# LED (Blender source)

- **`led.blend`** — editable source of truth
- **`public/models/led.glb`** — Draco-compressed runtime asset

The asset uses breadboard-hole-pitch units and exports with +Y up. Its fixed
terminal anchors are one world unit apart, matching adjacent breadboard holes.

Runtime contract:

- Root: `LED`
- Stateful resin: `LEDVisual_Dome` and `LEDVisual_Rim`, tagged
  `role = "led-resin"`
- Fixed metal assembly: `LEDVisual_Metal`
- Fixed semiconductor die: `LEDVisual_Die`
- Terminal anchors: `anchor_LEDCathode` and `anchor_LEDAnode`, tagged
  `role = "terminal-anchor"` with terminals `a` and `b`
- Selection target: `hitbox_LED`, tagged `role = "hitbox"`

Terminal A is the cathode (−). Terminal B is the anode (+), whose authored
lead extends 0.42 units farther below the placement surface as a polarity cue.
Both anchors remain on local `y = 0` so placement and electrical connectivity
stay aligned with the breadboard.

The red resin is authored at 92% opacity so the internal electrodes remain only
faintly visible. Application code may change only the resin color and emission
because those properties represent LED runtime state.
The runtime glow originates at the exported `LEDVisual_Die` transform.
The silver leads, simplified internal electrodes, die, and bond wire retain
their imported Blender materials.

Export one embedded GLB with Draco compression enabled. Include custom
properties, omit textures, UVs, animations, cameras, and lights, and disable
the glTF exporter's `+Y Up` conversion because this source is already authored
with Y as its vertical axis.
