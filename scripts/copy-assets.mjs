// Cross-platform asset copy for the production build.
// Bundles the runtime assets the server reads at startup into `dist/` so the
// compiled output can be deployed on its own. Uses Node's fs.cpSync so it works
// on Windows, macOS, and Linux (unlike `cp -r`, which is Unix-only).
import { cpSync, existsSync } from "node:fs"

// The API loads its dataset from `data/` and serves the spec from openapi.yaml.
cpSync("data", "dist/data", { recursive: true })
cpSync("openapi.yaml", "dist/openapi.yaml")

// Static media assets (icons, audio). Optional — only present once added.
if (existsSync("assets")) cpSync("assets", "dist/assets", { recursive: true })
