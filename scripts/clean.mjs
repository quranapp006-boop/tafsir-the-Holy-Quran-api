// Cross-platform `clean`: remove the build output directory.
// Uses Node's fs so it works identically on Windows, macOS, and Linux
// (unlike `rm -rf`, which is Unix-only).
import { rmSync } from "node:fs"

rmSync("dist", { recursive: true, force: true })
