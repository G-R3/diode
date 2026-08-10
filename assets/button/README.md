# Tactile pushbutton (Blender source)

- **`button.blend`** — editable source of truth
- **`public/models/button.glb`** — Draco-compressed runtime asset

The asset is a low-poly 6 mm square, normally-open momentary tactile switch.
It uses breadboard-hole-pitch units (1 unit = 2.54 mm), is authored with +Y
up, and has its origin on the placement surface at the component's bottom
center. The straight-sided black housing is 2.6 mm high, with molded leg-exit
notches, a tightly fitted 0.2 mm metal plate, and a 1.2 mm exposed actuator.
Its pin tips extend 2.8 mm below the housing.

The four pin tips use Diode's two-pitch spacing across the switch and 4.5 mm
spacing along each paired side. Their gentle inward bends keep the switch
believable both across the breadboard center channel and in other valid holes.

Runtime contract:

- Root: `Button`
- Main visuals: `ButtonVisual_Body` and `ButtonVisual_Actuator`. The body is a
  single mesh with separate plastic-housing and metal-top-plate material regions.
- Four physical legs: `ButtonVisual_Leg_A1` through `ButtonVisual_Leg_B2`,
  tagged `role = "button-leg"` and terminal `a` or `b`
- Logical terminal anchors: `anchor_ButtonA` and `anchor_ButtonB`, tagged
  `role = "terminal-anchor"`
- The four legs retain terminal `a`/`b` metadata, so their side pairing remains
  explicit without extra runtime anchor objects
- Pressable actuator: tagged `role = "button-actuator"`, with authored travel
  metadata in `travel_mm` and `pressed_offset_y`
- Selection target: `hitbox_Button`, tagged `role = "hitbox"`

## Editing the legs in Blender

The four source legs are linked Blender Curve objects sharing one six-point
path and the hidden `ButtonLeg_Profile` rectangular bevel object. Select any
leg, enter Edit Mode, and move its control points in Y/Z; all four legs update
together, with the opposite pair mirrored automatically. Point Radius controls
the gradual width/thickness taper along the stamped strip.

The checked-in GLB contains ordinary mesh legs, so there is no curve dependency
or additional runtime cost. After editing the `.blend`, run
`artifacts/export-button-asset.py`; it saves the editable source, converts only
the in-memory export copies, and writes the runtime GLB. Do not run the creation
script after manual curve edits unless you intentionally want to regenerate the
asset from its scripted defaults.

To export manually in Blender, save the editable `.blend`, select the four leg
curves, use **Object > Convert > Mesh**, export the GLB, and then undo or reopen
the saved source so the editable curves are retained. Blender's glTF exporter
does not directly emit custom-profile Curve objects.

Export one embedded GLB with custom properties and Draco compression enabled.
Omit textures, UVs, animations, cameras, and lights. Disable the glTF
exporter's `+Y Up` conversion because this source is already Y-up.
