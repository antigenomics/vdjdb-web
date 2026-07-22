# Builds the healthy-control repertoires behind the enrichment null.
#
# Uniform random sample of PRODUCTIVE clonotypes, seed 20260722, size min(1_000_000, available).
# Random, not head -N: the source files are pooled across many donors and sorted by abundance, so the
# top N are the most expanded and most shared sequences in the whole cohort - exactly the population
# VDJdb is built from. Measured: the top 100k of human TRB exact-matches VDJdb at 5.11%, a uniform
# sample at 0.14%. Taking the head inflates the null ~36x and makes every p-value far too conservative.
# 2026-07-22
import gzip, random, sys, os

SRC = os.path.expanduser("~/hf/airr_control")
OUT = sys.argv[1]
CAP = 1_000_000
SEED = 20260722
POPS = [("human.tra", "HomoSapiens.TRA"), ("human.trb", "HomoSapiens.TRB"),
        ("mouse.tra", "MusMusculus.TRA"), ("mouse.trb", "MusMusculus.TRB")]

os.makedirs(OUT, exist_ok=True)
for src, dst in POPS:
    path = f"{SRC}/{src}.ntvj.vdjtools.tsv.gz"
    # Pass 1: which productive rows exist.
    n = 0
    with gzip.open(path, "rt") as f:
        header = f.readline().rstrip("\n").split("\t")[:11]
        for line in f:
            p = line.split("\t")
            if len(p) > 3 and "*" not in p[3] and "_" not in p[3]:
                n += 1
    take = min(CAP, n)
    rng = random.Random(SEED)
    picked = set(rng.sample(range(n), take))
    # Pass 2: emit the picked rows, cut to the 11 VDJtools positional columns.
    i = 0
    with gzip.open(path, "rt") as f, gzip.open(f"{OUT}/{dst}.txt.gz", "wt") as o:
        f.readline()
        o.write("\t".join(header) + "\n")
        for line in f:
            p = line.rstrip("\n").split("\t")
            if len(p) > 3 and "*" not in p[3] and "_" not in p[3]:
                if i in picked:
                    o.write("\t".join(p[:11]) + "\n")
                i += 1
    print(f"{dst}: {take} of {n} productive clonotypes", flush=True)
