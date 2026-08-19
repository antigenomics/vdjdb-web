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

import { IStructureCluster, IStructureClusterMeta } from 'pages/structure/structure';
import { Utils } from 'utils/utils';
import ColorizedPatternRegion = Utils.SequencePattern.ColorizedPatternRegion;

/**
 * Turns a cluster from the API into the card the left-hand list renders.
 *
 * Pure, and deliberately so: everything here is string parsing over fields the server sends as free
 * text - a `tcrPairLabel` like `TRAV27*01-CAGGGSQGNLIF-TRAJ42*01; TRBV19*01-CASSIRSSYEQYF-TRBJ2-7*01`,
 * and a `displayId` that is either one motif cluster id, two joined by " / ", or empty. None of it
 * needs Angular, and pulling it out of the component is what makes it testable at all.
 */

/** Query parameters for the epitope-level motif link. */
export interface IMotifParams {
    species: string;
    tcrChain: string;
    mhcClass: string;
    gene: string;
    epitope: string;
}

/** One card. */
export interface IOverlayTableRow {
    cluster: IStructureCluster;
    alphaClusterId?: string;
    betaClusterId?: string;
    cdr3a?: string;
    cdr3b?: string;
    cdr3aRegions: ColorizedPatternRegion[];
    cdr3bRegions: ColorizedPatternRegion[];
    trav?: string;
    traj?: string;
    trbv?: string;
    trbj?: string;
    hasHtml: boolean;
    motifLink?: string;
    motifAvailable?: boolean;
    motifParams?: IMotifParams;
    alphaMotifLink?: string;
    betaMotifLink?: string;
}

interface IParsedChainLabel {
    cdr3?: string;
    v?: string;
    j?: string;
}

interface IParsedPairLabel {
    alpha?: IParsedChainLabel;
    beta?: IParsedChainLabel;
}

export class StructureOverlayRow {

    public static build(cluster: IStructureCluster, epitope: string): IOverlayTableRow {
        const pairLabel = StructureOverlayRow.parsePairLabel(cluster.tcrPairLabel);
        const clusterIds = StructureOverlayRow.parseClusterIds(cluster);
        const alpha = pairLabel.alpha || {};
        const beta = pairLabel.beta || {};
        const cdr3a = typeof alpha.cdr3 === 'string' ? alpha.cdr3 : '';
        const cdr3b = typeof beta.cdr3 === 'string' ? beta.cdr3 : '';
        const meta = cluster.meta || {} as IStructureClusterMeta;
        const motifParams = StructureOverlayRow.buildMotifParams(meta, epitope);
        const chainCids = StructureOverlayRow.parseChainCids(cluster);

        return {
            cluster,
            alphaClusterId:  clusterIds.alpha,
            betaClusterId:   clusterIds.beta,
            alphaMotifLink:  chainCids.alpha ? StructureOverlayRow.buildChainMotifLink(meta, epitope, 'TRA', chainCids.alpha) : undefined,
            betaMotifLink:   chainCids.beta ? StructureOverlayRow.buildChainMotifLink(meta, epitope, 'TRB', chainCids.beta) : undefined,
            cdr3a,
            cdr3b,
            cdr3aRegions:    StructureOverlayRow.colorizeCdr3(cdr3a, cluster.cdr3aVEnd, cluster.cdr3aJStart),
            cdr3bRegions:    StructureOverlayRow.colorizeCdr3(cdr3b, cluster.cdr3bVEnd, cluster.cdr3bJStart),
            trav:            typeof alpha.v === 'string' ? alpha.v : '',
            traj:            typeof alpha.j === 'string' ? alpha.j : '',
            trbv:            typeof beta.v === 'string' ? beta.v : '',
            trbj:            typeof beta.j === 'string' ? beta.j : '',
            hasHtml:         !!(cluster.visualization && cluster.visualization.kind === 'html'),
            motifParams,
            motifLink:       motifParams ? StructureOverlayRow.buildMotifLink(motifParams) : undefined
        };
    }

    /** V / CDR3 / J coloured segments, with the empty ones dropped so the template can loop blindly. */
    public static colorizeCdr3(cdr3: string, vEnd?: number, jStart?: number): ColorizedPatternRegion[] {
        if (!cdr3) {
            return [];
        }
        const safeVEnd = typeof vEnd === 'number' ? vEnd : -1;
        const safeJStart = typeof jStart === 'number' ? jStart : -1;
        return Utils.SequencePattern.colorizePattern(cdr3, safeVEnd, safeJStart)
            .filter((region) => !!region && typeof region.part === 'string' && region.part.length > 0);
    }

    /** The epitope-level motif link's parameters, or nothing when the cluster cannot name all of them. */
    public static buildMotifParams(meta: IStructureClusterMeta, epitope: string): IMotifParams | undefined {
        if (!meta || !epitope) {
            return undefined;
        }
        const gene = StructureOverlayRow.normalizeMhcGene(meta.mhca || '');
        if (!meta.species || !meta.gene || !meta.mhcclass || !gene) {
            return undefined;
        }
        return { species: meta.species, tcrChain: meta.gene, mhcClass: meta.mhcclass, gene, epitope };
    }

    public static buildMotifLink(params: IMotifParams): string {
        const search = new URLSearchParams();
        search.set('species', params.species);
        search.set('tcr_chain', params.tcrChain);
        search.set('mhc_class', params.mhcClass);
        search.set('gene', params.gene);
        search.set('epitope_seq', params.epitope);
        return `/motif?${search.toString()}`;
    }

    /** The per-chain motif link, which lands on one cluster rather than on the epitope. */
    public static buildChainMotifLink(meta: IStructureClusterMeta, epitope: string,
                                      chain: 'TRA' | 'TRB', cid: string): string | undefined {
        const species = meta && meta.species ? meta.species : '';
        const mhcClass = meta && meta.mhcclass ? meta.mhcclass : '';
        const gene = StructureOverlayRow.normalizeMhcGene(meta && meta.mhca ? meta.mhca : '');
        if (!species || !mhcClass || !gene || !epitope || !cid) {
            return undefined;
        }
        const search = new URLSearchParams();
        search.set('species', species);
        search.set('tcr_chain', chain);
        search.set('mhc_class', mhcClass);
        search.set('mhc_a', gene);
        search.set('epitope_seq', epitope);
        search.set('cid', cid);
        return `/motif?${search.toString()}`;
    }

    /** `HLA-A*02:01` -> `HLA-A*02`: the motif tree is keyed at two-field resolution. */
    public static normalizeMhcGene(value: string): string {
        return value ? value.replace(/:.+/, '').trim() : '';
    }

    /**
     * The full motif cluster id per chain, e.g. `H.A.RPIIRPATL.2` / `H.B.RPIIRPATL.1`.
     *
     * Only a chain whose id says which it is gets a link. Guessing from position would be worse than
     * no link: a wrong one lands the reader on another chain's motif with nothing to say so.
     */
    public static parseChainCids(cluster: IStructureCluster): { alpha?: string, beta?: string } {
        const result: { alpha?: string, beta?: string } = {};
        StructureOverlayRow.splitDisplayIds(cluster.displayId).forEach((id) => {
            const chain = StructureOverlayRow.detectChainFromId(id);
            if (chain === 'alpha' && !result.alpha) {
                result.alpha = id;
            } else if (chain === 'beta' && !result.beta) {
                result.beta = id;
            }
        });
        return result;
    }

    /**
     * The trailing number of each chain's cluster id, for the `a/b cluster ID suffix` line.
     *
     * Unlike the links above this does fall back to filling by position, and then to the structure's
     * own id, because the suffix is only ever displayed - a wrong one is a cosmetic error, and the
     * line reading `-/-` for every card would be worse.
     */
    public static parseClusterIds(cluster: IStructureCluster): { alpha?: string, beta?: string } {
        const result: { alpha?: string, beta?: string } = {};

        StructureOverlayRow.splitDisplayIds(cluster.displayId || cluster.clusterId).forEach((id) => {
            const number = StructureOverlayRow.extractClusterNumber(id);
            if (!number) {
                return;
            }
            const chain = StructureOverlayRow.detectChainFromId(id);
            if (chain === 'alpha' && !result.alpha) {
                result.alpha = number;
            } else if (chain === 'beta' && !result.beta) {
                result.beta = number;
            } else if (!result.alpha) {
                result.alpha = number;
            } else if (!result.beta) {
                result.beta = number;
            }
        });

        if (!result.alpha && !result.beta) {
            const fallback = StructureOverlayRow.extractClusterNumber(cluster.clusterId);
            if (fallback) {
                result.alpha = fallback;
            }
        }
        return result;
    }

    /** A displayId holds one id, or two joined by "/" or ";". */
    public static splitDisplayIds(id?: string): string[] {
        if (!id || typeof id !== 'string') {
            return [];
        }
        return id.split(/[\\/;]+/).map((part) => part.trim()).filter((part) => part.length > 0);
    }

    public static detectChainFromId(id: string): 'alpha' | 'beta' | undefined {
        const normalized = id.toUpperCase();
        if (normalized.includes('.A.') || normalized.includes(' A ')) {
            return 'alpha';
        }
        if (normalized.includes('.B.') || normalized.includes(' B ')) {
            return 'beta';
        }
        const tokens = normalized.split('.').map((token) => token.trim()).filter((token) => token.length > 0);
        if (tokens.some((token) => token === 'A' || token === 'ALPHA' || token === 'TRA')) {
            return 'alpha';
        }
        if (tokens.some((token) => token === 'B' || token === 'BETA' || token === 'TRB')) {
            return 'beta';
        }
        return undefined;
    }

    /** The last dot-separated numeric token: `H.A.GILGFVFTL.53` -> `53`. */
    public static extractClusterNumber(id?: string): string | undefined {
        if (!id || typeof id !== 'string') {
            return undefined;
        }
        return id.split('.').map((part) => part.trim()).filter((part) => part.length > 0)
            .reverse().find((part) => /^[0-9]+$/.test(part));
    }

    /**
     * Splits `TRAV27*01-CAGGGSQGNLIF-TRAJ42*01; TRBV19*01-CASSIRSSYEQYF-TRBJ2-7*01` into its chains.
     *
     * Assigned by the gene prefix where there is one, by position otherwise - a J segment can itself
     * contain a hyphen (`TRBJ2-7*01`), which is why the split is anchored on the CDR3 rather than
     * done on hyphens.
     */
    public static parsePairLabel(label?: string): IParsedPairLabel {
        if (!label || typeof label !== 'string') {
            return {};
        }
        const result: IParsedPairLabel = {};
        label.split(';').map((part) => part.trim()).filter((part) => part.length > 0).forEach((part) => {
            const chain = StructureOverlayRow.parseChainLabel(part);
            const upper = part.toUpperCase();
            if (upper.startsWith('TRA') && !result.alpha) {
                result.alpha = chain;
            } else if (upper.startsWith('TRB') && !result.beta) {
                result.beta = chain;
            } else if (!result.alpha) {
                result.alpha = chain;
            } else if (!result.beta) {
                result.beta = chain;
            }
        });
        return result;
    }

    public static parseChainLabel(label: string): IParsedChainLabel {
        const trimmed = (label || '').trim();
        if (!trimmed) {
            return {};
        }
        // The CDR3 is the only all-caps run between two hyphens, so anchoring on it survives a J
        // segment with a hyphen in it.
        const match = trimmed.match(/^(.*?)-([A-Z]+)-(.+)$/);
        if (match) {
            return { v: match[ 1 ], cdr3: match[ 2 ], j: match[ 3 ] };
        }
        const segments = trimmed.split('-').filter((segment) => segment.length > 0);
        if (segments.length >= 3) {
            return { v: segments[ 0 ], cdr3: segments[ 1 ], j: segments.slice(2).join('-') };
        }
        if (segments.length === 2) {
            return { v: segments[ 0 ], j: segments[ 1 ] };
        }
        return { v: trimmed };
    }
}
