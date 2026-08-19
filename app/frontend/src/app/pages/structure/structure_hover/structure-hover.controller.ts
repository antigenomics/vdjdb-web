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
 */
export class StructureHoverController {

    /** What is under the pointer, e.g. `ASN 91` or `ASN 91 : ARG 5`. Null when nothing is. */
    public label: string | null = null;

    /** Where to put the tooltip, relative to the host. */
    public x: number = 0;
    public y: number = 0;

    private host?: HTMLElement;
    private svg: SVGSVGElement | null = null;
    private index: IStructureSvgIndex = { residues: [], contacts: [] };
    private highlighted?: SVGGElement;

    private readonly onPointerMove = (event: MouseEvent): void => this.track(event);
    private readonly onPointerLeave = (): void => this.clear();

    constructor(private changeDetector: ChangeDetectorRef) {}

    public attach(host: HTMLElement | undefined): void {
        if (this.host === host) {
            return;
        }
        this.detach();
        this.host = host;

        if (host) {
            // Passive: this only reads positions and toggles a class, it never blocks scrolling.
            host.addEventListener('mousemove', this.onPointerMove, { passive: true });
            host.addEventListener('mouseleave', this.onPointerLeave, { passive: true });
        }
    }

    public detach(): void {
        if (this.host) {
            this.host.removeEventListener('mousemove', this.onPointerMove);
            this.host.removeEventListener('mouseleave', this.onPointerLeave);
        }
        this.clear();
        this.host = undefined;
        this.svg = null;
        this.index = { residues: [], contacts: [] };
    }

    /** Exposed for the tooltip's `*ngIf`; the template should not reach into the index. */
    public get isActive(): boolean {
        return this.label !== null;
    }

    private track(event: MouseEvent): void {
        this.refreshIndex();

        const annotation = StructureSvgIndex.locate(this.index, event.target);
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

        if (label !== null && this.host) {
            const bounds = this.host.getBoundingClientRect();
            this.x = event.clientX - bounds.left;
            this.y = event.clientY - bounds.top;
        }

        // The tooltip follows the pointer, so a move within one residue still has to repaint.
        if (changed || label !== null) {
            this.changeDetector.markForCheck();
        }
    }

    private clear(): void {
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
    private refreshIndex(): void {
        const svg = this.host ? this.host.querySelector('svg') : null;
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
