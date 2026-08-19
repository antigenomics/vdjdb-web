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

import { EpitopeBridgeService, repairMhcGene } from './epitope-bridge.service';

/**
 * `mhc.a` carries more than one spelling of the same locus and the two motif builds froze different
 * ones, so every MHC comparison in the app has to repair before it compares. These pin the repair to
 * the list the server applies in `Motifs.MalformedMhcGenes` — if the two drift, a badge lights up
 * and its link lands on an empty page, which is exactly how this broke.
 */
describe('repairMhcGene', () => {

    it('writes the mouse loci with the MGI symbol', () => {
        expect(repairMhcGene('h-2db')).toBe('h2-db');
        expect(repairMhcGene('h-2kb')).toBe('h2-kb');
        expect(repairMhcGene('h-2kd')).toBe('h2-kd');
    });

    it('gives the HLA class II alpha and beta chains their gene number', () => {
        expect(repairMhcGene('hla-dpa*01')).toBe('hla-dpa1*01');
        expect(repairMhcGene('hla-dpb*04')).toBe('hla-dpb1*04');
    });

    // Every one of these is already the correct symbol; repairing them would break a key that matches.
    it('leaves a well-formed symbol alone', () => {
        expect(repairMhcGene('h2-db')).toBe('h2-db');
        expect(repairMhcGene('hla-dpa1*01')).toBe('hla-dpa1*01');
        expect(repairMhcGene('hla-dra*01')).toBe('hla-dra*01');
        expect(repairMhcGene('hla-dqa1*05')).toBe('hla-dqa1*05');
        expect(repairMhcGene('hla-a*02')).toBe('hla-a*02');
        expect(repairMhcGene('i-ab')).toBe('i-ab');
        expect(repairMhcGene('mamu-a*01')).toBe('mamu-a*01');
    });
});

describe('EpitopeBridgeService.mhcHead', () => {

    // The head is what the Motif and Structure trees are matched on, so both spellings of one locus
    // have to reduce to the same token or a cross-page link resolves to nothing.
    it('reduces both spellings of a mouse locus to one token', () => {
        expect(EpitopeBridgeService.mhcHead('H-2Db')).toBe('h2-db');
        expect(EpitopeBridgeService.mhcHead('H2-Db')).toBe('h2-db');
    });

    // The repair runs before the allele suffix is stripped: after stripping, `hla-dpa*01:03` would
    // read as `hla-dpa`, which looks like a gene name rather than a truncated one.
    it('reduces both spellings of the class II alpha chain to one token', () => {
        expect(EpitopeBridgeService.mhcHead('HLA-DPA*01:03')).toBe('hla-dpa1');
        expect(EpitopeBridgeService.mhcHead('HLA-DPA1*01:03')).toBe('hla-dpa1');
    });

    it('still strips the allele and takes the first half of a pair', () => {
        expect(EpitopeBridgeService.mhcHead('HLA-A*02:01')).toBe('hla-a');
        expect(EpitopeBridgeService.mhcHead('HLA-A/B2M')).toBe('hla-a');
        expect(EpitopeBridgeService.mhcHead('HLA-DRA*01:01')).toBe('hla-dra');
    });

    it('answers empty for nothing at all', () => {
        expect(EpitopeBridgeService.mhcHead(undefined)).toBe('');
        expect(EpitopeBridgeService.mhcHead(null)).toBe('');
        expect(EpitopeBridgeService.mhcHead('')).toBe('');
    });
});
