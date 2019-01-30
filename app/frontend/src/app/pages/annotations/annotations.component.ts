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

import { ChangeDetectionStrategy, Component, ElementRef, Renderer2, ViewChild } from '@angular/core';

@Component({
    selector:        'annotations',
    templateUrl:     './annotations.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnnotationsPageComponent {
    private static readonly resizeEventDispatchTimeout: number = 250;

    @ViewChild('pusher')
    public pusher: ElementRef;

    constructor(private renderer: Renderer2) {}

    public onSidebarVisible(visible: boolean): void {
        if (visible) {
            this.onSidebarShown();
        } else {
            this.onSidebarHidden();
        }
    }

    public onSidebarHidden(): void {
        this.renderer.setStyle(this.pusher.nativeElement, 'margin-left', '40px');
        window.setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, AnnotationsPageComponent.resizeEventDispatchTimeout);
    }

    public onSidebarShown(): void {
        this.renderer.setStyle(this.pusher.nativeElement, 'margin-left', '12.5%');
        window.setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, AnnotationsPageComponent.resizeEventDispatchTimeout);
    }
}
