# Assets

Static media for the Adhkar API, organised by kind and category slug:

```
assets/
├── icons/
│   └── <category-slug>/<n>.png
└── audio/
    └── <category-slug>/<n>.mp3
```

- `<category-slug>` matches the `category` field in the dataset (e.g. `adhan`,
  `the-morning`, `evening`).
- `<n>` is the 1-based position of the item within its category, matching the
  number in the item's `slug` (e.g. `adhan-1` -> `1.png` / `1.mp3`).
- These paths correspond exactly to the `media.icon.src` and
  `media.audio[].src` values in the JSON data.

## Adding real media

The repository ships the full folder structure with `.gitkeep` placeholders so
the layout and the dataset's `src` paths are in place. Drop your real files into
the matching paths and they are served immediately at `/assets/...`:

```
assets/audio/adhan/1.mp3   ->  GET /assets/audio/adhan/1.mp3
assets/icons/adhan/1.png   ->  GET /assets/icons/adhan/1.png
```

## CDN migration

Because the dataset stores logical paths (not absolute URLs), you can later host
this `assets/` directory on a CDN and only rewrite the `/assets` prefix on the
client or via an edge rule — no changes to the JSON data are needed.
