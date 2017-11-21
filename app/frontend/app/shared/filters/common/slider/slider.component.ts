/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import {
    ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, Renderer2,
    ViewChild
} from '@angular/core';
import { InputConverter, NumberConverter } from '../../../../utils/input-converter.decorator';

export class SliderRangeModel {
    public min: number;
    public max: number;

    constructor(min: number, max: number) {
        this.min = min;
        this.max = max;
    }

    public toString(): string {
        return `${this.min}:${this.max}`;
    }
}

export class SliderItem {
    private _parent: SliderComponent;
    private _value: number = 0;

    private _downListener: () => void;
    private _upListener: () => void;
    private _screenX: number = 0;
    private _downProtect: boolean = false;

    constructor(parent: SliderComponent, value: number) {
        this._parent = parent;
        this._value = value;
        this.updateScreenX();
    }

    public onMouseDown(): void {
        this._downProtect = true;

        this._upListener = this._parent.renderer.listen('document', 'mouseup', () => {
            this._downProtect = false;
            this._downListener();
            this._upListener();
            this._parent.updateModel();
        });

        this._downListener = this._parent.renderer.listen('document', 'mousemove', (event: any) => {
            if (this._downProtect) {
                const min = this._parent.min;
                const max = this._parent.max;
                const width = this._parent.sliderWidth;
                const left = this._parent.sliderLeft;
                const offset = Math.max(Math.min(event.clientX, width + left), left);
                this._value = Math.floor((max - min) / width * offset + min - (max - min) * left / width);
                this._screenX = left + width / (max - min) * (this._value - min);
                this._parent.changeDetector.detectChanges();
            } else {
                this._downListener();
                this._upListener();
            }
        });
    }

    public updateScreenX(): void {
        this._screenX = this._parent.sliderLeft + (this._value - this._parent.min) / (this._parent.max - this._parent.min) * this._parent.sliderWidth;
    }

    public getOffset(): string {
        return (this._screenX - this._parent.sliderLeft) + 'px';
    }

    public setValue(value: number): void {
        this._value = Math.max(Math.min(value, this._parent.max), this._parent.min);
        this.updateScreenX();
        this._parent.changeDetector.detectChanges();
    }

    public increment(): void {
        this.setValue(this._value + 1);
        this._parent.updateModel();
    }

    public decrement(): void {
        this.setValue(this._value - 1);
        this._parent.updateModel();
    }

    get value() {
        return this._value;
    }

    get screenX() {
        return this._screenX;
    }

    public static getPositionDifference(first: SliderItem, second: SliderItem): string {
        return Math.abs(second._screenX - first._screenX) + 'px';
    }
}

@Component({
    selector:        'slider',
    templateUrl:     './slider.component.html',
    styleUrls:       [ './slider.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SliderComponent implements OnInit {
    private _sliderWidth: number = 0.0;
    private _sliderLeft: number = 0.0;

    private _model: SliderRangeModel;

    @Input()
    set model(value: SliderRangeModel) {
        this._model = value;
        if (this.left && this.right) {
            this.left.setValue(value.min);
            this.right.setValue(value.max);
            this.updateModel();
        }
    }

    @Output()
    public modelChange = new EventEmitter();

    @Input()
    @InputConverter(NumberConverter)
    public min: number;

    @Input()
    @InputConverter(NumberConverter)
    public max: number;

    @ViewChild('sliderElement')
    public sliderElement: ElementRef;

    public left: SliderItem;
    public right: SliderItem;

    public touchScreen: boolean;

    constructor(public renderer: Renderer2, public changeDetector: ChangeDetectorRef) {
        this.touchScreen = 'ontouchstart' in window || navigator.msMaxTouchPoints !== undefined;
    }

    @HostListener('window:resize')
    public onResize() {
        this.recalculateOffsets();
        this.left.updateScreenX();
        this.right.updateScreenX();
    }

    public ngOnInit(): void {
        this.recalculateOffsets();

        this.left = new SliderItem(this, this._model.min);
        this.right = new SliderItem(this, this._model.max);
        this.changeDetector.detectChanges();
    }

    public updateModel(): void {
        this._model.min = Math.min(this.left.value, this.right.value);
        this._model.max = Math.max(this.left.value, this.right.value);
        this.modelChange.emit(this._model);
    }

    public getItemsPositionDifference(): string {
        return SliderItem.getPositionDifference(this.left, this.right);
    }

    public getItemsMinLeftOffset(): string {
        return this.left.screenX < this.right.screenX ? this.left.getOffset() : this.right.getOffset();
    }

    // noinspection JSMethodCanBeStatic
    public isLimitVisible(item: SliderItem, value: number): boolean {
        if (item) {
            return item.value !== value;
        }
        return false;
    }

    public increment(item: SliderItem): void {
        if (item === this.left && this.left.value === this.right.value) {
            return;
        }
        item.increment();
    }

    public decrement(item: SliderItem): void {
        if (item === this.right && this.left.value === this.right.value) {
            return;
        }
        item.decrement();
    }

    private recalculateOffsets(): void {
        this._sliderWidth = this.sliderElement.nativeElement.offsetWidth;
        this._sliderLeft = this.sliderElement.nativeElement.getBoundingClientRect().left;
    }

    get sliderWidth(): number {
        return this._sliderWidth;
    }

    get sliderLeft(): number {
        return this._sliderLeft;
    }

}
