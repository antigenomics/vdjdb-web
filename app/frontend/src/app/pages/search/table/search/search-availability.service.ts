import { Injectable } from '@angular/core';
import { Utils } from 'utils/utils';

interface IStructureVisualizationDescriptor {
  url: string;
  kind?: 'html' | string;
  simpleUrl?: string;
}

interface ISearchAvailabilityResponse {
  structures: string[];
  motifs: string[];
  visualizations?: { [structureId: string]: IStructureVisualizationDescriptor };
  motifCidIndex?: { [key: string]: string };
}

@Injectable({ providedIn: 'root' })
export class SearchAvailabilityService {
  private static readonly availabilityEndpoint: string = '/api/search/availability';

  private loadPromise: Promise<void> | null = null;
  private readonly structureIds: Set<string> = new Set<string>();
  private readonly motifKeys: Set<string> = new Set<string>();
  private readonly structureVisualizations: Map<string, IStructureVisualizationDescriptor> = new Map<string, IStructureVisualizationDescriptor>();
  private readonly motifCidIndex: Map<string, string> = new Map<string, string>();

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
        if (payload && payload.motifCidIndex) {
          Object.keys(payload.motifCidIndex).forEach((key) => {
            const cid = payload.motifCidIndex ? payload.motifCidIndex[ key ] : undefined;
            if (key && cid) {
              this.motifCidIndex.set(key.trim().toLowerCase(), cid.trim());
            }
          });
        }
      }).catch((error) => {
        this.structureIds.clear();
        this.motifKeys.clear();
        this.motifCidIndex.clear();
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

  public async hasMotif(species: string, tcrChain: string, mhcClass: string, mhcAllele: string, epitope: string): Promise<boolean> {
    await this.ensureLoaded();
    const key = this.buildMotifKey(species, tcrChain, mhcClass, mhcAllele, epitope);
    return key !== null && this.motifKeys.has(key);
  }

  public async getMotifCid(species: string, tcrChain: string, epitope: string, cdr3: string, vSegm: string, jSegm: string): Promise<string | undefined> {
    await this.ensureLoaded();
    const parts = [ species, tcrChain, epitope, cdr3, vSegm, jSegm ].map((p) => this.normalizeMotifPart(p));
    if (parts.some((p) => p.length === 0)) { return undefined; }
    return this.motifCidIndex.get(parts.join('|'));
  }


}
