/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

import { Injectable } from '@angular/core';

// Coordinates describing the currently-selected epitope, shared across the Motif
// and Structure pages so that switching pages can re-open the same epitope.
// The two pages key their trees differently (Motif: species/tcr_chain/mhc.class/
// mhc.a/epitope; Structure: mhc.class/mhc.pair/epitope) and even disagree on the
// meaning of `gene` (full allele vs. stripped MHC pair), so each page resolves
// this descriptor against its own metadata using `mhcHead` for matching.
/**
 * Gene symbols every MHC comparison has to repair, in the order the server applies them.
 *
 * Each left-hand side is a mis-spelling rather than an alias: `H2-Db` is the MGI symbol, `HLA-DPA1`
 * and `HLA-DPB1` are the IMGT ones, and no `HLA-DPA`/`HLA-DPB` gene exists. `HLA-DRA` is correct
 * without a digit, which is why this is an explicit list and not a rule about digits.
 *
 * The server applies the same list in `Motifs.MalformedMhcGenes`. It has to stay in step with this
 * one: the motif index is keyed with the repaired spelling, so anything comparing against it -- the
 * badge lookup, the tree node a `mhc_a` link resolves to -- has to repair the same way or it simply
 * finds nothing, which is indistinguishable from "this record has no cluster".
 */
export const MALFORMED_MHC_GENES: Array<[ string, string ]> = [
  [ 'h-2', 'h2-' ], [ 'hla-dpa*', 'hla-dpa1*' ], [ 'hla-dpb*', 'hla-dpb1*' ]
];

/** One MHC gene symbol, spelled the way the motif index is keyed. Expects a lower-cased value. */
export function repairMhcGene(value: string): string {
  return MALFORMED_MHC_GENES.reduce(
    (gene, [ wrong, right ]) => gene.startsWith(wrong) ? right + gene.substring(wrong.length) : gene,
    value);
}

export interface IBridgeEpitope {
  species?: string;
  tcrChain?: string;
  mhcClass: string;
  gene: string;
  epitopeSeq: string;
}

@Injectable({ providedIn: 'root' })
export class EpitopeBridgeService {
  private current: IBridgeEpitope | null = null;

  public set(epitope: IBridgeEpitope | null): void {
    this.current = epitope;
  }

  public get(): IBridgeEpitope | null {
    return this.current;
  }

  public clear(): void {
    this.current = null;
  }

  // Normalize an MHC allele/pair to a comparable "head" token so the Motif tree
  // (full allele, e.g. HLA-A*02:01) and the Structure tree (stripped pair, e.g.
  // HLA-A/B2M) resolve to the same epitope. Returns the lowercased first segment
  // with any allele suffix removed.
  //
  // Repaired before the suffix is stripped, not after: `hla-dpa*01` has to still have its `*` for
  // the repair below to recognise it, and stripping first would leave `hla-dpa` looking like a gene
  // name in its own right.
  public static mhcHead(value: string | undefined | null): string {
    if (!value) {
      return '';
    }
    return repairMhcGene(value.split('/')[0].trim().toLowerCase()).replace(/[*:].*$/, '');
  }
}
