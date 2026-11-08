# Factory Layout Architect

A browser-based factory layout editor and deterministic flow simulator. No install or API key is required to use the hosted application.

## Features

- The lines 1–4 cost centre has two processing/boarding/packing sets; the lines 5–8 cost centre has four sets. Each of the six cells has its own completion pallet immediately after packing. The eight knitting lines and six unassorted/short-carton/leftover locations are retained. Short-carton and leftover routes continue from each cell's completion pallet through the aisle. The floor extends downward, with whole-floor, cost-centre, top-floor, and individual-cell views. Six simultaneous looping flows illustrate the six cells.

- Expanded Plant 4: equal left and right equipment banks share one central aisle. Knitting lines 1–4 occupy the left bank and lines 5–8 the right. Each bank has its own unassorted, short-carton, and leftover stock locations, Triveneta dryer, HS Ghibli, packing table, and complete-carton store. Routes and looping playback run on both banks. Whole-floor and individual-bank views preserve editable full-size footprints.

- Continuous flow playback: a large highlighted trolley traverses the selected Plant 4 route and repeats until paused. Stops use compressed illustrative timing; production counters remain unchanged. Use the separate numeric model for capacity, stock, and lead-time calculations.

- Plant 4 reference layout: knitting lines 5–8, knitting boundary wall, central and material movement aisles, unassorted/short-carton/leftover stock areas, Triveneta dryer, HS Ghibli finishing, packing, and complete cartons. Four selectable material-flow scenarios follow aisle-based polylines; route lengths and moving material use the same paths. Video stock figures are reference location counts, not verified buffer capacities or unit conversions. Dimensions, cycle times, batch sizes, and delays are illustrative pending engineering data.

- Textile factory demo: knitting hall, dyeing/washing and drying area, finishing and inspection area, linked greige/processed/finished stock buffers, editable processing lags, and dispatch. Machine illustrations distinguish knitting heads, dyeing drums, and finishing rollers. Demo operating values are illustrative; the model treats material as equivalent units, without yarn-to-fabric mass conversion or process loss.

- Place, drag, duplicate, edit, and delete machines, workstations, buffers, and conveyors.
- Connect operations and remove individual routes from object properties.
- Configure cycle times, parallel equipment, starting WIP, hold delays, buffer limits, transport speed, and shift length.
- Run, pause, resume, and reset simulations with output, WIP, lead time, queue, and distance metrics.
- Generate editable layouts from simple comma-separated process descriptions.
- Autosave configuration in the current browser; export/import validated JSON projects.
- View and download engineering reports.

## Use locally

With Node.js 22 or later:

```
npm start
```

Open the address printed by the server. Alternatively, open index.html directly; browser storage availability depends on browser settings.

## Verification

```
npm test
```

Tests cover sample-shift material conservation, finite buffer reservations, cycle-time delays, object initialization, text/report switching, parsing, project validation, project roundtrips, and shift termination.

## Hosting

Requested Firebase Hosting address:

https://factory-layout-architech.web.app/

The address becomes usable after the first successful Firebase deployment. The Application checks workflow runs regression tests on pushes and pull requests. Hosting uses the factory-layout-architech Firebase project and site. To publish with an authorized Firebase account:

```
npx -y firebase-tools@latest login
npm run deploy
```

Only the three public application files are included in the build. Firebase credentials must never be committed to the repository. Continuous deployment requires a separately authorized GitHub-to-Firebase identity; no credentials are embedded in this project.

## Model and data limitations

This is a scenario planning application, not a certified engineering digital twin. The deterministic model uses 0.1-minute steps and fractional aggregate material. Operations use count × 60 / cycle-seconds throughput. Source operations assume unlimited external supply. Processing latency and hold delays precede release; travel uses straight center-to-center distance. Branching routes split flow evenly. Finite node capacity includes incoming reservations and processing material; congestion blocks upstream release. Terminal nodes count outgoing material as completed output.

No downtime, shift breaks, labor sharing, collision detection, CAD/photo interpretation, AI service, cloud database, authentication, or collaborative editing is included. Conveyors are passive transfer objects. Layout edits reset simulation results. JSON export stores scenario configuration rather than a resumable simulation checkpoint. Browser autosave is specific to the browser and site origin; use JSON export to transfer layouts or keep backups.

## Source layout

- index.html: interface
- styles.css: responsive presentation
- app.js: editor, storage, parser, reports, simulation
- tests/app.test.cjs: dependency-free regression tests
- server.cjs: optional local static server
- .github/workflows/checks.yml: automated regression checks
- firebase.json and .firebaserc: Firebase Hosting configuration
- build.cjs: public deployment bundle
