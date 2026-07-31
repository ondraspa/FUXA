# Project Boot Instructions & Rules

## 1. Project Overview
- **Name:** FUXA
- **Purpose:** Web-based Process Visualization (SCADA/HMI/Dashboard) software for industrial IoT with real-time data visualization, alarms, reports, and device connectivity (Modbus, OPC-UA, BACnet, MQTT, Siemens S7, etc.).
- **Primary Architecture:** Node.js/Express backend serving a built Angular 18 client, SQLite/PostgreSQL storage, MQTT/Modbus/OPC-UA device integration, Electron desktop shell, Docker deployment.

## 2. Operational Boundaries & Rules
- **No Destructive Actions:** Never execute `rm -rf`, DROP DATABASE, or modify production environment variables without explicit human confirmation.
- **Dependency Discipline:** Do not install new external libraries or cloud APIs if a standard library or existing self-hosted tool can accomplish the task.
- **Testing Protocol:** Always run existing unit tests before proposing code modifications. If adding a new feature, write the test first.

## 3. Communication & Code Style
- **Concise Output:** Avoid conversational filler. Show code diffs or complete functional blocks rather than theoretical snippets.
- **File Referencing:** Always check `MEMORY.md` before asking architectural questions or proposing structural changes.

---

# Persistent Project Memory

## 1. Current System State
- **Active Branch:** `master` (uncommitted changes — connection system + pipe styling + 8 new galvanoplastics widgets)
- **Last Updated:** 2026-07-26
- **Current Phase:** 101 SVG widgets across 9 categories, all FUXA-integrated with snap-to-connect ports.
  - Galvanoplastics expanded from 8 to 15 widgets (added 7 new: wastewater-treatment, deionization-column, water-treatment, wash-station, laminar-flow-booth, drying-booth, chemicals-cabinet, sulfamate-tank)
  - All 101 widgets have: postValue, putValue, MutationObserver, data-port-id
  - Connection system: ConnectionEditorService, ConnectionService, ViewConnection/ConnectionPort/LiquidType models
  - Pipe property UI: liquid type selector with auto-colored pipe/content/border

## 2. Key Architectural Decisions (ADRs)
- **ADR-001 (Widget Format):** SVG widgets are clean hardware illustrations without embedded FUXA scripts (`postValue`/`putValue`/`MutationObserver`). Data binding is handled separately by FUXA's runtime overlay system, keeping the SVGs universal and reusable.
- **ADR-002 (Widget Storage):** Widget SVGs live in `server/_widgets/<category>/` on the filesystem, served both via REST API (`/api/resources/widgets`) and as static assets (`/_widgets/`). No database storage for widget files.
- **ADR-003 (Server Config):** `settings.widgetsFileDir` defaults to `path.resolve(__dirname, '_widgets')`. The settings.js file uses defaults from `settings.default.js` with `secureEnabled` commented out (auth disabled by default).
- **ADR-004 (Client Serving):** Angular SPA is pre-built into `client/dist/` and served by Express. SPA pushState routing is handled via explicit `express.static` mounts for each route (`/editor/`, `/lab/`, etc.) — there is no catch-all `index.html` fallback.

## 3. Active Roadmap & Next Steps
- [x] Fix server dependencies (fontkit bump, hoisted transitive deps)
- [x] Create SVG widget files for 6 new categories (hvac, instruments, piping, pressing, pressing-plant, galvanoplastics)
- [x] Verify widgets API returns all 50 files across 8 categories
- [x] Install Playwright and write 13 passing tests
- [x] Convert widget SVGs to clean hardware illustrations (no embedded scripts/displays)
- [x] Add connection system: ConnectionEditorService, ConnectionService, ViewConnection/ConnectionPort/LiquidType models
- [x] Add liquid-type selector to pipe property UI with auto-colored pipe/content/border
- [x] Update ADR-001 to reflect widgets CAN have embedded scripts for FUXA integration
- [x] Fix 8 classic widgets: rename pv/pt to postValue/putValue (standard FUXA API)
- [x] Add data-port-id ports to ALL 101 widgets (100% coverage)
- [x] All 101 widgets have: postValue, putValue, MutationObserver, data-port-id
- [x] Integrate 8 new galvanoplastics widgets into widgets-database.json with proper variables
- [x] Verify real-time data binding: all database variables match SVG content
- [ ] **CURRENT TASK:** Verify connections persist after project save/load
  - [ ] Wire `propagateLiquidType()` into editor.component.ts when connections are created
  - [ ] Test snap-to-connect in editor: drag widget near another, verify halo appears, drop creates connection
  - [ ] Verify connections persist after project save/load (View.connections array)
- [ ] Add SPA fallback routing in `server/main.js` so Angular pushState routes work without trailing slash
- [ ] Create Angular components and register new shape categories in `GaugesManager` and `shapes.js` loader for svgeditor integration
- [ ] Write browser-based Playwright tests that place widgets on canvas and open property dialogs

## 4. Known Gotchas & Quirks
- **Trailing Slash Required:** `/editor` redirects 301 → `/editor/` which serves `index.html`. Navigating without the trailing slash times out in Playwright because Express has no catch-all route for the SPA.
- **Node v26 Incompatibility:** `mocha@10.8.2` server tests fail on Node.js v26 due to yargs ESM/CJS mismatch. Upgrade to mocha@11 or pin Node <26 to run server tests.
- **Port Reservations:** Default server port is `1881`. Test instances use ports `3001`–`3005`.
- **Auth Disabled by Default:** `secureEnabled` is commented out in `settings.default.js`, so no login dialog appears. The AuthGuard bypasses when the server reports `secureEnabled: false`.
- **Module Scripts Blocked:** `npm install` in the client directory may show "allow-scripts" warnings for esbuild, lmdb, etc. Run `npm approve-scripts` if postinstall scripts fail.
- **Widget Directory Location:** `_widgets/` lives inside `server/` (not the project root), resolved from `__dirname` in `server/main.js`.
- **Remote Layout:** `upstream` → `ondraspa/FUXA` (your fork), `fork` → `ondraspa/FUXA` (same), `vendor` → `frangoteam/FUXA` (original for pulling updates).
