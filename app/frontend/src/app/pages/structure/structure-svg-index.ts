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

/**
 * Recovers what a contact map is *of* from the SVG that draws it.
 *
 * The maps come from matplotlib (see the tcr-structures-visualization repository), so every element
 * id is automatic — `line2d_7`, `text_12` — and nothing in the markup names a residue or a contact.
 * What matplotlib does emit, next to every text group, is the source label as an XML comment:
 *
 *     <g id="text_4">
 *       <!-- $\mathrm{N}^{91}$ -->
 *
 * That is asparagine at position 91, and it is enough to rebuild the whole map. Residue boxes are
 * the groups carrying a `<use>` of a square marker; the coloured solid paths are the backbone within
 * a chain; and the black dashed paths are the contacts, whose endpoints coincide exactly with the
 * marker positions, so each one can be resolved back to the pair of residues it joins.
 *
 * The alternative was emitting `data-` attributes from the generator and re-rendering ~118k files.
 * This reads what is already there. It is coupled to matplotlib's output shape, which is why
 * everything below degrades to "no annotations" rather than throwing: a generator change should cost
 * the highlighting, not the structure browser.
 */

/** Chain a residue belongs to, taken from the colour matplotlib drew it in. */
export type StructureChain = 'CDR3a' | 'CDR3b' | 'peptide';

/** Contacts with the peptide are drawn thick, contacts within the TCR thin. */
export type ContactKind = 'inter-chain' | 'intra-chain';

export interface IStructureResidue {
    /** One-letter code as drawn, e.g. `N`. */
    code: string;
    /** Three-letter code for display, e.g. `ASN`. */
    label: string;
    /**
     * Residue number as drawn. Numbering runs within the residue's own chain — CDR3 residues carry
     * their position in the parent TCR chain (so a CDR3a runs ~88-99, not 1-12), and the peptide is
     * numbered from 1. There is no complex-wide index.
     */
    position: number;
    chain: StructureChain;
    x: number;
    y: number;
    /** The `<g>` holding the box, so a caller can style it. */
    element: SVGGElement;
}

export interface IStructureContact {
    from: IStructureResidue;
    to: IStructureResidue;
    kind: ContactKind;
    element: SVGGElement;
}

export interface IStructureSvgIndex {
    residues: IStructureResidue[];
    contacts: IStructureContact[];
}

/** What sits under the pointer: exactly one of the two is set. */
export interface IStructureAnnotation {
    kind: 'residue' | 'contact';
    residue?: IStructureResidue;
    contact?: IStructureContact;
}

const AMINO_ACIDS: { [ code: string ]: string } = {
    A: 'ALA', R: 'ARG', N: 'ASN', D: 'ASP', C: 'CYS', Q: 'GLN', E: 'GLU', G: 'GLY',
    H: 'HIS', I: 'ILE', L: 'LEU', K: 'LYS', M: 'MET', F: 'PHE', P: 'PRO', S: 'SER',
    T: 'THR', W: 'TRP', Y: 'TYR', V: 'VAL'
};

/** Colours plotting.py assigns per chain. */
const CHAIN_BY_COLOUR: { [ colour: string ]: StructureChain } = {
    '#008000': 'CDR3a',
    '#ff0000': 'CDR3b',
    '#0000ff': 'peptide'
};

/** A contact endpoint and a box are written from the same coordinate, so this only has to absorb
 * the last decimal place. */
const ENDPOINT_TOLERANCE = 2;

/**
 * How far a label sits from the box it names. Measured, not guessed: matplotlib offsets the text by
 * a constant dy and a dx that varies with glyph width, which came to 7.96-13.51 across a real map,
 * while the closest two boxes on that same map were 22.47 apart. Sixteen sits between the two.
 *
 * A denser map could close that gap, so the match below also has to be mutual - see `pairLabel`.
 */
const LABEL_TOLERANCE = 16;

const LABEL_PATTERN = /\$?\\?mathrm\{([A-Z])\}\s*\^?\{?(\d+)\}?\$?/;
const TRANSLATE_PATTERN = /translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)/;
const SEGMENT_PATTERN = /M\s*([-\d.]+)[ ,]+([-\d.]+)\s*L\s*([-\d.]+)[ ,]+([-\d.]+)/;

export class StructureSvgIndex {

    /** Reads an already-rendered contact map. Returns empty lists for anything it cannot make sense
     * of, so a caller can always ask and simply get no annotations. */
    public static build(svg: SVGSVGElement | null): IStructureSvgIndex {
        if (!svg) {
            return { residues: [], contacts: [] };
        }

        const residues = StructureSvgIndex.readResidues(svg);
        return { residues, contacts: StructureSvgIndex.readContacts(svg, residues) };
    }

    /** Pairs each residue label with the box drawn at the same place. */
    private static readResidues(svg: SVGSVGElement): IStructureResidue[] {
        const labels = StructureSvgIndex.readLabels(svg);
        const boxes = StructureSvgIndex.readBoxes(svg);

        return boxes.map((box) => {
            const label = StructureSvgIndex.pairLabel(box, labels, boxes);
            if (!label) {
                return undefined;
            }
            return {
                code:     label.code,
                label:    AMINO_ACIDS[ label.code ] || label.code,
                position: label.position,
                chain:    box.chain,
                x:        box.x,
                y:        box.y,
                element:  box.element
            } as IStructureResidue;
        }).filter((residue): residue is IStructureResidue => residue !== undefined);
    }

    private static readLabels(svg: SVGSVGElement):
        Array<{ code: string, position: number, x: number, y: number }> {

        return Array.from(svg.querySelectorAll('g[id^="text_"]')).map((group) => {
            const comment = StructureSvgIndex.commentOf(group);
            const parsed = comment ? LABEL_PATTERN.exec(comment) : null;
            const inner = group.querySelector('g[transform]');
            const at = inner ? TRANSLATE_PATTERN.exec(inner.getAttribute('transform') || '') : null;

            if (!parsed || !at) {
                return undefined;
            }
            return { code: parsed[ 1 ], position: parseInt(parsed[ 2 ], 10), x: parseFloat(at[ 1 ]), y: parseFloat(at[ 2 ]) };
        }).filter((label): label is { code: string, position: number, x: number, y: number } => label !== undefined);
    }

    /** The residue boxes: groups drawing a marker rather than a line. */
    private static readBoxes(svg: SVGSVGElement):
        Array<{ x: number, y: number, chain: StructureChain, element: SVGGElement }> {

        return Array.from(svg.querySelectorAll('g[id^="line2d_"]')).map((group) => {
            const use = group.querySelector('use');
            if (!use) {
                return undefined;
            }
            const chain = CHAIN_BY_COLOUR[ StructureSvgIndex.strokeOf(StructureSvgIndex.markerOf(svg, use)) ];
            if (!chain) {
                return undefined;
            }
            return {
                x:       parseFloat(use.getAttribute('x') || 'NaN'),
                y:       parseFloat(use.getAttribute('y') || 'NaN'),
                chain,
                element: group as SVGGElement
            };
        }).filter((box): box is { x: number, y: number, chain: StructureChain, element: SVGGElement } =>
            box !== undefined && !isNaN(box.x) && !isNaN(box.y));
    }

    /**
     * The black dashed paths. A coloured path is backbone within one chain and is not a contact.
     *
     * Thickness carries the meaning, which is plotting.py's own convention: contacts involving the
     * peptide are drawn at 1.5, contacts between the two CDR3 loops at 0.2.
     */
    private static readContacts(svg: SVGSVGElement, residues: IStructureResidue[]): IStructureContact[] {
        return Array.from(svg.querySelectorAll('g[id^="line2d_"]')).map((group) => {
            if (group.querySelector('use')) {
                return undefined;
            }
            const path = group.querySelector('path');
            if (!path || StructureSvgIndex.strokeOf(path) !== '#000000') {
                return undefined;
            }
            const segment = SEGMENT_PATTERN.exec(path.getAttribute('d') || '');
            if (!segment) {
                return undefined;
            }

            const from = StructureSvgIndex.nearest(residues, parseFloat(segment[ 1 ]), parseFloat(segment[ 2 ]));
            const to = StructureSvgIndex.nearest(residues, parseFloat(segment[ 3 ]), parseFloat(segment[ 4 ]));
            if (!from || !to || from === to) {
                return undefined;
            }

            const involvesPeptide = from.chain === 'peptide' || to.chain === 'peptide';
            return {
                from, to,
                kind:    involvesPeptide ? 'inter-chain' : 'intra-chain',
                element: group as SVGGElement
            } as IStructureContact;
        }).filter((contact): contact is IStructureContact => contact !== undefined);
    }

    /** How a contact reads in the tooltip, e.g. `ASN 91 : ARG 5`. */
    public static describeContact(contact: IStructureContact): string {
        return `${StructureSvgIndex.describeResidue(contact.from)} : ${StructureSvgIndex.describeResidue(contact.to)}`;
    }

    /** How a residue reads in the tooltip, e.g. `ASN 91`. */
    public static describeResidue(residue: IStructureResidue): string {
        return `${residue.label} ${residue.position}`;
    }

    /**
     * The same, qualified by chain: `ASN 91 (CDR3a)`.
     *
     * Numbering runs within each chain, so a bare position is only unambiguous inside one. Position
     * 5 exists in the peptide and in a TCR chain alike, and a contact naming both ends by number
     * alone reads as though they were in the same sequence.
     */
    public static describeResidueWithChain(residue: IStructureResidue): string {
        return `${StructureSvgIndex.describeResidue(residue)} (${residue.chain})`;
    }

    public static describeContactWithChains(contact: IStructureContact): string {
        return `${StructureSvgIndex.describeResidueWithChain(contact.from)}` +
            ` : ${StructureSvgIndex.describeResidueWithChain(contact.to)}`;
    }

    /**
     * What the element under the pointer belongs to, or nothing.
     *
     * Events land on the `<path>` or `<use>` inside a group, so this walks up to the group the index
     * holds. Backbone segments and the axes belong to no annotation and correctly return nothing.
     */
    public static locate(index: IStructureSvgIndex, target: EventTarget | null): IStructureAnnotation | null {
        const element = target instanceof Element ? target.closest('g[id^="line2d_"]') : null;
        if (!element) {
            return null;
        }

        const residue = index.residues.find((candidate) => candidate.element === element);
        if (residue) {
            return { kind: 'residue', residue, contact: undefined };
        }

        const contact = index.contacts.find((candidate) => candidate.element === element);
        return contact ? { kind: 'contact', residue: undefined, contact } : null;
    }

    /**
     * Nearest label to this box, but only if that label's own nearest box is this one.
     *
     * Requiring the match to be mutual is what makes it safe when boxes crowd together: a label
     * closer to a neighbour than to its own box would otherwise be claimed by the neighbour, and
     * both residues would end up mislabelled rather than simply unlabelled.
     */
    private static pairLabel<L extends { x: number, y: number }, B extends { x: number, y: number }>(
        box: B, labels: L[], boxes: B[]): L | undefined {

        const label = StructureSvgIndex.nearest(labels, box.x, box.y, LABEL_TOLERANCE);
        if (!label) {
            return undefined;
        }
        return StructureSvgIndex.nearest(boxes, label.x, label.y, LABEL_TOLERANCE) === box ? label : undefined;
    }

    private static nearest<T extends { x: number, y: number }>(
        candidates: T[], x: number, y: number, tolerance: number = ENDPOINT_TOLERANCE): T | undefined {

        let best: T | undefined;
        let bestDistance = tolerance;

        for (const candidate of candidates) {
            const distance = Math.abs(candidate.x - x) + Math.abs(candidate.y - y);
            if (distance <= bestDistance) {
                best = candidate;
                bestDistance = distance;
            }
        }
        return best;
    }

    /**
     * The marker a residue box draws, which carries the colour and so the chain.
     *
     * Matplotlib defines each marker once and has every later box of the same chain reference it by
     * `xlink:href`, so only the first box per chain owns a local `<defs>`. Reading the local one
     * alone found three residues out of thirty-four and silently dropped the rest.
     */
    private static markerOf(svg: SVGSVGElement, use: Element): Element | null {
        const href = use.getAttribute('xlink:href') || use.getAttribute('href') || '';
        if (href.startsWith('#')) {
            // Attribute selector rather than `#id`: these ids are generated and start with a digit
            // often enough that the shorthand would be an invalid selector.
            const referenced = svg.querySelector(`path[id="${href.slice(1)}"]`);
            if (referenced) {
                return referenced;
            }
        }
        return use.ownerSVGElement === null ? null : (use.parentElement ? use.parentElement.querySelector('defs path') : null);
    }

    private static strokeOf(element: Element | null): string {
        const style = element ? (element.getAttribute('style') || '') : '';
        const stroke = /stroke:\s*([^;]+)/.exec(style);
        return stroke ? stroke[ 1 ].trim().toLowerCase() : '';
    }

    private static commentOf(group: Element): string | null {
        // Typed explicitly: firstChild is a ChildNode while nextSibling is a Node, so an inferred
        // loop variable takes the narrower of the two and rejects the assignment.
        for (let node: Node | null = group.firstChild; node !== null; node = node.nextSibling) {
            if (node.nodeType === Node.COMMENT_NODE) {
                return (node.nodeValue || '').trim();
            }
        }
        return null;
    }
}
