# Legacy build integration

Use the separate `vdjdb-db` web co-deliverable. Ordinary legacy exports retain
22 columns; the web projection has 27. The server resolves plain and gzip table
names, including motif and structure metadata tables. Do not run the historical
reconciliation scripts over the new projection.

Build the projection/charts in the database checkout using its pinned environment:

```sh
vdjdb make web --tables out/tables --out out/web
# release --with-web also generates charts from the already-built motif tables.
vdjdb release TAG --with-web --dry-run
```

Prepare structure assets from the local dataset mirror into a fresh directory.
Run the map and metadata tools in a TCRen environment with shared SVG bounds
support (`render_complementarity_map(..., bounds=...)`). Keep the pinned source
and environment recipe together; recreate the environment on the target machine.

```sh
python tools/prepare_structure_assets.py --help
python tools/build_structures_metadata.py --help
python tools/build_structure_maps.py --help
```

The asset preparer takes the web directory and dataset mirror, copies only
referenced raw coordinate inputs and writes `map-inputs.tsv.gz`. It
requires reviewed native PDB choices when a hash has multiple experiments.
Pass that manifest, the original metadata via `--metadata`, and the prepared
`structure/` output directory to `build_structure_maps.py`. Set `--threads` to the
allocated budget. Receptor and MHC searches run as whole-set batches; rendering
uses the existing bounded TCRen worker API. No previous maps or annotations are
used as computed caches. Exact full junctions (including conserved anchors) and
peptide sequences validate the hash identity and repair legacy display chain
roles. Unknown mismatches fail together for review.

Maps use TCRen canonical coordinates and one shared viewport. HTML embeds the SVG;
there is no duplicate standalone SVG. Original author numbering/insertion codes
remain visible. Each hash has full/simplified HTML, PDB, contacts, coordinates and
`<hash>_all.zip`. The UI's readable ZIP name is a download label, not a server path.

Generate `structures_metadata.tsv[.gz]` beside `native_representatives.tsv` in the
web directory. The adapter reads interface ipTM from `tcr_pmhc_iptm` and model
confidence from `ranking_confidence`. Experimental structures have no predicted
model confidence; their ipTM is displayed as 100% by the requested native convention.
Native structures require a positive TCRen map contact count to be displayed, including
when the predicted-contact evidence flag is absent. Pass `--structure-dir` to the
metadata adapter so displayed counts and zero-contact filtering match the actual
maps. Contact downloads use the same TCRen tables as the maps; their residue
indices are one-based sequence indices. Zero values are preserved. Put prepared
metadata beside `vdjdb.txt[.gz]`
and maps/downloads under `structure/`. Restart the server after replacing assets:
structure availability is indexed at startup.

Configure `application.database.useLocal=true`, `application.database.path` to the
web directory, and `application.motifCharts.path` to its `motif-charts/` directory.
Keep runtime/authentication configuration separate. `Dockerfile.interop` supplies
the legacy Java 8 / Node 11 / Yarn 1.22.19 toolchain natively on ARM64. It is a test
build recipe, not production deployment configuration.

Checks: `tools/test_structure_adapters.py` in the TCRen environment; the normal
Scala tests and frontend browser tests in the legacy toolchain. The database
repository's `docs/legacy-web-interop-plan.md` owns the acceptance audit status.

Immutable prepared releases (stdlib only):

```sh
# Seal already audited final assets; performs hashes/validation, no annotation.
python3 tools/structure_asset_identity.py --web /prepared/web --source-metadata /inputs/metadata.tsv.gz
# Install downloaded artifacts or fetch one explicit GitHub tag.
python3 tools/install_release.py --artifacts /downloaded/release --destination /data/releases
python3 tools/install_release.py --tag TAG --destination /data/releases
```

The installer selects manifest roles `web` and `web-structures`, validates archive
member sets, physical SHA256/byte counts, optional SHA256SUMS, prepared identities,
complete per-hash downloads (including ZIP contents) and motif chart availability.
`--tables-only` explicitly permits a release without structures. Existing release
directories are immutable; failures remove fresh staging and preserve all previous
releases. The command prints the selected root and database/chart configuration.
Changing Docker mounts/configuration and restarting remain explicit operator steps.

Descriptors use `schema_version: 1`. `structure/asset-manifest.json` records
`web_table_sha256`, `source_metadata_sha256`, sorted `hashes`, and `files` entries
with relative `path`, integer `bytes`, and physical `sha256` (including gzip bytes).
`prepared-assets.json` repeats both input hashes and adds
`structures_metadata_sha256` and `structure_manifest_sha256`. No absolute input
paths or dataset provenance are included. The normal preparer writes
`input-digests.json`, map export seals its output, and metrics export validates
both input bindings before recording the prepared identity.

Offline installer regression check: `python3 tools/test_release_installer.py`.

The stdlib installer uses streaming SHA256 (no Python 3.11-only hashing API).
For a manifest-free historical single ZIP, oversized plain TSV/TXT members are
streamed directly into deterministic gzip during staging; modern manifest/sealed
assets retain their original physical bytes. All table rows must match the full
legacy core schema and metadata column order. Standalone metrics/count exports
still accept arbitrary map directories; automatic prepared linkage is written
only for an adjacent sealed `structure/` directory. Explicit sealing remains the
handoff for historical layouts.
Historical manifest-free `--tables-only` installs may omit the entire optional
`motif-charts/` directory (logos still use the required motif table pairs). If that
directory exists, its runtime and every referenced scatter chart must be complete.
Modern `web` bundles always require their charts when motif tables are present.
