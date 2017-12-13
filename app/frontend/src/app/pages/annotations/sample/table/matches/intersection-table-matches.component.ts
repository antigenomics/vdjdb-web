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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Input, OnInit } from '@angular/core';
import { DatabaseColumnInfo } from '../../../../search/database/database-metadata';
import { AnnotationsService } from '../../../annotations.service';
import { IntersectionTableRowMatch } from '../row/intersection-table-row-match';

@Component({
    selector:        'tr[intersection-table-matches]',
    templateUrl:     './intersection-table-matches.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntersectionTableMatchesComponent implements OnInit {
    private static _resizeEventWaitTime: number = 200;
    private _resizeEventTimeout: number;

    @Input('matches')
    public matches: IntersectionTableRowMatch[];

    public headerFontSize: string;

    constructor(private annotationsService: AnnotationsService, private changeDetector: ChangeDetectorRef) {}

    @HostListener('window:resize', ['$event'])
    public onResize() {
        window.clearTimeout(this._resizeEventTimeout);
        this._resizeEventTimeout = window.setTimeout(() => {
            this.calculateHeaderFontSize();
        }, IntersectionTableMatchesComponent._resizeEventWaitTime);
    }

    public ngOnInit(): void {
        this.calculateHeaderFontSize();
    }

    public getUnnecessaryColumns(): string[] {
        return [ 'gene', 'cdr3', 'species' ];
    }

    public getColumns(): DatabaseColumnInfo[] {
        return this.annotationsService.getDatabaseMetadata().columns;
    }

    public getHeaderColumns(): DatabaseColumnInfo[] {
        const unnecessary = this.getUnnecessaryColumns();
        return this.annotationsService.getDatabaseMetadata().columns
                   .filter((column) => unnecessary.indexOf(column.name) === -1);
    }

    private calculateHeaderFontSize(): void {
        // const magickA = 0.00015625;
        // const magickB = 0.6;
        const magickA = 0.0003125;
        const magickB = 0.5;
        const headerSize = magickA * window.innerWidth + magickB;
        this.headerFontSize = headerSize + 'em';
        this.changeDetector.detectChanges();
    }
}
