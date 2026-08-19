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

import { IStructureAnnotation, IStructureSvgIndex, StructureSvgIndex } from 'pages/structure/structure-svg-index';

/** Class marking the residue box under the pointer. */
export const RESIDUE_HOVER_CLASS = 'structure-hover--residue';

/** Class marking the contact line under the pointer. */
export const CONTACT_HOVER_CLASS = 'structure-hover--contact';

/** Added alongside it for a CDR3a-CDR3b contact, which is drawn thinner and is highlighted softer:
 * plotting.py draws it at 0.2 against 1.5 for a peptide contact, and shouting at both equally lost
 * that distinction exactly where it matters. */
export const CONTACT_INTERNAL_HOVER_CLASS = 'structure-hover--contact-internal';

/** The label element, and the classes that show and place it. */
export const TIP_CLASS = 'structure-hover-tip';
export const TIP_VISIBLE_CLASS = 'structure-hover-tip--visible';
export const TIP_FLIP_X_CLASS = 'structure-hover-tip--flip-x';
export const TIP_FLIP_Y_CLASS = 'structure-hover-tip--flip-y';

/**
 * Highlights the residue or contact under the pointer, and names it.
 *
 * Only ever attached to the front structure. The layers behind it are `pointer-events: none`, so
 * they cannot be hovered at all — which is the intended behaviour rather than an accident of
 * stacking: with five maps overlaid, highlighting whichever happened to be on top under the cursor
 * would report a residue from a structure the reader is not looking at.
 *
 * The index is rebuilt whenever the `<svg>` changes identity rather than on a lifecycle hook. The
 * markup is written into the host with `innerHTML`, so the host element survives a change of
 * structure and there is no reliable hook that fires after the new SVG lands; noticing at the next
 * pointer event costs one comparison and cannot go stale.
 *
 * The pointer events come from template bindings. An earlier attempt attached raw listeners to an
 * element resolved by `@ViewChild` - the query never delivered the element and the feature silently
 * did nothing. A binding cannot fail to fire, so that is what drives this.
 *
 * What the binding must not do is mark the component dirty. The three best-studied epitopes list
 * 2000-3706 cards in this same component, and one change-detection pass over them costs 66-104ms
 * against 14ms for a pointer move that changes nothing - so the tooltip is written, exactly as the
 * highlight class already was. Both it and the `<svg>` are found through the event's own
 * `currentTarget`, which is the lookup that works here.
 */
export class StructureHoverController {

    /** What is under the pointer, e.g. `ASN 91` or `ASN 91 : ARG 5`. Null when nothing is. */
    public label: string | null = null;

    /**
     * Nominal tooltip size, used only to choose a side.
     *
     * A measured width would be better for exact placement, but this only decides which way to
     * flip, so being approximate costs nothing: the label is at most something like
     * `ASN 91 : ARG 5`. Erring large means flipping slightly early, which is invisible.
     */
    private static readonly NominalWidth: number = 150;
    private static readonly NominalHeight: number = 34;

    /**
     * How near the pointer must come to a contact line, in the map's own units.
     *
     * The map is ~684 units wide drawn at ~520px, so a unit is a little under a pixel: eight units
     * is roughly a six-pixel target. Generous enough to catch a hair-thin line, tight enough that
     * two contacts crossing near a residue do not fight over the pointer.
     */
    private static readonly ContactTolerance: number = 8;

    private svg: SVGSVGElement | null = null;
    private index: IStructureSvgIndex = { residues: [], contacts: [] };
    private highlighted?: SVGGElement;
    private tip: HTMLElement | null = null;

    public track(event: MouseEvent): void {
        const host = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
        this.refreshIndex(host);

        const annotation = this.locate(event);
        const element = StructureHoverController.elementOf(annotation);

        if (element !== this.highlighted) {
            this.unhighlight();
            if (annotation && element) {
                element.classList.add(...StructureHoverController.classesFor(annotation));
                this.highlighted = element;
            }
        }

        this.label = StructureHoverController.describe(annotation);
        if (!this.tip || !host) {
            return;
        }

        if (this.label === null) {
            this.tip.classList.remove(TIP_VISIBLE_CLASS);
            return;
        }

        const bounds = host.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;

        this.tip.textContent = this.label;
        this.tip.style.left = `${x}px`;
        this.tip.style.top = `${y}px`;
        // Flip rather than clamp: a tooltip pinned to the edge covers what the reader is
        // pointing at, which is the one thing it must not do.
        this.tip.classList.toggle(TIP_FLIP_X_CLASS, x + StructureHoverController.NominalWidth > bounds.width);
        this.tip.classList.toggle(TIP_FLIP_Y_CLASS, y < StructureHoverController.NominalHeight);
        this.tip.classList.add(TIP_VISIBLE_CLASS);
    }

    /**
     * What is under the pointer: a residue by hit-test, otherwise the nearest contact by distance.
     *
     * Contacts are deliberately *never* resolved by hit-test, even though the browser will happily
     * name one. A peptide contact is drawn at 1.5 units and a CDR3a-CDR3b contact at 0.2, so where
     * the two cross or run close the thick one owns the pixel and the thin one can never be picked -
     * measured on a real map, one CDR3a-CDR3b contact was unreachable along 100% of its length and
     * the class averaged 80%. Going by distance instead put every contact of both classes at 100%.
     *
     * Residue boxes keep the hit-test: they are twenty units across, opaque, and unambiguous.
     */
    private locate(event: MouseEvent): IStructureAnnotation | null {
        const residue = StructureSvgIndex.locateResidue(this.index, event.target);
        if (residue) {
            return { kind: 'residue', residue, contact: undefined };
        }
        return this.locateContactNear(event);
    }

    /**
     * The nearest contact to the pointer, within tolerance.
     *
     * Converting through the SVG's own matrix rather than assuming the viewBox maps linearly to the
     * element keeps this correct under the zoom transform.
     */
    private locateContactNear(event: MouseEvent): IStructureAnnotation | null {
        if (!this.svg || this.index.contacts.length === 0) {
            return null;
        }

        const matrix = this.svg.getScreenCTM();
        if (!matrix) {
            return null;
        }

        const point = this.svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const inMap = point.matrixTransform(matrix.inverse());

        const contact = StructureSvgIndex.nearestContact(
            this.index, inMap.x, inMap.y, StructureHoverController.ContactTolerance);

        return contact ? { kind: 'contact', residue: undefined, contact } : null;
    }

    public clear(): void {
        this.unhighlight();
        this.label = null;
        if (this.tip) {
            this.tip.classList.remove(TIP_VISIBLE_CLASS);
        }
    }

    private unhighlight(): void {
        if (this.highlighted) {
            this.highlighted.classList.remove(RESIDUE_HOVER_CLASS, CONTACT_HOVER_CLASS, CONTACT_INTERNAL_HOVER_CLASS);
            this.highlighted = undefined;
        }
    }

    private static classesFor(annotation: IStructureAnnotation): string[] {
        if (annotation.kind === 'residue') {
            return [ RESIDUE_HOVER_CLASS ];
        }
        return annotation.contact!.kind === 'tcr-internal'
            ? [ CONTACT_HOVER_CLASS, CONTACT_INTERNAL_HOVER_CLASS ]
            : [ CONTACT_HOVER_CLASS ];
    }

    /** Rebuilds when the host is showing a different SVG than the one the index was built from. */
    private refreshIndex(host: HTMLElement | null): void {
        const svg = host ? host.querySelector('svg') : null;
        if (svg !== this.svg) {
            this.svg = svg as SVGSVGElement | null;
            this.index = StructureSvgIndex.build(this.svg);
        }
        if (host && (!this.tip || !host.contains(this.tip))) {
            this.tip = host.querySelector(`.${TIP_CLASS}`) as HTMLElement | null;
        }
    }

    private static elementOf(annotation: IStructureAnnotation | null): SVGGElement | undefined {
        if (!annotation) {
            return undefined;
        }
        return annotation.kind === 'residue' ? annotation.residue!.element : annotation.contact!.element;
    }

    private static describe(annotation: IStructureAnnotation | null): string | null {
        if (!annotation) {
            return null;
        }
        return annotation.kind === 'residue'
            ? StructureSvgIndex.describeResidue(annotation.residue!)
            : StructureSvgIndex.describeContact(annotation.contact!);
    }
}
