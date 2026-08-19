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

import { StructureSvgIndex } from './structure-svg-index';

/**
 * The fixture reproduces matplotlib's output shape rather than a convenient one: the residue label
 * lives in an XML comment, the box is a `<use>` of a marker defined inside the group, and the label
 * is offset from the box it names. Coordinates and the offset are taken from a real map served by
 * the application, so a change in the generator should break these tests rather than pass them.
 */
describe('StructureSvgIndex', () => {

    const GREEN = '#008000';  // CDR3a
    const RED = '#ff0000';    // CDR3b
    const BLUE = '#0000ff';   // peptide

    // Matplotlib puts the label up and to the left of the box centre.
    const LABEL_DX = -8.15;
    const LABEL_DY = 2.76;

    let nextId: number;

    function label(code: string, position: number, x: number, y: number): string {
        return `<g id="text_${nextId++}">
            <!-- $\\mathrm{${code}}^{${position}}$ -->
            <g style="fill: #ffffff" transform="translate(${x + LABEL_DX} ${y + LABEL_DY}) scale(0.1 -0.1)"></g>
        </g>`;
    }

    function box(x: number, y: number, colour: string): string {
        const marker = `m${nextId}`;
        return `<g id="line2d_${nextId++}">
            <defs><path id="${marker}" d="M -10 10 L 10 10 L 10 -10 L -10 -10 z"
                        style="stroke: ${colour}; stroke-width: 1.2"></path></defs>
            <g clip-path="url(#clip)"><use xlink:href="#${marker}" x="${x}" y="${y}"></use></g>
        </g>`;
    }

    function residue(code: string, position: number, x: number, y: number, colour: string): string {
        return label(code, position, x, y) + box(x, y, colour);
    }

    function line(x1: number, y1: number, x2: number, y2: number, colour: string, width: number): string {
        return `<g id="line2d_${nextId++}">
            <path d="M ${x1} ${y1} L ${x2} ${y2}" style="fill: none; stroke: ${colour}; stroke-width: ${width}"></path>
        </g>`;
    }

    function parse(body: string): SVGSVGElement {
        const holder = document.createElement('div');
        holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 684 568.8">${body}</svg>`;
        return holder.querySelector('svg') as any;
    }

    beforeEach(() => nextId = 1);

    describe('build', () => {

        it('recovers residues from the labels matplotlib leaves in comments', () => {
            const index = StructureSvgIndex.build(parse(
                residue('N', 91, 400, 200, GREEN) +
                residue('R', 5, 300, 400, BLUE)));

            expect(index.residues.length).toBe(2);

            const asparagine = index.residues[ 0 ];
            expect(asparagine.code).toBe('N');
            expect(asparagine.label).toBe('ASN');
            expect(asparagine.position).toBe(91);
            expect(asparagine.chain).toBe('CDR3a');

            expect(index.residues[ 1 ].label).toBe('ARG');
            expect(index.residues[ 1 ].chain).toBe('peptide');
        });

        it('assigns the chain from the colour the box was drawn in', () => {
            const index = StructureSvgIndex.build(parse(
                residue('C', 88, 100, 100, GREEN) +
                residue('G', 100, 200, 100, RED) +
                residue('Y', 1, 300, 100, BLUE)));

            expect(index.residues.map((r) => r.chain)).toEqual([ 'CDR3a', 'CDR3b', 'peptide' ]);
        });

        it('reads a contact with the peptide as inter-chain', () => {
            const index = StructureSvgIndex.build(parse(
                residue('N', 91, 400, 200, GREEN) +
                residue('R', 5, 300, 400, BLUE) +
                line(400, 200, 300, 400, '#000000', 1.5)));

            expect(index.contacts.length).toBe(1);
            expect(index.contacts[ 0 ].kind).toBe('inter-chain');
            expect(StructureSvgIndex.describeContact(index.contacts[ 0 ])).toBe('ASN 91 : ARG 5');
        });

        it('reads a contact between the two CDR3 loops as intra-chain', () => {
            const index = StructureSvgIndex.build(parse(
                residue('M', 96, 400, 200, GREEN) +
                residue('G', 100, 500, 300, RED) +
                line(400, 200, 500, 300, '#000000', 0.2)));

            expect(index.contacts.length).toBe(1);
            expect(index.contacts[ 0 ].kind).toBe('intra-chain');
            expect(StructureSvgIndex.describeContact(index.contacts[ 0 ])).toBe('MET 96 : GLY 100');
        });

        it('does not mistake the backbone for a contact', () => {
            // A coloured solid line joins consecutive residues within one chain. There are more of
            // these than there are contacts, so counting them would roughly treble every map.
            const index = StructureSvgIndex.build(parse(
                residue('C', 88, 100, 100, GREEN) +
                residue('A', 89, 200, 100, GREEN) +
                line(100, 100, 200, 100, GREEN, 1.5)));

            expect(index.residues.length).toBe(2);
            expect(index.contacts.length).toBe(0);
        });

        it('labels a residue only when the match is mutual', () => {
            // Two boxes closer together than a label is to its own box. Guessing here would
            // mislabel both residues, which is worse than leaving them unannotated.
            const index = StructureSvgIndex.build(parse(
                residue('C', 88, 100, 100, GREEN) + box(104, 100, GREEN)));

            expect(index.residues.length).toBe(1);
            expect(index.residues[ 0 ].position).toBe(88);
        });

        it('yields nothing rather than throwing on markup it does not recognise', () => {
            expect(StructureSvgIndex.build(null)).toEqual({ residues: [], contacts: [] });
            expect(StructureSvgIndex.build(parse('')).residues).toEqual([]);
            // A box with no label, and a black line joining nothing.
            const index = StructureSvgIndex.build(parse(box(10, 10, GREEN) + line(0, 0, 999, 999, '#000000', 1.5)));
            expect(index.residues).toEqual([]);
            expect(index.contacts).toEqual([]);
        });

        it('keeps an unknown one-letter code rather than dropping the residue', () => {
            const index = StructureSvgIndex.build(parse(residue('X', 42, 100, 100, GREEN)));

            expect(index.residues.length).toBe(1);
            expect(StructureSvgIndex.describeResidue(index.residues[ 0 ])).toBe('X 42');
        });
    });
});
