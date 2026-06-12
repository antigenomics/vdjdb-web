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
  public static mhcHead(value: string | undefined | null): string {
    if (!value) {
      return '';
    }
    return value.split('/')[0].replace(/[*:].*$/, '').trim().toLowerCase();
  }
}
