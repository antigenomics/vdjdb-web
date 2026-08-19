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

import { ChangeDetectorRef } from '@angular/core';
import { IStructureAnnotation, IStructureSvgIndex, StructureSvgIndex } from 'pages/structure/structure-svg-index';

/** Class marking the residue box under the pointer. */
export const RESIDUE_HOVER_CLASS = 'structure-hover--residue';

/** Class marking the contact line under the pointer. */
export const CONTACT_HOVER_CLASS = 'structure-hover--contact';

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
 * Driven straight from template bindings. An earlier attempt attached raw listeners to an element
 * resolved by `@ViewChild`, to keep pointer moves out of change detection - the query never
 * delivered the element and the feature silently did nothing. Correctness first: a binding cannot
 * fail to fire.
 */
export class StructureHoverController {

    /** What is under the pointer, e.g. `ASN 91` or `ASN 91 : ARG 5`. Null when nothing is. */
    public label: string | null = null;

    /** Where to put the tooltip, relative to the host. */
    public x: number = 0;
    public y: number = 0;

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

    constructor(private changeDetector: ChangeDetectorRef) {}

    /** Exposed for the tooltip's `*ngIf`; the template should not reach into the index. */
    public get isActive(): boolean {
        return this.label !== null;
    }

    public track(event: MouseEvent): void {
        const host = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
        this.refreshIndex(host);

        const annotation = StructureSvgIndex.locate(this.index, event.target)
            || this.locateContactNear(event);
        const element = StructureHoverController.elementOf(annotation);

        if (element !== this.highlighted) {
            this.unhighlight();
            if (annotation && element) {
                element.classList.add(annotation.kind === 'residue' ? RESIDUE_HOVER_CLASS : CONTACT_HOVER_CLASS);
                this.highlighted = element;
            }
        }

        const label = StructureHoverController.describe(annotation);
        const changed = label !== this.label;
        this.label = label;

        if (label !== null && host) {
            const bounds = host.getBoundingClientRect();
            this.x = event.clientX - bounds.left;
            this.y = event.clientY - bounds.top;
        }

        // The tooltip follows the pointer, so a move within one residue still has to repaint.
        if (changed || label !== null) {
            this.changeDetector.markForCheck();
        }
    }

    /**
     * Falls back to the nearest contact when the pointer is not inside anything.
     *
     * Residue boxes are twenty units across and can simply be pointed at; contact lines cannot, so
     * they are found by distance. Converting through the SVG's own matrix rather than assuming the
     * viewBox maps linearly to the element keeps this correct under the zoom transform.
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
        if (this.label !== null) {
            this.label = null;
            this.changeDetector.markForCheck();
        }
    }

    private unhighlight(): void {
        if (this.highlighted) {
            this.highlighted.classList.remove(RESIDUE_HOVER_CLASS, CONTACT_HOVER_CLASS);
            this.highlighted = undefined;
        }
    }

    /** Rebuilds when the host is showing a different SVG than the one the index was built from. */
    private refreshIndex(host: HTMLElement | null): void {
        const svg = host ? host.querySelector('svg') : null;
        if (svg !== this.svg) {
            this.svg = svg as SVGSVGElement | null;
            this.index = StructureSvgIndex.build(this.svg);
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
