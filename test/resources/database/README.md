# VDJdb test fixture

A 2,000 row subset of VDJdb, checked in so the test suite can boot a Play application without
touching the network.

## Why it exists

`BaseTestSpecWithApplication` builds a real Guice application, which constructs `Database`. With no
local database present, `Database.createInstanceFromConfiguration` falls through to
`new VdjdbInstance()`, and that calls `Util.checkDatabase()` — which **downloads the entire VDJdb**
before any assertion runs. That made every app-backed spec impractical in CI, which is why CI ran no
tests at all until this fixture existed.

`BaseTestSpecWithApplication` points `application.database.path` here.

## What it is

| | |
|---|---|
| Rows | 2,000 (+ header) |
| Columns | 27 — identical to production |
| Size | ~1.8 MB |
| Selection | every 114th row of the production file |

Deterministic by construction: the same input file always yields the same fixture. A fixture that
resampled per run would turn a test failure into a guessing game.

Every 114th row rather than the first 2,000, because the source file is grouped by reference — taking
the head would produce a fixture that is almost entirely one study.

Coverage of the properties the existing specs depend on:

| Property | Count |
|---|---|
| gene TRB | 1,583 |
| gene TRA | 418 |
| vdjdb.score 0 | 1,786 |
| vdjdb.score 1 | 83 |
| vdjdb.score 2 | 43 |
| vdjdb.score 3 | 89 |
| mhc.class MHCI | 1,847 |
| mhc.class MHCII | 154 |
| cdr3 length 9–10 | 20 |
| evidence.validation.independent = true | 97 |
| species HomoSapiens | 1,822 |
| species MusMusculus | 164 |
| species MacacaMulatta | 15 |

## What it is not

No `cluster_members*.txt`, `motif_pwms*.txt`, `structures_metadata.tsv` or motif charts sit alongside
it. `Database.getClusterMembersFile` and friends return `None`, and `Motifs` / `Structures` degrade to
empty tables. Nothing currently asserts on them; a spec that needs motif or structure data has to add
those fixtures too, rather than assume they are here.

## Provenance and rebuilding

See `SOURCES.md` at the repository root.
