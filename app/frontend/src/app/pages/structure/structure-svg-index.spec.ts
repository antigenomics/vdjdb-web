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

    // Matplotlib defines a marker once per chain and has every later box reference it, so only the
    // first box of a colour carries a <defs>. A fixture that gave each box its own definition hid a
    // real defect: reading only the local <defs> found 3 residues out of 34 on a served map.
    let definedMarkers: { [ colour: string ]: string };

    function box(x: number, y: number, colour: string): string {
        const id = `line2d_${nextId++}`;
        const known = definedMarkers[ colour ];
        const marker = known || `marker_${colour.replace('#', '')}`;
        const defs = known ? '' :
            `<defs><path id="${marker}" d="M -10 10 L 10 10 L 10 -10 L -10 -10 z"
                        style="stroke: ${colour}; stroke-width: 1.2"></path></defs>`;
        definedMarkers[ colour ] = marker;

        return `<g id="${id}">
            ${defs}
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

    beforeEach(() => { nextId = 1; definedMarkers = {}; });

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

        it('resolves a marker shared by every box of the same chain', () => {
            // Only the first box of a colour defines the marker; the rest reference it by
            // xlink:href. Following that reference is what makes the whole chain readable.
            const index = StructureSvgIndex.build(parse(
                residue('C', 88, 100, 100, GREEN) +
                residue('A', 89, 200, 100, GREEN) +
                residue('V', 90, 300, 100, GREEN)));

            expect(index.residues.length).toBe(3);
            expect(index.residues.map((r) => r.chain)).toEqual([ 'CDR3a', 'CDR3a', 'CDR3a' ]);
            expect(index.residues.map((r) => r.position)).toEqual([ 88, 89, 90 ]);
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

        it('names a residue with its chain where a bare number would be ambiguous', () => {
            // Numbering runs within each chain, so position 5 exists in the peptide and in a TCR
            // chain alike. Unqualified, a contact between them reads as one sequence.
            const index = StructureSvgIndex.build(parse(
                residue('N', 91, 400, 200, GREEN) +
                residue('R', 5, 300, 400, BLUE) +
                line(400, 200, 300, 400, '#000000', 1.5)));

            expect(StructureSvgIndex.describeResidueWithChain(index.residues[ 0 ])).toBe('ASN 91 (CDR3a)');
            expect(StructureSvgIndex.describeContactWithChains(index.contacts[ 0 ]))
                .toBe('ASN 91 (CDR3a) : ARG 5 (peptide)');
        });

        it('keeps an unknown one-letter code rather than dropping the residue', () => {
            const index = StructureSvgIndex.build(parse(residue('X', 42, 100, 100, GREEN)));

            expect(index.residues.length).toBe(1);
            expect(StructureSvgIndex.describeResidue(index.residues[ 0 ])).toBe('X 42');
        });
    });

    describe('nearestContact', () => {

        function twoResiduesAndAContact() {
            return StructureSvgIndex.build(parse(
                residue('N', 91, 100, 100, GREEN) +
                residue('R', 5, 300, 100, BLUE) +
                line(100, 100, 300, 100, '#000000', 1.5)));
        }

        it('finds a contact the pointer is merely near', () => {
            // A 0.2-unit line is a fifth of a pixel on screen; the browser will never report it as
            // hit, so distance is the only way to reach one.
            const index = twoResiduesAndAContact();

            expect(StructureSvgIndex.nearestContact(index, 200, 104, 8)).toBe(index.contacts[ 0 ]);
            expect(StructureSvgIndex.nearestContact(index, 200, 100, 8)).toBe(index.contacts[ 0 ]);
        });

        it('ignores a contact beyond the tolerance', () => {
            const index = twoResiduesAndAContact();

            expect(StructureSvgIndex.nearestContact(index, 200, 140, 8)).toBeNull();
        });

        it('measures to the segment, not to its infinite line', () => {
            // Level with the contact but well past its end: near the line, far from the segment.
            const index = twoResiduesAndAContact();

            expect(StructureSvgIndex.nearestContact(index, 500, 100, 8)).toBeNull();
        });

        it('prefers the closer of two contacts', () => {
            const index = StructureSvgIndex.build(parse(
                residue('N', 91, 100, 100, GREEN) +
                residue('R', 5, 300, 100, BLUE) +
                residue('D', 7, 300, 200, BLUE) +
                line(100, 100, 300, 100, '#000000', 1.5) +
                line(100, 100, 300, 200, '#000000', 1.5)));

            const near = StructureSvgIndex.nearestContact(index, 200, 101, 8);
            expect(StructureSvgIndex.describeContact(near)).toBe('ASN 91 : ARG 5');
        });
    });

    describe('locate', () => {

        it('finds the residue or contact an event landed in', () => {
            const svg = parse(
                residue('N', 91, 400, 200, GREEN) +
                residue('R', 5, 300, 400, BLUE) +
                line(400, 200, 300, 400, '#000000', 1.5));
            const index = StructureSvgIndex.build(svg);

            // Events land on the inner <use> or <path>, not the group the index holds.
            const insideBox = index.residues[ 0 ].element.querySelector('use');
            const located = StructureSvgIndex.locate(index, insideBox);
            expect(located.kind).toBe('residue');
            expect(located.residue.position).toBe(91);

            const insideLine = index.contacts[ 0 ].element.querySelector('path');
            expect(StructureSvgIndex.locate(index, insideLine).kind).toBe('contact');
        });

        it('finds nothing for the backbone, or for anything outside the map', () => {
            const svg = parse(
                residue('C', 88, 100, 100, GREEN) +
                residue('A', 89, 200, 100, GREEN) +
                line(100, 100, 200, 100, GREEN, 1.5));
            const index = StructureSvgIndex.build(svg);

            const backbone = svg.querySelector('g[id="line2d_5"] path');
            expect(StructureSvgIndex.locate(index, backbone)).toBeNull();
            expect(StructureSvgIndex.locate(index, null)).toBeNull();
            expect(StructureSvgIndex.locate(index, svg)).toBeNull();
        });
    });
});
