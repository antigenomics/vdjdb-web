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

import { NavigationBarComponent } from './navbar.component';

/**
 * The navbar dropdowns open on CSS `:hover` and `:focus-within`, so the only thing the component
 * decides is when a menu is *forced* shut — and every bug this file covers was in that decision, not
 * in the CSS. None of it needs a rendered component: the state is one field and three methods.
 */
describe('NavigationBarComponent dropdown state', () => {

    function build(): NavigationBarComponent {
        const logger = { debug: (): void => undefined } as any;
        const changeDetector = { markForCheck: (): void => undefined } as any;
        const zone = { runOutsideAngular: (f: () => void): void => f(), run: (f: () => void): void => f() } as any;
        const router = { url: '/', events: { pipe: (): any => ({ subscribe: (): void => undefined }) } } as any;
        const filters = { setDefault: (): void => undefined, forceUpdate: (): void => undefined } as any;
        return new NavigationBarComponent(logger, changeDetector, zone, router, filters);
    }

    /* Dismissing on click and clearing only when the pointer next arrives left the menu unreopenable:
     * after a click the pointer is already inside the host, so no `mouseenter` is coming and the menu
     * stayed shut under a pointer resting on it. One click closes, the next opens.
     */
    it('reopens the menu on a second click of the same host', () => {
        const navbar = build();

        navbar.toggleDropdown('browse');
        expect(navbar.dismissedDropdown).toBe('browse');

        navbar.toggleDropdown('browse');
        expect(navbar.dismissedDropdown).toBeNull();
    });

    it('moves the dismissal to whichever host was clicked last', () => {
        const navbar = build();

        navbar.toggleDropdown('browse');
        navbar.toggleDropdown('about');

        expect(navbar.dismissedDropdown).toBe('about');
    });

    // The pointer arriving is what clears a dismissal — never the pointer leaving. The menu is a
    // child of its host, so hiding it is itself what fires `mouseleave`, and clearing there put the
    // menu straight back under the pointer that had just dismissed it.
    it('clears the dismissal outright when the pointer arrives', () => {
        const navbar = build();

        navbar.toggleDropdown('about');
        navbar.dismissDropdown(null);

        expect(navbar.dismissedDropdown).toBeNull();
    });

    it('keeps a menu-item dismissal set, so the menu stays shut after navigating', () => {
        const navbar = build();
        const event = { stopPropagation: (): void => undefined } as any;

        navbar.dismissDropdownFromMenu(event, 'about');

        expect(navbar.dismissedDropdown).toBe('about');
    });

    describe('releaseDropdown', () => {

        /* A host keeps focus after a click — it carries `tabindex` and navigating moves focus nowhere
         * else — and `:focus-within` opens the menu just as `:hover` does, so focus alone holds it
         * open once the pointer is gone. Leaving has to drop it.
         */
        it('blurs the host it is leaving when that host holds focus', () => {
            const navbar = build();
            const host = document.createElement('a');
            host.setAttribute('tabindex', '0');
            document.body.appendChild(host);
            host.focus();
            expect(document.activeElement).toBe(host);

            navbar.releaseDropdown({ currentTarget: host } as any);

            expect(document.activeElement).not.toBe(host);
            document.body.removeChild(host);
        });

        // Scoped to the host being left: leaving one item must not pull focus off whatever else has
        // it, which on this page can be a filter input the reader is typing into.
        it('leaves focus alone when it is somewhere else', () => {
            const navbar = build();
            const host = document.createElement('a');
            host.setAttribute('tabindex', '0');
            const elsewhere = document.createElement('input');
            document.body.appendChild(host);
            document.body.appendChild(elsewhere);
            elsewhere.focus();

            navbar.releaseDropdown({ currentTarget: host } as any);

            expect(document.activeElement).toBe(elsewhere);
            document.body.removeChild(host);
            document.body.removeChild(elsewhere);
        });

        it('does not throw when the pointer leaves something that cannot hold focus', () => {
            const navbar = build();
            expect(() => navbar.releaseDropdown({ currentTarget: null } as any)).not.toThrow();
        });
    });
});
