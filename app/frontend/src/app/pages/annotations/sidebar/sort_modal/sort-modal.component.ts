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

import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Output, Renderer2, ViewChild } from '@angular/core';
import { LocalStorageService } from 'utils/storage/local-storage.service';

export type AvailableSampleSortTypes = 'names' | 'tags';

@Component({
    selector:        'sort-modal',
    templateUrl:     './sort-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SortModalComponent {
    private static readonly localStorageSavedStateKey: string = 'sidebar:sort';
    private static readonly hideDelay: number = 200;

    private visible: boolean = false;

    @ViewChild('modal')
    public modal: ElementRef;

    @Output('onSortChange')
    public onSortChange = new EventEmitter();

    public sortBy: AvailableSampleSortTypes = 'names';

    constructor(private renderer: Renderer2, private localStorage: LocalStorageService) {
        const savedLocalSortState = this.localStorage.get<AvailableSampleSortTypes>(SortModalComponent.localStorageSavedStateKey);
        if (savedLocalSortState !== undefined) {
            this.setSortBy(savedLocalSortState, false);
        }
    }

    public toggle(): void {
        if (this.visible) {
            this.renderer.setStyle(this.modal.nativeElement, 'opacity', 0.0);
            setTimeout(() => {
                this.renderer.setStyle(this.modal.nativeElement, 'display', 'none');
            }, SortModalComponent.hideDelay);
            this.visible = false;
        } else {
            this.renderer.setStyle(this.modal.nativeElement, 'display', 'block');
            setImmediate(() => {
                this.renderer.setStyle(this.modal.nativeElement, 'opacity', 1.0);
                this.visible = true;
            });
            addEventListener('click', () => {
                this.toggle();
            }, { once: true });
        }
    }

    public setSortBy(type: AvailableSampleSortTypes, saveLocal: boolean = true): void {
        if (this.sortBy !== type) {
            this.sortBy = type;
            if (saveLocal) {
                this.localStorage.save(SortModalComponent.localStorageSavedStateKey, type);
            }
        }
    }
}
