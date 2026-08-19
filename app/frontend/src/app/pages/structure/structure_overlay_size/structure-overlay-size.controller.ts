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

/** What the overlay is measured against. Exported so a test can supply its own. */
export interface IOverlayViewport {
    /** Usable height, before the fixed navbar and the page's own padding are taken off. */
    height(): number;
    /** Height of the fixed navbar, which sits over the top of the page. */
    headerHeight(): number;
}

/** Padding the page puts around the overlay, which the plot cannot occupy. */
const VIEWPORT_BOTTOM_PADDING = 150;
const HEADER_EXTRA_PADDING = 51;
const HEADER_MARGIN = 12;

/** Contact maps are drawn 6:5, so the height follows from the width. */
const ASPECT_RATIO = 6 / 5;

/** How many frames to keep re-measuring for after the overlay mounts. */
const RECALC_ATTEMPTS = 3;

const NAVBAR_SELECTOR = '.ui.top.fixed.borderless.inverted.menu.large';

/**
 * Sizes the overlay to whatever room the viewport leaves.
 *
 * Split from the entry component for the same reason the zoom and hover controllers were: it is a
 * self-contained piece of DOM measurement with its own lifecycle, and it was 170 lines of the
 * component's 917.
 *
 * It also had the same measurement written twice - once bounded by the parent's width and once not,
 * for the case where the parent has not been laid out yet. There is one `measure` now, and the
 * fallback is the same call with the parent width left out.
 *
 * Two things went with it because they did nothing: an `overlayScrollerMaxHeight` that was computed
 * on every resize and never read by the template, and a pair of zero-valued minimum-size constants
 * that only ever clamped against zero.
 */
export class StructureOverlaySizeController {

    public width: number = 0;
    public height: number = 0;

    private element?: HTMLElement;
    private observer?: { observe(target: Element): void; disconnect(): void };
    private frameId?: number;
    private attemptsLeft: number = 0;

    constructor(private changeDetector: ChangeDetectorRef,
                private viewport: IOverlayViewport = StructureOverlaySizeController.windowViewport()) {}

    /** Starts measuring `element`, and keeps doing so while it resizes. Pass nothing to stop. */
    public attach(element?: HTMLElement): void {
        this.detach();
        this.element = element;

        if (!element) {
            this.changeDetector.markForCheck();
            return;
        }

        const ResizeObserverCtor = (window as any).ResizeObserver as
            (new (callback: (entries: Array<{ contentRect: { height: number } }>) => void)
                => { observe(target: Element): void; disconnect(): void });

        if (ResizeObserverCtor) {
            this.observer = new ResizeObserverCtor(() => this.recalculate());
            this.observer.observe(element);
        }

        this.recalculate();
        this.scheduleRecalc();
    }

    public detach(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = undefined;
        }
        this.cancelRecalc();
        this.element = undefined;
    }

    /** Re-measures now. Safe to call when nothing is attached. */
    public recalculate(): void {
        if (!this.element) {
            return;
        }
        const parent = this.element.parentElement as HTMLElement | null;
        const parentWidth = parent
            ? Math.round(parent.getBoundingClientRect().width)
            : Math.round(this.element.getBoundingClientRect().width);

        // A parent with no width has not been laid out yet: measure against the viewport alone
        // rather than against zero, which is what used to produce the "huge" first render.
        this.measure(parentWidth > 0 ? parentWidth : undefined);
    }

    private measure(parentWidth?: number): void {
        const viewportHeight = this.viewport.height();
        if (viewportHeight <= 0) {
            return;
        }

        const availableHeight = viewportHeight - this.viewport.headerHeight()
            - HEADER_EXTRA_PADDING - HEADER_MARGIN - VIEWPORT_BOTTOM_PADDING;
        if (availableHeight <= 0) {
            return;
        }

        const widthByHeight = Math.round(availableHeight * ASPECT_RATIO);
        const nextWidth = parentWidth === undefined ? widthByHeight : Math.min(parentWidth, widthByHeight);
        const nextHeight = Math.round(nextWidth / ASPECT_RATIO);

        const changed = this.width !== nextWidth || this.height !== nextHeight;
        this.width = nextWidth;
        this.height = nextHeight;

        if (changed) {
            this.changeDetector.markForCheck();
        }
    }

    /** Keeps measuring for a few frames: the SVG arrives through innerHTML and settles after mount. */
    private scheduleRecalc(): void {
        if (!this.element) {
            return;
        }
        if (this.attemptsLeft <= 0) {
            this.attemptsLeft = RECALC_ATTEMPTS;
        }
        if (this.frameId !== undefined) {
            return;
        }
        this.frameId = window.requestAnimationFrame(() => {
            this.frameId = undefined;
            this.attemptsLeft = Math.max(0, this.attemptsLeft - 1);
            this.recalculate();
            if (this.width === 0 && this.attemptsLeft > 0) {
                this.scheduleRecalc();
            }
        });
    }

    private cancelRecalc(): void {
        if (this.frameId !== undefined) {
            window.cancelAnimationFrame(this.frameId);
            this.frameId = undefined;
        }
        this.attemptsLeft = 0;
    }

    private static windowViewport(): IOverlayViewport {
        return {
            height: () => Math.max(window.innerHeight || 0,
                document.documentElement ? document.documentElement.clientHeight : 0),
            headerHeight: () => {
                const navbar = document.querySelector(NAVBAR_SELECTOR) as HTMLElement | null;
                return navbar ? Math.max(0, Math.round(navbar.getBoundingClientRect().height)) : 0;
            }
        };
    }
}
