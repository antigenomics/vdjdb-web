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

import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { SummaryService } from './summary.service';

@Component({
    selector: 'summary',
    template: '<div #summaryContainer></div>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryComponent implements OnInit {
    @ViewChild('summaryContainer', { read: ElementRef })
    public summaryContainer: ElementRef;

    constructor(public summaryService: SummaryService) {}

    public ngOnInit(): void {
        this.summaryService.getSummaryContent().subscribe((text: string) => {
            this.summaryContainer.nativeElement.innerHTML = text;
        });
    }
}
