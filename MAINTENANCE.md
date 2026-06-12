# VDJdb-web — Maintenance Notes

Operational memory, caveats, workarounds, and roadmap for `antigenomics/vdjdb-web`.
Keep this current when you change deployment, data handling, or any of the non-obvious
frontend behaviors below. (User-facing docs live in `docs/` Sphinx; this file is for
maintainers.)

## Deployment

- **Build:** GitHub Actions workflow **"Dev Docker Publish (manual)"** with a `tag` input.
  - `tag=dev`  → image `bvdmitri/vdjdb-web:dev` (production image).
  - `tag=devtest` → dev-stack image. Build takes ~3.5–8 min and compiles both the Angular
    frontend and the Scala backend, so a compile error blocks the publish.
  - Run: `gh workflow run "Dev Docker Publish (manual)" --ref master -f tag=dev`.
- **Server (`vdjdb@vdjdb`):**
  - **Prod:** `~/vdjdb_publish` → ports **9000/5000**, domain **vdjdb.com**.
  - **Dev:**  `~/vdjdb_publish_dev` → ports **9001/5001**, domain **vdj3.bvdmitri.me**.
  - Update loop: `cd ~/vdjdb_publish && docker compose pull && docker compose up -d`
    (down/up if needed). Data is a mounted read-only volume (`vdjdb-db/`); container restarts
    keep data intact. Use `chmod 777` when transferring data dirs.
  - Measure resources: `docker stats --no-stream` + `free -h`.
- **Edge proxy** at `178.105.237.254` (pangolin): vdj1=9000, vdj2=5000, vdj3=9001, vdj4=5001.
- **Browser testing** (dev ports are NOT externally reachable): SSH tunnel, e.g.
  `ssh -N -L 9011:localhost:9001 vdjdb@vdjdb` (dev), `-L 9013:localhost:9000` (prod).

## Data caveats

- **Computed `evidence.*` columns:** the deployed DB has **5 computed `evidence.*` columns that
  do NOT exist in raw vdjdb-db releases**. When refreshing data from
  `github.com/antigenomics/vdjdb-db/releases/latest`, do not blow these away — and check whether
  new releases add columns.
- **Motif data** comes from `github.com/antigenomics/vdjdb-motifs/releases/latest`
  (`motif_pwms.txt`, `cluster_members.txt`, plus tcremp variants). **Back up motif- and
  structure-related tables before replacing.** Be careful editing motif/structure data.
- **Phage reclassification (prod):** `web.method='phage'` records were promoted into prod
  `vdjdb.txt` (backup at `promote-backup-2026-06-10/`) so the method filter checkboxes work:
  the "other" bucket must NOT contain phage records. Phage is its own filter bucket.

## Frontend caveats & workarounds

- **`innerHTML` content is NOT reachable by Angular scoped CSS.** The Overview summary
  (`overview.component.ts`) and the Structure contacts plot are injected via `innerHTML`. Style
  them with **global** rules (e.g. `.overview img {...}` in `styles/design-system.css`).
- **Plotly chart in motif is an `<iframe>`** (`/motif-files/{tcrnet,tcremp}/...html`). To hide
  the duplicate epitope title we inject `<style>.gtitle{display:none!important}</style>` into the
  iframe's **same-origin** `contentDocument` on the `(load)` event. Same trick basis for
  cid-trace isolation.
- **Plotly traces are named exactly by `cid`** (plus "Other epitopes"). PWM filtering by selected
  points relies on this: reading visible traces by name → `activeCids`. "No points selected → no
  PWMs" (no show-all fallback). Per-PWM "−" remove button restyles the trace to
  `visible:'legendonly'`.
- **Navbar auto-hide** (`navbar.component.ts`): listens for `scroll` on **window only** (no capture
  phase). It hides only on true full-page scroll (Browse and other tall pages). Motif/Structure are
  fixed-height (`calc(100vh - 104px)`) flex columns that block whole-page scroll, so the header
  **stays put** there by design — inner panel scrolls must NOT move the bar (explicit user
  preference). History: a capture-phase variant that also hid on inner scroll was tried twice
  (`81ef4c8e`, `f46c3582`) and reverted both times — do not reintroduce it.
- **Motif page layout:** body is **static** (must not jump on load); only the right
  `#EpitopesContainer` panel scrolls, and it scrolls down to the linked motif **only** when
  arriving via a Browse deep link. Inner-container scroll uses `scrollWithinContainer` with
  retries `[250, 900, 1800]ms` (not `scrollIntoView`, which moved the whole window). Top frame
  uses `overflow: visible` so the panel's top box-shadow hairline isn't clipped.
- **Cross-tab / cross-page selection memory** (already implemented):
  - **tcrnet↔tcremp:** `setMethod()` captures the selected epitope(s) before `switchMethod()`
    clears state, then re-selects via `resolveEpitopeParams`/`filterByUrl` against the new
    method's tree. `filterByUrl` bails out at any missing tree node, so epitopes present in only
    one method gracefully fall back to "nothing selected". Multi-epitope mode is rebuilt by
    toggling `allowMultiple` and appending each resolved epitope.
  - **Motif↔Structure bridge:** the first selected epitope is tracked and re-opened on the other
    page (`applyBridgeOrLoad`) **only when that page has no selection of its own** — it never
    overrides an explicit selection, and falls back to the empty tree if the epitope is absent.
- **Browse → Motif "M" badge** deep link: the `gene` URL param must be the trimmed MHC allele
  (`mhc.a.replace(/:.+/, '')`), NOT `antigen.gene` (which is "M"). Method order [tcrnet, tcremp]:
  tcrnet-first / tcremp-only / tcrnet-when-both.
- **tcremp "Subtract VDJ rearrangement background" is intentionally disabled** with an explanatory
  tooltip (the background model is tcrnet-specific). Don't re-enable for tcremp.
- **Default TCR chains in Browse = both TRA + TRB** (`tcr-filters.ts` `setDefault`/`isDefault`).
- **refsearch URL is intentionally HARDCODED to `https://vdjdb.com/refsearch/`** — do NOT derive
  it from the current host. It is "safer and managed via DNS on prod" (explicit user instruction;
  a host-derived version was tried and reverted).
- **Social preview image:** `og:image`/`twitter:image` → `https://vdjdb.com/assets/images/paper-splash.png`
  (1200×569, rasterized from the SVG). The Inter Google-Fonts `<link>` in `main.scala.html` escapes
  `@` as `@@` (Twirl template).
- **Yandex Metrika has been fully removed** (РКН). Do not reintroduce analytics without a request.

## Performance notes

- `trackBy` is used on the search-table rows (`row.hash()`), the motif cdr3-cluster list, and
  cached motif cdr3 entries to avoid re-rendering every seqlogo each change-detection pass.
- Navbar scroll/mousemove handlers run **outside** Angular's zone (`ngZone.runOutsideAngular`);
  the zone is re-entered only when visibility flips.
- Availability index (`/api/search/availability`, ~15 MB / ~2.5 MB gzipped) is prefetched.

## TODO / Roadmap

- [ ] Keep this file and the deployment memory in sync after any infra/data/UX change.
