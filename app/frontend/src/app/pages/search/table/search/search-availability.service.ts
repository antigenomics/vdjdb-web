import { Injectable } from '@angular/core';
import { Utils } from 'utils/utils';

interface IStructureVisualizationDescriptor {
  url: string;
  kind?: 'html' | string;
  simpleUrl?: string;
}

export interface IStructureMetrics {
  isNative: boolean;
  numContacts?: number;
  iptm?: number;
  confidence?: number;
  iptmPct?: number;
  confidencePct?: number;
  bindingModeOutlier?: boolean;
}

/**
 * Gene symbols the motif join has to repair, in the order the server applies them.
 *
 * Each left-hand side is a mis-spelling, not an alias: `H2-Db` is the MGI symbol, `HLA-DPA1` and
 * `HLA-DPB1` are the IMGT ones, and no `HLA-DPA`/`HLA-DPB` gene exists. `HLA-DRA` is correct without
 * a digit, which is why this is a list and not a rule about digits. See `Motifs.MalformedMhcGenes`.
 */
const MALFORMED_MHC_GENES: Array<[ string, string ]> = [
  [ 'h-2', 'h2-' ], [ 'hla-dpa*', 'hla-dpa1*' ], [ 'hla-dpb*', 'hla-dpb1*' ]
];

interface ISearchAvailabilityResponse {
  structures: string[];
  motifs: string[];
  motifsTcremp?: string[];
  visualizations?: { [structureId: string]: IStructureVisualizationDescriptor };
  motifCidIndex?: { [key: string]: string };
  motifCidIndexTcremp?: { [key: string]: string };
  structureMetrics?: { [structureId: string]: IStructureMetrics };
}

@Injectable({ providedIn: 'root' })
export class SearchAvailabilityService {
  private static readonly availabilityEndpoint: string = '/api/search/availability';

  private loadPromise: Promise<void> | null = null;
  private readonly structureIds: Set<string> = new Set<string>();
  private readonly motifKeys: Set<string> = new Set<string>();
  private readonly motifKeysTcremp: Set<string> = new Set<string>();
  private readonly structureVisualizations: Map<string, IStructureVisualizationDescriptor> = new Map<string, IStructureVisualizationDescriptor>();
  private readonly motifCidIndex: Map<string, string> = new Map<string, string>();
  private readonly motifCidIndexTcremp: Map<string, string> = new Map<string, string>();
  private readonly structureMetrics: Map<string, IStructureMetrics> = new Map<string, IStructureMetrics>();

  private ensureLoaded(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = Utils.HTTP.get(SearchAvailabilityService.availabilityEndpoint).then((response) => {
        const payload = JSON.parse(response.response) as ISearchAvailabilityResponse;
        if (payload && Array.isArray(payload.structures)) {
          payload.structures.forEach((id) => {
            const normalized = this.normalizeStructureId(id);
            if (normalized) {
              this.structureIds.add(normalized);
            }
          });
        }
        if (payload && payload.visualizations) {
          Object.keys(payload.visualizations).forEach((rawId) => {
            const normalized = this.normalizeStructureId(rawId);
            if (!normalized) {
              return;
            }
            const descriptor = payload.visualizations ? payload.visualizations[ rawId ] : undefined;
            if (descriptor && descriptor.url && (!descriptor.kind || descriptor.kind === 'html')) {
              const normalizedDescriptor: IStructureVisualizationDescriptor = {
                url: descriptor.url,
                kind: 'html',
                simpleUrl: descriptor.simpleUrl
              };
              this.structureVisualizations.set(normalized, normalizedDescriptor);
              this.structureIds.add(normalized);
            }
          });
        }
        if (payload && Array.isArray(payload.motifs)) {
          payload.motifs.forEach((key) => {
            const normalized = this.normalizeMotifKey(key);
            if (normalized) {
              this.motifKeys.add(normalized);
            }
          });
        }
        if (payload && Array.isArray(payload.motifsTcremp)) {
          payload.motifsTcremp.forEach((key) => {
            const normalized = this.normalizeMotifKey(key);
            if (normalized) {
              this.motifKeysTcremp.add(normalized);
            }
          });
        }
        if (payload && payload.motifCidIndex) {
          Object.keys(payload.motifCidIndex).forEach((key) => {
            const cid = payload.motifCidIndex ? payload.motifCidIndex[ key ] : undefined;
            if (key && cid) {
              this.motifCidIndex.set(key.trim().toLowerCase(), cid.trim());
            }
          });
        }
        if (payload && payload.motifCidIndexTcremp) {
          Object.keys(payload.motifCidIndexTcremp).forEach((key) => {
            const cid = payload.motifCidIndexTcremp ? payload.motifCidIndexTcremp[ key ] : undefined;
            if (key && cid) {
              this.motifCidIndexTcremp.set(key.trim().toLowerCase(), cid.trim());
            }
          });
        }
        if (payload && payload.structureMetrics) {
          Object.keys(payload.structureMetrics).forEach((key) => {
            const metrics = payload.structureMetrics ? payload.structureMetrics[ key ] : undefined;
            const normalized = this.normalizeStructureId(key);
            if (normalized && metrics) {
              this.structureMetrics.set(normalized, metrics);
            }
          });
        }
      }).catch((error) => {
        this.structureIds.clear();
        this.motifKeys.clear();
        this.motifKeysTcremp.clear();
        this.motifCidIndex.clear();
        this.motifCidIndexTcremp.clear();
        this.structureMetrics.clear();
        this.loadPromise = null;
        throw error;
      });
    }
    return this.loadPromise;
  }

  private normalizeStructureId(structureId: string): string {
    return structureId ? structureId.trim().toLowerCase() : '';
  }

  private normalizeMotifPart(part: string): string {
    return part ? part.trim().toLowerCase() : '';
  }

  private normalizeMotifKey(key: string): string {
    return key ? key.trim().toLowerCase() : '';
  }

  private buildMotifKey(species: string, tcrChain: string, mhcClass: string, mhcAllele: string, epitope: string): string | null {
    // MHC at two fields, matching Motifs.buildAvailabilityKeys.
    const parts = [ species, tcrChain, mhcClass, mhcAllele, epitope ]
      .map((part, index) => index === 3 ? this.normalizeMhcPart(part) : this.normalizeMotifPart(part));
    if (parts.some((part) => part.length === 0)) {
      return null;
    }
    return parts.join('|');
  }

  public async hasStructure(structureId: string): Promise<boolean> {
    await this.ensureLoaded();
    const normalized = this.normalizeStructureId(structureId);
    return normalized.length > 0 && this.structureIds.has(normalized);
  }

  public async getStructureVisualization(structureId: string): Promise<IStructureVisualizationDescriptor | undefined> {
    await this.ensureLoaded();
    const normalized = this.normalizeStructureId(structureId);
    if (!normalized) {
      return undefined;
    }
    return this.structureVisualizations.get(normalized);
  }

  /** Warm the availability index ahead of badge rendering (fire-and-forget). */
  public prefetch(): void {
    void this.ensureLoaded();
  }

  public async hasMotif(species: string, tcrChain: string, mhcClass: string, mhcAllele: string, epitope: string,
                        method: 'tcrnet' | 'tcremp' = 'tcrnet'): Promise<boolean> {
    await this.ensureLoaded();
    const key = this.buildMotifKey(species, tcrChain, mhcClass, mhcAllele, epitope);
    if (key === null) { return false; }
    return method === 'tcremp' ? this.motifKeysTcremp.has(key) : this.motifKeys.has(key);
  }

  /**
   * The motif cluster a clonotype belongs to, or nothing.
   *
   * The key has to be all nine parts the server builds it from - species, chain, epitope, CDR3, V, J
   * and then the MHC triple. It used to send the first six, which cannot match a nine-part key, so
   * this returned undefined for every record and the motif badge was inactive on every row.
   *
   * MHC is cut to two fields to match `Motifs.normalizeKeyPart`: a cluster-members row is always
   * written at full resolution while a VDJdb record may be curated at either, so `HLA-A*02` and
   * `HLA-A*02:01` have to meet in the middle.
   */
  public async getMotifCid(species: string, tcrChain: string, epitope: string, cdr3: string,
                           vSegm: string, jSegm: string, mhcA: string, mhcB: string, mhcClass: string,
                           method: 'tcrnet' | 'tcremp' = 'tcrnet'): Promise<string | undefined> {
    await this.ensureLoaded();
    const parts = [ species, tcrChain, epitope, cdr3, vSegm, jSegm ].map((p) => this.normalizeMotifPart(p))
      .concat([ mhcA, mhcB ].map((p) => this.normalizeMhcPart(p)))
      .concat([ this.normalizeMotifPart(mhcClass) ]);
    if (parts.some((p) => p.length === 0)) { return undefined; }
    return method === 'tcremp' ? this.motifCidIndexTcremp.get(parts.join('|')) : this.motifCidIndex.get(parts.join('|'));
  }

  /**
   * An MHC allele at the resolution and the spelling both sides of the motif join agree on.
   *
   * Mirrors `Motifs.normalizeMhcAllele` on the server, which is what builds the keys in the index
   * this looks up. Any rule added there has to be added here in the same order, or the two halves
   * stop matching and every badge silently goes inactive - which is exactly how this broke before.
   */
  private normalizeMhcPart(value: string): string {
    const twoField = this.normalizeMotifPart(value).replace(/:.+/, '');
    const alleles = twoField.split(',').map((a) => a.trim()).filter((a) => a.length > 0);
    const single = alleles.length > 1 && alleles.every((a) => a === alleles[ 0 ]) ? alleles[ 0 ] : twoField;
    return MALFORMED_MHC_GENES.reduce(
      (allele, [ wrong, right ]) => allele.startsWith(wrong) ? right + allele.substring(wrong.length) : allele,
      single);
  }

  /**
   * Always resolves to undefined. The availability endpoint (backend/controllers/SearchAvailabilityAPI.scala)
   * has no validation index in its response contract, so the lookup this used to perform ran against a map
   * that could never be filled and the TCRvdb validation badge never rendered. Kept as an explicit no-op so
   * the badge degrades to "not available" instead of pretending to consult a server field that does not
   * exist; restore the lookup once the server actually emits a per (CDR3, epitope) validation status.
   */
  public async getValidationStatus(_cdr3: string, _epitope: string): Promise<string | undefined> {
    return undefined;
  }

  public async getStructureMetrics(structureId: string): Promise<IStructureMetrics | undefined> {
    await this.ensureLoaded();
    const normalized = this.normalizeStructureId(structureId);
    return normalized ? this.structureMetrics.get(normalized) : undefined;
  }
}
