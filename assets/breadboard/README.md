# Breadboard (Blender source)

- **`breadboard.blend`** — editable source of truth (silkscreen texture is also packed inside)
- for the app, use the 3d model located at: **`public/models/breadboard.glb`**

Export from Blender as glTF Binary (`.glb`), +Y up, Draco on, into `public/models/breadboard.glb`.

Silkscreen must use Principled BSDF with the texture wired to Base Color and Alpha (`blend_method = BLEND`). A Mix/Transparent graph exports as an opaque black plane in glTF. Keep the Silkscreen mesh just above the top face (≈0.01) so it doesn’t z-fight or float.

Labels: solid black `a`–`j` and column numbers (rotated 90° CCW), battery / top-rail (−Z) as the top of the board.
