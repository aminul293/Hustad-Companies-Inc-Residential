# PWA Icons — TODO

The following icon files must be added to this directory before the PWA install prompt will work correctly:

- `icon-192.png` — 192×192 px, standard home screen icon
- `icon-512.png` — 512×512 px, splash screen / app store icon
- `icon-maskable-512.png` — 512×512 px, maskable variant (safe zone: center 80%; purpose: "maskable")
- `apple-touch-icon.png` — 180×180 px, referenced by `<link rel="apple-touch-icon">` in layout.tsx

Generate maskable icons at https://maskable.app. Use background color #0a1929.
