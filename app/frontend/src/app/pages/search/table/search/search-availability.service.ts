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
    // Normalize MHC allele: remove subtype like :01, :02, etc. (matches Motifs.scala logic)
    const parts = [ species, tcrChain, mhcClass, mhcAllele, epitope ]
      .map((part, index) => {
        const normalized = this.normalizeMotifPart(part);
        // For MHC allele (index 3), also remove subtype to match backend normalization
        if (index === 3 && normalized.includes('*')) {
          return normalized.split(':')[0];
        }
        return normalized;
      });
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

  public async getMotifCid(species: string, tcrChain: string, epitope: string, cdr3: string, vSegm: string, jSegm: string,
                           method: 'tcrnet' | 'tcremp' = 'tcrnet'): Promise<string | undefined> {
    await this.ensureLoaded();
    const parts = [ species, tcrChain, epitope, cdr3, vSegm, jSegm ].map((p) => this.normalizeMotifPart(p));
    if (parts.some((p) => p.length === 0)) { return undefined; }
    return method === 'tcremp' ? this.motifCidIndexTcremp.get(parts.join('|')) : this.motifCidIndex.get(parts.join('|'));
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
