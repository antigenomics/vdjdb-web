# Structure fixture

What `StructuresSpec` points `application.database.path` at. Separate from
`test/resources/database/` on purpose: that fixture deliberately holds no structure files, so
`Structures` there prunes every row and degrades to empty. Useful for pinning the degradation path,
useless for testing anything else.

## What is here

| Path | Contents |
|---|---|
| `vdjdb.txt` | 10 rows drawn from `test/resources/database/vdjdb.txt`, all 27 columns |
| `vdjdb.meta.txt` | copied verbatim from that fixture |
| `structure/<hash>.html` | 9 stub visualizations — a bare `<svg>`, enough for the file to resolve |
| `structure/<hash>_simplified.html` | 5 of the 9, so the `simpleUrl = None` branch is also covered |
| `structures_metadata.tsv` | model metrics, header matching production exactly |

The 10 rows cover three epitopes — `ALAGIGILTV` (HLA-A\*02:01), `ANYKFTLV` (H2-Kb) and `ATDALMTGF`
(HLA-A\*01:01) — each with **both** TRA and TRB rows and a distinct `TCR_hash`. Both chains matter:
`Structures.cdr3` builds a cluster from the unfiltered table while counting matches from the
gene-filtered one, so the normalized score differs between a `BOTH` query and a single-chain query
only if both chains are present.

## Deliberate gaps

These are load-bearing. A test fails if they are filled in.

- **One `TCR_hash` has no `.html` file** — `30aaf0184cc245c2…`, a TRA row of `ANYKFTLV`. `Structures`
  prunes rows whose visualization does not resolve on disk, so this pins that the surviving set is
  9 rather than 10. Pruning is by file existence, not by the row carrying an id.
- **Only half the hashes have a `_simplified.html`**, so both branches of `simpleUrl` are exercised.
- **One native row carries no percentiles.** The generator ranks the modelled subset only
  (`is_native == False`), so native structures have empty `iptm_pct` / `confidence_pct` and must read
  back as `None`.
- **The last hash is repeated with `num_contacts = NOT_A_NUMBER`.** Dedup keeps the *first*
  occurrence, so the good row wins and the malformed one is never reached — and if dedup ever
  changed to last-wins, `numContacts` would become `None` and the test would say so.
- **No `cluster_members.txt`.** `motifClusterIdIndex` therefore stays empty, which is also why it is
  a `lazy val` in `Structures`: forcing it eagerly would read the `structures` field before it is
  initialized. That ordering is easy to break in a refactor.

## Regenerate

The rows come from the main fixture, so this is reproducible without server access:

```bash
# from the repository root; see git history for the exact selection script
python3 - <<'PY'
# pick groups that have both TRA and TRB, keep up to 6 distinct-hash rows each
PY
```

The metrics values are hand-written, not measured — they exist to exercise parsing, not to mean
anything. `hash` is the join column and must stay lower-case: `Structures` looks up
`structureMetricsIndex.get(id.toLowerCase)`.

## evidence.structure.contacts

Set deliberately, because the browser drops a structure with no modelled CDR3-peptide interface —
such a structure draws as a map with the two CDR3 loops and no epitope at all.

| Epitope | `evidence.structure.contacts` | Listed by the browser |
|---|---|---|
| ALAGIGILTV | `true` | yes |
| ATDALMTGF | `true` | yes |
| ANYKFTLV | `false` | **no** |

On the deployed database this drops 795 of 11,046 structures, including all six MHCII ones. The
cause is upstream, in whatever writes the `*_contacts*` files beside each map.
