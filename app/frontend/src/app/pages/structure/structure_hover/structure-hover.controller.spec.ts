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

import {
    CONTACT_HOVER_CLASS, RESIDUE_HOVER_CLASS, StructureHoverController,
    TIP_FLIP_X_CLASS, TIP_FLIP_Y_CLASS, TIP_VISIBLE_CLASS
} from './structure-hover.controller';

/**
 * The tooltip is written to the DOM rather than bound, so nothing in Angular fails loudly when it
 * stops working - it just silently never appears, which is how the first version of this feature
 * shipped broken. These drive a real pointer event through a real host and read the element back.
 *
 * The SVG mirrors matplotlib's output shape: the residue name lives in an XML comment, the box is a
 * <use> of a marker defined once per chain, and the label sits up and left of the box it names.
 */
describe('StructureHoverController', () => {

    const GREEN = '#008000';   // CDR3a
    const BLUE = '#0000ff';    // peptide
    const LABEL_DX = -8.15;
    const LABEL_DY = 2.76;

    let host: HTMLElement;
    let tip: HTMLElement;
    let controller: StructureHoverController;
    let nextId: number;
    let definedMarkers: { [ colour: string ]: string };

    function residue(code: string, position: number, x: number, y: number, colour: string): string {
        const text = `<g id="text_${nextId++}">
            <!-- $\\mathrm{${code}}^{${position}}$ -->
            <g style="fill: #ffffff" transform="translate(${x + LABEL_DX} ${y + LABEL_DY}) scale(0.1 -0.1)"></g>
        </g>`;
        const known = definedMarkers[ colour ];
        const marker = known || `marker_${colour.replace('#', '')}`;
        const defs = known ? '' :
            `<defs><path id="${marker}" d="M -10 10 L 10 10 L 10 -10 L -10 -10 z"
                        style="stroke: ${colour}; stroke-width: 1.2"></path></defs>`;
        definedMarkers[ colour ] = marker;
        return `${text}<g id="line2d_${nextId++}">${defs}
            <g clip-path="url(#clip)"><use xlink:href="#${marker}" x="${x}" y="${y}"></use></g>
        </g>`;
    }

    /** Dispatches through a listener on the host, so currentTarget is the host as it is in the app. */
    function move(target: Element, clientX: number, clientY: number): void {
        const listener = (event: MouseEvent) => controller.track(event);
        host.addEventListener('mousemove', listener);
        target.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }));
        host.removeEventListener('mousemove', listener);
    }

    function boxOf(position: number): Element {
        // Boxes follow their label in document order, one <use> per residue.
        return host.querySelectorAll('use')[ position ];
    }

    beforeEach(() => {
        nextId = 1;
        definedMarkers = {};
        controller = new StructureHoverController();
        host = document.createElement('div');
        host.setAttribute('style', 'position: absolute; left: 0; top: 0; width: 200px; height: 200px;');
        host.innerHTML =
            `<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 684 568.8">` +
            residue('N', 91, 400, 200, GREEN) +
            residue('R', 5, 300, 400, BLUE) +
            `</svg></div><div class="structure-hover-tip"></div>`;
        document.body.appendChild(host);
        tip = host.querySelector('.structure-hover-tip') as HTMLElement;
    });

    afterEach(() => document.body.removeChild(host));

    it('names the residue under the pointer and shows the tooltip', () => {
        move(boxOf(0), 50, 60);

        expect(tip.textContent).toBe('ASN 91');
        expect(tip.classList.contains(TIP_VISIBLE_CLASS)).toBe(true);
        expect(controller.label).toBe('ASN 91');
    });

    it('highlights the box it names, and only that one', () => {
        move(boxOf(1), 50, 60);

        const highlighted = host.querySelectorAll(`.${RESIDUE_HOVER_CLASS}`);
        expect(highlighted.length).toBe(1);
        expect(tip.textContent).toBe('ARG 5');
    });

    it('moves the highlight rather than accumulating it', () => {
        move(boxOf(0), 50, 60);
        move(boxOf(1), 60, 70);

        expect(host.querySelectorAll(`.${RESIDUE_HOVER_CLASS}`).length).toBe(1);
        expect(host.querySelectorAll(`.${CONTACT_HOVER_CLASS}`).length).toBe(0);
        expect(tip.textContent).toBe('ARG 5');
    });

    it('positions the tooltip relative to the host', () => {
        move(boxOf(0), 50, 60);

        expect(tip.style.left).toBe('50px');
        expect(tip.style.top).toBe('60px');
    });

    // Clamping would slide the label over the residue being pointed at, which is the one thing it
    // must not cover - so it flips to the other side of the pointer instead.
    it('flips the tooltip away from the right edge and the top', () => {
        move(boxOf(0), 180, 10);

        expect(tip.classList.contains(TIP_FLIP_X_CLASS)).toBe(true);
        expect(tip.classList.contains(TIP_FLIP_Y_CLASS)).toBe(true);
    });

    it('unflips once there is room again', () => {
        move(boxOf(0), 180, 10);
        move(boxOf(0), 10, 150);

        expect(tip.classList.contains(TIP_FLIP_X_CLASS)).toBe(false);
        expect(tip.classList.contains(TIP_FLIP_Y_CLASS)).toBe(false);
    });

    it('hides the tooltip and drops the highlight when the pointer leaves', () => {
        move(boxOf(0), 50, 60);
        controller.clear();

        expect(tip.classList.contains(TIP_VISIBLE_CLASS)).toBe(false);
        expect(host.querySelectorAll(`.${RESIDUE_HOVER_CLASS}`).length).toBe(0);
        expect(controller.label).toBeNull();
    });

    it('hides the tooltip when the pointer moves onto nothing', () => {
        move(boxOf(0), 50, 60);
        move(host, 5, 5);

        expect(tip.classList.contains(TIP_VISIBLE_CLASS)).toBe(false);
        expect(host.querySelectorAll(`.${RESIDUE_HOVER_CLASS}`).length).toBe(0);
    });

    // The overlay is destroyed and rebuilt when the selection empties, so the element the tooltip
    // was resolved to can be replaced under the controller.
    it('re-resolves the tooltip after the overlay is rebuilt', () => {
        move(boxOf(0), 50, 60);

        const rebuilt = document.createElement('div');
        rebuilt.className = 'structure-hover-tip';
        host.replaceChild(rebuilt, tip);
        move(boxOf(0), 50, 60);

        expect(rebuilt.textContent).toBe('ASN 91');
        expect(rebuilt.classList.contains(TIP_VISIBLE_CLASS)).toBe(true);
    });
});
