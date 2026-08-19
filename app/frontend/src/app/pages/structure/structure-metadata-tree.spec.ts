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

import { IStructuresMetadata } from 'pages/structure/structure';
import { StructureMetadataTree } from './structure-metadata-tree';

/**
 * The tree is mhc.class -> mhc.pair -> antigen.epitope, and the values reaching it come from URLs
 * other pages wrote. Browse links at full MHC resolution (`HLA-A*02:01/B2M`) while the tree is keyed
 * at two fields (`HLA-A*02/B2M`), so the pair comparison is the one that has to be forgiving.
 */
describe('StructureMetadataTree', () => {

    const leaf = (value: string, hash: string) => ({ value, hash, next: null, isSelected: false, isOpened: false } as any);
    const node = (value: string, children: any[]) =>
        ({ value, hash: null, isSelected: false, isOpened: false, next: { name: 'child', values: children } } as any);

    const metadata: IStructuresMetadata = {
        root: {
            name: 'mhc.class',
            values: [
                node('MHCI', [
                    node('HLA-A*02/B2M', [ leaf('GILGFVFTL', 'h1'), leaf('NLVPMVATV', 'h2') ]),
                    node('HLA-A*03/B2M', [ leaf('KLGGALQAK', 'h3') ])
                ]),
                node('MHCII', [ node('HLA-DRA*01/HLA-DRB1*15', [ leaf('MDFARVHFISALHGSG', 'h4') ]) ])
            ]
        }
    } as any;

    describe('normalizeMhcPair', () => {

        it('drops both halves to two fields and lower-cases', () => {
            expect(StructureMetadataTree.normalizeMhcPair('HLA-A*02:01/B2M')).toBe('hla-a*02/b2m');
            expect(StructureMetadataTree.normalizeMhcPair('HLA-DRA*01:01/HLA-DRB1*15:01')).toBe('hla-dra*01/hla-drb1*15');
        });

        it('returns nothing for nothing', () => {
            expect(StructureMetadataTree.normalizeMhcPair(null)).toBe('');
            expect(StructureMetadataTree.normalizeMhcPair(undefined)).toBe('');
        });
    });

    describe('findPath', () => {

        it('walks all three levels', () => {
            const path = StructureMetadataTree.findPath(metadata, 'MHCI', 'HLA-A*02/B2M', 'GILGFVFTL');
            expect(path.map((n) => n.value)).toEqual([ 'MHCI', 'HLA-A*02/B2M', 'GILGFVFTL' ]);
        });

        // The whole reason the pair comparison normalises: a Browse link carries the allele at full
        // resolution and has to land on the two-field node the tree actually holds.
        it('matches an MHC pair given at full allele resolution', () => {
            const path = StructureMetadataTree.findPath(metadata, 'mhci', 'HLA-A*02:01/B2M', 'gilgfvftl');
            expect(path.length).toBe(3);
            expect(path[ 2 ].hash).toBe('h1');
        });

        it('returns nothing when any step misses, rather than a partial path', () => {
            expect(StructureMetadataTree.findPath(metadata, 'MHCI', 'HLA-A*02/B2M', 'NOSUCH')).toEqual([]);
            expect(StructureMetadataTree.findPath(metadata, 'MHCI', 'HLA-B*07/B2M', 'GILGFVFTL')).toEqual([]);
            expect(StructureMetadataTree.findPath(metadata, null, null, null)).toEqual([]);
        });
    });

    describe('resolveLeaf', () => {

        it('finds the leaf a filter names', () => {
            const leafValue = StructureMetadataTree.resolveLeaf(metadata, [
                { name: 'mhc.class', value: 'MHCI' },
                { name: 'mhc.pair', value: 'HLA-A*02/B2M' },
                { name: 'antigen.epitope', value: 'NLVPMVATV' }
            ]);
            expect(leafValue.hash).toBe('h2');
        });

        // A filter arriving from Browse also carries structure.id, which is not a level of the tree.
        it('skips entries that are not tree levels', () => {
            const leafValue = StructureMetadataTree.resolveLeaf(metadata, [
                { name: 'structure.id', value: 'abc123' },
                { name: 'mhc.class', value: 'MHCI' },
                { name: 'mhc.pair', value: 'HLA-A*02/B2M' },
                { name: 'antigen.epitope', value: 'GILGFVFTL' }
            ]);
            expect(leafValue.hash).toBe('h1');
        });

        it('returns nothing for an empty or unmatched filter', () => {
            expect(StructureMetadataTree.resolveLeaf(metadata, [])).toBeUndefined();
            expect(StructureMetadataTree.resolveLeaf(metadata, [ { name: 'mhc.class', value: 'MHCIII' } ])).toBeUndefined();
        });
    });

    describe('resolveHash', () => {

        // Stricter than resolveLeaf on purpose: this keys an epitope in the page's own state, so a
        // case-insensitive near-match would merge two entries that are not the same.
        it('matches values exactly', () => {
            const entries = [
                { name: 'mhc.class', value: 'MHCI' },
                { name: 'mhc.pair', value: 'HLA-A*02/B2M' },
                { name: 'antigen.epitope', value: 'GILGFVFTL' }
            ];
            expect(StructureMetadataTree.resolveHash(metadata, entries)).toBe('h1');

            entries[ 2 ].value = 'gilgfvftl';
            expect(StructureMetadataTree.resolveHash(metadata, entries)).toBeUndefined();
        });
    });

    describe('leafValues', () => {

        it('flattens every leaf with its hash', () => {
            expect(StructureMetadataTree.leafValues(metadata.root).map(([ hash ]) => hash))
                .toEqual([ 'h1', 'h2', 'h3', 'h4' ]);
        });
    });
});
