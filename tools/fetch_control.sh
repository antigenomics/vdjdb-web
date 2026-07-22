#!/usr/bin/env bash
#
# Fetches the healthy control repertoires behind the annotation summary's enrichment p-values into
# conf/control/, where they are packaged onto the application classpath.
#
# They are not committed: four gzipped repertoires come to ~65 MB, and this repository has never held a
# tracked file above 40 KB. They live in the dataset they were derived from instead, alongside the
# script that derives them and a README recording the sampling.
#
# Run before `sbt build` / `sbt Docker/publish`. Both CI workflows call it. Without it the application
# still starts and everything except the enrichment p-values behaves normally - ControlRepertoires logs
# a warning and reports no null - which is why this script fails loudly rather than leaving a partial
# directory behind: a silently absent control is indistinguishable from a working one until somebody
# reads a chart.
#
# 2026-07-22
set -euo pipefail

BASE="https://huggingface.co/datasets/isalgo/airr_control/resolve/main/vdjdb-web-control"
DEST="${1:-conf/control}"
FILES=(HomoSapiens.TRA HomoSapiens.TRB MusMusculus.TRA MusMusculus.TRB)

mkdir -p "$DEST"

for name in "${FILES[@]}"; do
    target="$DEST/$name.txt.gz"
    if [ -s "$target" ]; then
        echo "  $name.txt.gz already present, skipping"
        continue
    fi
    echo "  fetching $name.txt.gz"
    # --fail so an HTML error page never lands on disk as a .gz; the download goes to a temporary name
    # and is only moved into place once complete, so an interrupted run cannot leave a truncated file
    # that gunzip would later fail on halfway through a search.
    curl --fail --location --silent --show-error --retry 3 --retry-delay 2 \
         --output "$target.partial" "$BASE/$name.txt.gz"
    gzip -t "$target.partial"
    mv "$target.partial" "$target"
done

echo "control repertoires ready in $DEST:"
ls -la "$DEST"
