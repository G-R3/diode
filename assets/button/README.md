# Tactile pushbutton (Blender source)

- **`button.blend`** — editable source of truth
- **`public/models/button.glb`** — Draco-compressed runtime asset

This is a low-poly, normally-open tactile pushbutton built specifically for
Diode's breadboard placement contract. One world unit equals one 2.54 mm hole
pitch, +Y is up, and the placement surface is Y = 0.

## Authored dimensions

- Housing footprint: 6.0 × 5.4 mm (Blender Z fitted to 90%)
- Plastic housing height: 2.5 mm
- Integrated top plate: 5.72 × 5.15 mm and 0.18 mm thick
- Exposed actuator: 2.7 mm nominal diameter and 1.2 mm tall
- Nominal pin-tip grid: 5.08 × 5.08 mm
- Pin insertion: 0.45 mm below the placement surface

Four molded lead pockets with recessed walls and chamfered transitions open
through the housing's lower side edges. The metal strips remain embedded above
those pockets, so the legs read as captured parts of the switch rather than
suspended wires.

The four stamped legs share one editable Blender Curve datablock. Each leg has
a short attachment embedded into the housing, one compact outward jog, and a
short nearly vertical insertion tip. The linked controller curves remain
editable in the `.blend`; changing one silhouette updates all four legs.

`ButtonVisual_Legs` uses the `ButtonLegs_FromEditableCurves` Geometry Nodes
group to turn those controllers into one capped, rectangular stamped-metal
mesh. This keeps curve editing native to Blender while batching the four legs
into one runtime mesh.

Each upper strip is centered 2.40 mm from the housing centerline inside its
molded pocket. A subtle 0.14 mm lateral fan-out along the curve brings the final
tips back to the nominal ±2.54 mm breadboard-hole centers.

## Runtime contract

- Root: `Button`
- Fixed body and integrated plate: `ButtonVisual_Body`
- Movable actuator: `ButtonVisual_Actuator`, tagged
  `role = "button-actuator"`
- Four editable controller curves: `ButtonVisual_Leg_A1` through
  `ButtonVisual_Leg_B2`, tagged `role = "button-leg-controller"` and stored in
  Blender's `glTF_not_exported` collection
- Batched Geometry Nodes output: `ButtonVisual_Legs`, tagged
  `role = "button-legs"`
- Logical anchors: `anchor_ButtonA` and `anchor_ButtonB`, tagged
  `role = "terminal-anchor"`
- Interaction volume: `hitbox_Button`, tagged `role = "hitbox"`

The app stores the explicit A1, A2, B1, and B2 footprint. The anchors coincide
with physical legs A1 and B1 at local positions `[-1, 0, -1]` and
`[1, 0, -1]`. A2 and B2 occupy the corresponding positions on the opposite
rail-facing edge. Placement, rotation, occupancy, and wire conflicts use all
four holes. The simulator permanently pairs A1/A2 and B1/B2, while pressing
the actuator connects the A and B sides.

## Editing and export

Edit geometry and transforms only in `button.blend`. To change the leg
silhouette, select a `ButtonVisual_Leg_*` controller in the Outliner, enter Edit
Mode with Tab, then move its control points with G and the appropriate axis key.
The Geometry Nodes result updates immediately; no curve conversion or duplicate
export mesh is required.

Export with Blender's standard **File > Export > glTF 2.0** command:

1. Select the `Button` hierarchy and enable **Selected Objects**.
2. Use **glTF Binary (.glb)** and export to `public/models/button.glb`.
3. Enable **Custom Properties**, **Apply Modifiers**, and Draco compression.
4. Disable **+Y Up** because the source is already authored with +Y as up.
5. Leave cameras, lights, animations, and textures disabled.

The controller curves are intentionally kept in Blender's special
`glTF_not_exported` collection, so the glTF exporter skips them. It evaluates
`ButtonVisual_Legs` through Geometry Nodes and writes the resulting four legs
as one mesh. No button-specific export or validation script is part of the
asset workflow.
