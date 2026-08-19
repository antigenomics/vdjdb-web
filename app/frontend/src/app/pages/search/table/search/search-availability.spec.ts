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

import { Utils } from 'utils/utils';
import { SearchAvailabilityService } from './search-availability.service';

/**
 * The join behind the Browse badges, from the client side.
 *
 * These matter more than their size suggests. The badge has two legitimate ways to be inactive - the
 * record genuinely has no motif, or the lookup found nothing - and they look identical on screen. So
 * when the server key gained mhc.a/mhc.b/mhc.class on 2026-07-23 (#200) and this lookup was not
 * taught about them, every cid lookup silently returned nothing and the motif badge went inactive on
 * every row in Browse. Nothing failed anywhere; it just stopped working.
 *
 * The payload below is written in the server's own key shape, taken from a live
 * /api/search/availability response, so a change on either side breaks this.
 */
describe('SearchAvailabilityService', () => {

    // A real record: CASSISSTGELFF / TRBV19 / TRBJ2-2, GILGFVFTL under HLA-A*02, in TCREMP cluster
    // H.B.GILGFVFTL.9. VDJdb curates it at two-field MHC; the cluster-members row says HLA-A*02:01,
    // and the server meets them in the middle at two fields.
    const CID_KEY = 'homosapiens|trb|gilgfvftl|cassisstgelff|trbv19*01|trbj2-2*01|hla-a*02|b2m|mhci';
    const AVAILABILITY_KEY = 'homosapiens|trb|mhci|hla-a*02|gilgfvftl';

    const payload = {
        structures: [ 'abc123' ],
        motifs: [],
        motifsTcremp: [ AVAILABILITY_KEY ],
        visualizations: {},
        motifCidIndex: {},
        motifCidIndexTcremp: { [ CID_KEY ]: 'H.B.GILGFVFTL.9' },
        structureMetrics: {}
    };

    let service: SearchAvailabilityService;

    beforeEach(() => {
        spyOn(Utils.HTTP, 'get').and.returnValue(Promise.resolve({ response: JSON.stringify(payload) } as any));
        service = new SearchAvailabilityService();
    });

    it('finds the cluster a clonotype belongs to', async () => {
        const cid = await service.getMotifCid('HomoSapiens', 'TRB', 'GILGFVFTL', 'CASSISSTGELFF',
            'TRBV19*01', 'TRBJ2-2*01', 'HLA-A*02', 'B2M', 'MHCI', 'tcremp');
        expect(cid).toBe('H.B.GILGFVFTL.9');
    });

    // The record is curated at HLA-A*02 while its cluster row says HLA-A*02:01. Comparing verbatim
    // cost 6,603 records their TCREMP badge on the deployed database.
    it('matches a record whose MHC is written at a different resolution', async () => {
        const cid = await service.getMotifCid('HomoSapiens', 'TRB', 'GILGFVFTL', 'CASSISSTGELFF',
            'TRBV19*01', 'TRBJ2-2*01', 'HLA-A*02:01', 'B2M', 'MHCI', 'tcremp');
        expect(cid).toBe('H.B.GILGFVFTL.9');
    });

    it('answers for the method that was asked for, not the other one', async () => {
        const tcrnet = await service.getMotifCid('HomoSapiens', 'TRB', 'GILGFVFTL', 'CASSISSTGELFF',
            'TRBV19*01', 'TRBJ2-2*01', 'HLA-A*02', 'B2M', 'MHCI', 'tcrnet');
        expect(tcrnet).toBeUndefined();
    });

    it('finds nothing for a clonotype in no cluster, rather than throwing', async () => {
        const cid = await service.getMotifCid('HomoSapiens', 'TRB', 'GILGFVFTL', 'CASSNOTHING',
            'TRBV19*01', 'TRBJ2-2*01', 'HLA-A*02', 'B2M', 'MHCI', 'tcremp');
        expect(cid).toBeUndefined();
    });

    it('refuses to look up an incomplete key, which would collide with every other incomplete one', async () => {
        const cid = await service.getMotifCid('HomoSapiens', 'TRB', 'GILGFVFTL', 'CASSISSTGELFF',
            'TRBV19*01', 'TRBJ2-2*01', '', 'B2M', 'MHCI', 'tcremp');
        expect(cid).toBeUndefined();
    });

    describe('hasMotif', () => {

        it('reports the epitope as having motifs under the method that has them', async () => {
            expect(await service.hasMotif('HomoSapiens', 'TRB', 'MHCI', 'HLA-A*02:01', 'GILGFVFTL', 'tcremp')).toBe(true);
            expect(await service.hasMotif('HomoSapiens', 'TRB', 'MHCI', 'HLA-A*02:01', 'GILGFVFTL', 'tcrnet')).toBe(false);
        });

        it('says no for an epitope that is not in the index', async () => {
            expect(await service.hasMotif('HomoSapiens', 'TRB', 'MHCI', 'HLA-A*02', 'NLVPMVATV', 'tcremp')).toBe(false);
        });
    });

    describe('hasStructure', () => {

        it('reports a structure the server listed', async () => {
            expect(await service.hasStructure('ABC123')).toBe(true);
            expect(await service.hasStructure('nosuchhash')).toBe(false);
        });
    });
});
