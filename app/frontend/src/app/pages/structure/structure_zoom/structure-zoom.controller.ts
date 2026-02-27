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

export class StructureZoomController {
    public zoomMin: number = 1;
    public zoomMax: number = 2;
    public zoomStep: number = 0.1;
    public zoomLevel: number = 1;
    public panX: number = 0;
    public panY: number = 0;
    public isDragging: boolean = false;
    public transform: string = 'translate(0px, 0px) scale(1)';

    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private panStartX: number = 0;
    private panStartY: number = 0;
    private dragMoveHandler: (event: MouseEvent) => void;
    private dragEndHandler: (event: MouseEvent) => void;
    private canvasElement?: HTMLElement;
    private viewportElement?: HTMLElement;

    constructor(private changeDetector: ChangeDetectorRef) {
        this.dragMoveHandler = (event: MouseEvent) => {
            this.onDragMove(event);
        };
        this.dragEndHandler = () => {
            this.onDragEnd();
        };
        this.updateTransform();
    }

    public onZoomInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        if (!target) {
            return;
        }
        const value = parseFloat(target.value);
        if (isNaN(value)) {
            return;
        }
        this.setZoom(value, this.getViewportCenter());
    }

    public increaseZoom(): void {
        this.setZoom(this.zoomLevel + this.zoomStep, this.getViewportCenter());
    }

    public decreaseZoom(): void {
        this.setZoom(this.zoomLevel - this.zoomStep, this.getViewportCenter());
    }

    public resetView(): void {
        this.zoomLevel = this.zoomMin;
        const centeredPan = this.getCenteredPan(this.zoomLevel);
        this.panX = centeredPan.x;
        this.panY = centeredPan.y;
        this.updateTransform();
        this.changeDetector.markForCheck();
    }

    public onMouseDown(event: MouseEvent): void {
        if (!event || event.button !== 0) {
            return;
        }
        event.preventDefault();
        this.isDragging = true;
        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;
        this.panStartX = this.panX;
        this.panStartY = this.panY;
        window.addEventListener('mousemove', this.dragMoveHandler);
        window.addEventListener('mouseup', this.dragEndHandler);
        window.addEventListener('mouseleave', this.dragEndHandler);
        this.changeDetector.markForCheck();
    }

    public destroy(): void {
        window.removeEventListener('mousemove', this.dragMoveHandler);
        window.removeEventListener('mouseup', this.dragEndHandler);
        window.removeEventListener('mouseleave', this.dragEndHandler);
        this.isDragging = false;
        this.canvasElement = undefined;
        this.viewportElement = undefined;
    }

    public attachCanvas(element: HTMLElement | null | undefined): void {
        this.canvasElement = element || undefined;
        this.applyTransform();
    }

    public attachViewport(element: HTMLElement | null | undefined): void {
        this.viewportElement = element || undefined;
    }

    private setZoom(value: number, focusPoint?: { x: number, y: number }): void {
        const clamped = Math.min(this.zoomMax, Math.max(this.zoomMin, value));
        if (this.zoomLevel === clamped) {
            return;
        }
        const previousZoom = this.zoomLevel;
        if (focusPoint && previousZoom > 0) {
            const focusStructureX = (focusPoint.x - this.panX) / previousZoom;
            const focusStructureY = (focusPoint.y - this.panY) / previousZoom;
            this.zoomLevel = clamped;
            this.panX = focusPoint.x - focusStructureX * this.zoomLevel;
            this.panY = focusPoint.y - focusStructureY * this.zoomLevel;
        } else {
            this.zoomLevel = clamped;
        }
        this.updateTransform();
        this.changeDetector.markForCheck();
    }

    private onDragMove(event: MouseEvent): void {
        if (!this.isDragging || !event) {
            return;
        }
        const deltaX = event.clientX - this.dragStartX;
        const deltaY = event.clientY - this.dragStartY;
        this.panX = this.panStartX + deltaX;
        this.panY = this.panStartY + deltaY;
        this.updateTransform();
        this.changeDetector.markForCheck();
    }

    private onDragEnd(): void {
        if (!this.isDragging) {
            return;
        }
        this.isDragging = false;
        window.removeEventListener('mousemove', this.dragMoveHandler);
        window.removeEventListener('mouseup', this.dragEndHandler);
        window.removeEventListener('mouseleave', this.dragEndHandler);
        this.changeDetector.markForCheck();
    }

    private updateTransform(): void {
        this.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
        this.applyTransform();
    }

    private getViewportCenter(): { x: number, y: number } | undefined {
        if (!this.viewportElement) {
            return undefined;
        }
        const viewportWidth = this.viewportElement.clientWidth;
        const viewportHeight = this.viewportElement.clientHeight;
        if (viewportWidth <= 0 || viewportHeight <= 0) {
            return undefined;
        }
        return {
            x: viewportWidth / 2,
            y: viewportHeight / 2
        };
    }

    private getCenteredPan(zoom: number): { x: number, y: number } {
        if (!this.viewportElement || !this.canvasElement) {
            return { x: 0, y: 0 };
        }
        const viewportWidth = this.viewportElement.clientWidth;
        const viewportHeight = this.viewportElement.clientHeight;
        const canvasWidth = this.canvasElement.offsetWidth;
        const canvasHeight = this.canvasElement.offsetHeight;
        if (viewportWidth <= 0 || viewportHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
            return { x: 0, y: 0 };
        }
        return {
            x: (viewportWidth - canvasWidth * zoom) / 2,
            y: (viewportHeight - canvasHeight * zoom) / 2
        };
    }

    private applyTransform(): void {
        if (this.canvasElement) {
            this.canvasElement.style.transform = this.transform;
        }
    }
}
