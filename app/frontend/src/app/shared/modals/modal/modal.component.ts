/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, Renderer2, ViewChild } from '@angular/core';

@Component({
    selector:        'modal',
    templateUrl:     './modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalComponent {
    private static DEFAULT_HIDE_TIME: number = 200;
    private static DEFAULT_TICKS: number = 25;

    private _loading: boolean = false;
    private _hideIntervalID: number;
    private _currentOpacity: number = 1.0;

    @Input('header')
    public header: string = '';

    @Input('content')
    public content: string = '';

    @Input('size')
    public size: string = 'tiny';

    @Input('no')
    public noCallback: () => Promise<void>;

    @Input('yes')
    public yesCallback: () => Promise<void>;

    @Input('hide')
    public hideCallback: () => Promise<void>;

    @Input('hideTime')
    public hideTime: number = ModalComponent.DEFAULT_HIDE_TIME;

    @ViewChild('dimmer')
    public dimmer: ElementRef;

    @ViewChild('modal')
    public modal: ElementRef;

    constructor(private renderer: Renderer2, private changeDetector: ChangeDetectorRef) {}

    public isLoading(): boolean {
        return this._loading;
    }

    public async no(): Promise<void> {
        if (this.noCallback !== undefined) {
            await this.noCallback();
        }
        await this.hide();
    }

    public async yes(): Promise<void> {
        if (this.yesCallback !== undefined) {
            this._loading = true;
            this.changeDetector.detectChanges();
            await this.yesCallback();
        }
        await this.hide();
    }

    private async hide(): Promise<void> {
        const interval = this.hideTime / ModalComponent.DEFAULT_TICKS;
        const tick = this._currentOpacity / ModalComponent.DEFAULT_TICKS;
        this._hideIntervalID = window.setInterval(() => {
            this._currentOpacity -= tick;
            this.renderer.setStyle(this.dimmer.nativeElement, 'opacity', this._currentOpacity.toString());
            this.renderer.setStyle(this.modal.nativeElement, 'opacity', this._currentOpacity.toString());
            if (this._currentOpacity <= 0) {
                window.clearInterval(this._hideIntervalID);
                if (this.hideCallback !== undefined) {
                    // noinspection JSIgnoredPromiseFromCall
                    this.hideCallback();
                }
            }
        }, interval);
    }
}
