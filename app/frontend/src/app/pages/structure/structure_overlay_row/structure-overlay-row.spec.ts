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
import { StructureOverlayRow } from './structure-overlay-row';

/**
 * Every input here is a real shape the server sends. The label and id formats are conventions rather
 * than a schema, so the cases that matter are the awkward ones: a J segment with a hyphen in it, a
 * displayId naming one chain instead of two, and a cluster with no motif at all.
 */
describe('StructureOverlayRow', () => {

    const meta = (over: Partial<IStructureClusterMeta> = {}): IStructureClusterMeta => ({
        species: 'HomoSapiens', gene: 'TRB', mhcclass: 'MHCI', mhca: 'HLA-A*02:01', mhcb: 'B2M',
        antigenGene: 'M', antigenSpecies: 'InfluenzaA', cellSubset: '', ...over
    } as IStructureClusterMeta);

    const cluster = (over: Partial<IStructureCluster> = {}): IStructureCluster => ({
        clusterId: 'abc123', displayId: '', tcrPairLabel: '', size: 1, length: 0,
        vsegm: '', jsegm: '', meta: meta(), ...over
    } as IStructureCluster);

    describe('parseChainLabel', () => {

        it('splits V, CDR3 and J', () => {
            expect(StructureOverlayRow.parseChainLabel('TRAV27*01-CAGGGSQGNLIF-TRAJ42*01'))
                .toEqual({ v: 'TRAV27*01', cdr3: 'CAGGGSQGNLIF', j: 'TRAJ42*01' });
        });

        // TRBJ2-7*01 has a hyphen of its own, so a naive split on '-' gives four parts and puts
        // '7*01' in a field of its own.
        it('keeps a J segment that contains a hyphen intact', () => {
            expect(StructureOverlayRow.parseChainLabel('TRBV19*01-CASSIRSSYEQYF-TRBJ2-7*01'))
                .toEqual({ v: 'TRBV19*01', cdr3: 'CASSIRSSYEQYF', j: 'TRBJ2-7*01' });
        });

        it('reads a two-part label as V and J, with no CDR3', () => {
            expect(StructureOverlayRow.parseChainLabel('TRAV27*01-TRAJ42*01'))
                .toEqual({ v: 'TRAV27*01', j: 'TRAJ42*01' });
        });

        it('returns nothing for an empty label', () => {
            expect(StructureOverlayRow.parseChainLabel('')).toEqual({});
        });
    });

    describe('parsePairLabel', () => {

        it('assigns each half by its gene prefix', () => {
            const parsed = StructureOverlayRow.parsePairLabel(
                'TRAV27*01-CAGGGSQGNLIF-TRAJ42*01; TRBV19*01-CASSIRSSYEQYF-TRBJ2-7*01');
            expect(parsed.alpha.cdr3).toBe('CAGGGSQGNLIF');
            expect(parsed.beta.cdr3).toBe('CASSIRSSYEQYF');
        });

        // The pair is written alpha-first, but the prefix is what decides - a beta-only label must
        // not land in the alpha column just because it came first.
        it('assigns by prefix rather than by position', () => {
            const parsed = StructureOverlayRow.parsePairLabel('TRBV19*01-CASSIRSSYEQYF-TRBJ2-7*01');
            expect(parsed.alpha).toBeUndefined();
            expect(parsed.beta.cdr3).toBe('CASSIRSSYEQYF');
        });

        it('falls back to position when neither half names its gene', () => {
            const parsed = StructureOverlayRow.parsePairLabel('X1-CAAA-Y1; X2-CBBB-Y2');
            expect(parsed.alpha.cdr3).toBe('CAAA');
            expect(parsed.beta.cdr3).toBe('CBBB');
        });

        it('returns nothing for a missing label', () => {
            expect(StructureOverlayRow.parsePairLabel(undefined)).toEqual({});
        });
    });

    describe('detectChainFromId and extractClusterNumber', () => {

        it('reads the chain out of a motif cluster id', () => {
            expect(StructureOverlayRow.detectChainFromId('H.A.GILGFVFTL.53')).toBe('alpha');
            expect(StructureOverlayRow.detectChainFromId('H.B.GILGFVFTL.12')).toBe('beta');
        });

        it('returns nothing when the id does not say', () => {
            expect(StructureOverlayRow.detectChainFromId('abc123')).toBeUndefined();
        });

        it('takes the last numeric token as the cluster number', () => {
            expect(StructureOverlayRow.extractClusterNumber('H.A.GILGFVFTL.53')).toBe('53');
            expect(StructureOverlayRow.extractClusterNumber('nothing-numeric')).toBeUndefined();
        });
    });

    describe('parseChainCids', () => {

        it('splits a displayId naming both chains', () => {
            const cids = StructureOverlayRow.parseChainCids(
                cluster({ displayId: 'H.A.GILGFVFTL.53 / H.B.GILGFVFTL.12' }));
            expect(cids).toEqual({ alpha: 'H.A.GILGFVFTL.53', beta: 'H.B.GILGFVFTL.12' });
        });

        // A link built from a guess would land the reader on the other chain's motif with nothing
        // to say so, which is worse than the card offering no link.
        it('refuses to guess a chain from position', () => {
            expect(StructureOverlayRow.parseChainCids(cluster({ displayId: 'someid.7' }))).toEqual({});
        });

        it('returns nothing when there is no motif cluster', () => {
            expect(StructureOverlayRow.parseChainCids(cluster({ displayId: '' }))).toEqual({});
        });
    });

    describe('parseClusterIds', () => {

        it('reads the suffix of each chain', () => {
            expect(StructureOverlayRow.parseClusterIds(
                cluster({ displayId: 'H.A.GILGFVFTL.53 / H.B.GILGFVFTL.12' })))
                .toEqual({ alpha: '53', beta: '12' });
        });

        // Unlike the links, the displayed suffix does fill by position: it is only ever shown, so a
        // wrong one is cosmetic, and '-/-' on every card would be worse.
        it('does fill by position, because this one is only displayed', () => {
            expect(StructureOverlayRow.parseClusterIds(cluster({ displayId: 'someid.7' })))
                .toEqual({ alpha: '7' });
        });

        it('falls back to the structure id when there is no motif cluster', () => {
            expect(StructureOverlayRow.parseClusterIds(cluster({ displayId: '', clusterId: 'x.y.9' })))
                .toEqual({ alpha: '9' });
        });
    });

    describe('motif links', () => {

        it('carries the cluster id and drops the MHC allele to two fields', () => {
            const link = StructureOverlayRow.buildChainMotifLink(meta(), 'GILGFVFTL', 'TRA', 'H.A.GILGFVFTL.53');
            expect(link).toContain('mhc_a=HLA-A*02');
            expect(link).not.toContain(':01');
            expect(link).toContain('cid=H.A.GILGFVFTL.53');
            expect(link).toContain('tcr_chain=TRA');
        });

        it('builds nothing when a parameter the motif tree needs is missing', () => {
            expect(StructureOverlayRow.buildChainMotifLink(meta({ species: '' }), 'GILGFVFTL', 'TRA', 'cid')).toBeUndefined();
            expect(StructureOverlayRow.buildChainMotifLink(meta(), '', 'TRA', 'cid')).toBeUndefined();
            expect(StructureOverlayRow.buildMotifParams(meta({ mhca: '' }), 'GILGFVFTL')).toBeUndefined();
        });
    });

    describe('build', () => {

        it('assembles a card from a cluster', () => {
            const row = StructureOverlayRow.build(cluster({
                tcrPairLabel: 'TRAV27*01-CAGGGSQGNLIF-TRAJ42*01; TRBV19*01-CASSIRSSYEQYF-TRBJ2-7*01',
                displayId: 'H.A.GILGFVFTL.53 / H.B.GILGFVFTL.12',
                visualization: { url: '/x.html', kind: 'html' }
            }), 'GILGFVFTL');

            expect(row.cdr3a).toBe('CAGGGSQGNLIF');
            expect(row.trbj).toBe('TRBJ2-7*01');
            expect(row.alphaClusterId).toBe('53');
            expect(row.hasHtml).toBe(true);
            expect(row.alphaMotifLink).toContain('cid=H.A.GILGFVFTL.53');
            expect(row.betaMotifLink).toContain('cid=H.B.GILGFVFTL.12');
        });

        // A structure with no HTML map cannot go into the overlay, and the card is disabled for it.
        // The cast is the point: IStructureVisualization.kind is typed as the literal 'html' because
        // StructureResponse drops every other kind on the way in, so this reaches a guard that the
        // type system says is unreachable - and it stays, because the type is a claim about the
        // normaliser rather than about the server, which does send png.
        it('reports a cluster whose visualization is not html as having none', () => {
            const row = StructureOverlayRow.build(
                cluster({ visualization: { url: '/x.png', kind: 'png' } as any }), 'GILGFVFTL');
            expect(row.hasHtml).toBe(false);
        });

        it('reports a cluster with no visualization at all as having none', () => {
            expect(StructureOverlayRow.build(cluster({ visualization: undefined }), 'GILGFVFTL').hasHtml).toBe(false);
        });

        it('leaves the motif links off a cluster with no motif cluster', () => {
            const row = StructureOverlayRow.build(cluster({ displayId: '' }), 'GILGFVFTL');
            expect(row.alphaMotifLink).toBeUndefined();
            expect(row.betaMotifLink).toBeUndefined();
        });
    });
});
