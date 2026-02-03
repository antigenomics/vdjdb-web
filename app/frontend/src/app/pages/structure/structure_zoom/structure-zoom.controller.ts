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
        this.setZoom(value);
    }

    public increaseZoom(): void {
        this.setZoom(this.zoomLevel + this.zoomStep);
    }

    public decreaseZoom(): void {
        this.setZoom(this.zoomLevel - this.zoomStep);
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
    }

    private setZoom(value: number): void {
        const clamped = Math.min(this.zoomMax, Math.max(this.zoomMin, value));
        if (this.zoomLevel === clamped) {
            return;
        }
        this.zoomLevel = clamped;
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
    }
}
