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

import { IStructuresMetadataTreeLevelValue } from 'pages/structure/structure';
import { StructureEpitopeComboController } from './structure-epitope-combo.controller';

/**
 * Four pieces of state decide three outputs between them, which is why this is worth pinning: the
 * value and the placeholder swap roles on focus, and getting that backwards makes the box look like
 * it forgot the selection.
 */
describe('StructureEpitopeComboController', () => {

    const options = (...values: string[]): IStructuresMetadataTreeLevelValue[] =>
        values.map((value) => ({ value, hash: value, next: null, isSelected: false, isOpened: false } as any));

    const all = options('GILGFVFTL', 'GLCTLVAML', 'NLVPMVATV');
    let combo: StructureEpitopeComboController;

    beforeEach(() => combo = new StructureEpitopeComboController());

    describe('filter', () => {

        it('returns everything while nothing is typed', () => {
            expect(combo.filter(all).length).toBe(3);
        });

        // Prefix, not substring: an epitope is read left to right, and typing GIL means the ones
        // that start that way rather than every one containing it.
        it('matches on prefix rather than anywhere in the sequence', () => {
            combo.query = 'GL';
            expect(combo.filter(all).map((v) => v.value)).toEqual([ 'GLCTLVAML' ]);

            combo.query = 'TLV';
            expect(combo.filter(all)).toEqual([]);
        });

        it('ignores case and surrounding space', () => {
            combo.query = '  gil ';
            expect(combo.filter(all).map((v) => v.value)).toEqual([ 'GILGFVFTL' ]);
        });
    });

    describe('value and placeholder', () => {

        it('shows the selection when idle', () => {
            expect(combo.value('GILGFVFTL')).toBe('GILGFVFTL');
            expect(combo.placeholder('GILGFVFTL')).toBe('');
        });

        // On focus the box clears to type into, and the selection moves to the placeholder so the
        // reader can still see what is chosen.
        it('clears the box on focus and moves the selection to the placeholder', () => {
            combo.onFocus(true);
            expect(combo.value('GILGFVFTL')).toBe('');
            expect(combo.placeholder('GILGFVFTL')).toBe('GILGFVFTL');
        });

        it('shows the query once there is one, with no placeholder', () => {
            combo.onFocus(true);
            combo.onInput('GIL', true);
            expect(combo.value('GILGFVFTL')).toBe('GIL');
            expect(combo.placeholder('GILGFVFTL')).toBe('');
        });

        it('prompts when nothing is selected and nothing is typed', () => {
            expect(combo.placeholder(null)).toBe('Select epitope');
        });
    });

    describe('open state', () => {

        // Before an MHC pair is chosen there are no epitopes to list, so the box must not open.
        it('stays shut until there is something to list', () => {
            combo.onFocus(false);
            expect(combo.isOpen).toBe(false);

            combo.onInput('GIL', false);
            expect(combo.isOpen).toBe(false);
            expect(combo.query).toBe('GIL');
        });

        it('opens on focus and on typing once there is', () => {
            combo.onFocus(true);
            expect(combo.isOpen).toBe(true);

            combo.onBlur();
            combo.onInput('G', true);
            expect(combo.isOpen).toBe(true);
        });

        it('clears the query when a selection is committed', () => {
            combo.onFocus(true);
            combo.onInput('GIL', true);
            combo.commit();
            expect(combo.query).toBe('');
            expect(combo.isOpen).toBe(false);
            expect(combo.isFocused).toBe(false);
        });
    });

    describe('isEmptyResult', () => {

        it('says nothing while the box is empty, even with no options', () => {
            expect(combo.isEmptyResult([])).toBe(false);
        });

        it('reports a query that matches nothing', () => {
            combo.query = 'ZZZ';
            expect(combo.isEmptyResult(all)).toBe(true);
        });
    });
});
