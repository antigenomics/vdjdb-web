/*
 *     Licensed under the Apache License, Version 2.0
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, ViewContainerRef } from '@angular/core';
import { SearchAvailabilityService } from 'pages/search/table/search/search-availability.service';
import { SearchTableRow } from 'pages/search/table/search/row/search-table-row';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';

/* @Component({
    selector:        'td[search-table-entry-contact]',
    template:        `
        <span *ngIf="link; else noLink">
      <a [attr.href]="link" target="_blank" rel="noopener">
        <i class="ui image outline icon" style="color: rgb(55, 126, 184)"></i>
      </a>
    </span>
        <ng-template #noLink>
            <i class="ui image outline icon" style="color: #aaa"></i>
        </ng-template>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
}) */

@Component({
    selector:        'td[search-table-entry-image]',
    template: `
        <ng-container *ngIf="hasStructure; else noStructure">
            <a [attr.href]="structureLink" target="_blank" rel="noopener"
               [popup]="imageLink" display="image" position="left" width="300"
               footer="Click on the icon to open the full image" topShift="-70"
               shiftStrategy="per-item" #popupDirective>
                <i class="ui image outline icon" style="color: rgb(55,126,184)"></i>
            </a>
        </ng-container>
        <ng-template #noStructure>
            <i class="ui image outline icon" style="color: #aaaaaa"></i>
        </ng-template>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryContactComponent extends TableEntry {
    public structureLink: string | undefined;
    public imageLink: string | undefined;
    public hasStructure: boolean = false;

    constructor(private availability: SearchAvailabilityService, private changeDetector: ChangeDetectorRef) {
        super();
    }

    public create(_entry: string, _column: TableColumn, columns: TableColumn[], row: SearchTableRow,
                  _hostViewContainer: ViewContainerRef, _resolver: ComponentFactoryResolver): void {
        this.structureLink = undefined;
        this.imageLink = undefined;
        this.hasStructure = false;

        const metaValue = this.getCellValue(row, columns, 'meta');
        let structureId: string = '';
        let subsetRaw: string = '';
        if (metaValue) {
            try {
                const meta = JSON.parse(metaValue);
                structureId = (meta && meta['structure.id']) ? String(meta['structure.id']).trim() : '';
                subsetRaw = (meta && (meta['cell.subset'] || meta['cellSubset'] || meta['cell_subset']))
                    ? String(meta['cell.subset'] || meta['cellSubset'] || meta['cell_subset'])
                    : '';
                subsetRaw = subsetRaw ? subsetRaw.trim() : '';
            } catch {
                structureId = '';
                subsetRaw = '';
            }
        }

        if (!structureId) {
            this.changeDetector.markForCheck();
            return;
        }

        const normalizedId = structureId.toLowerCase();
        this.availability.hasStructure(normalizedId).then((available) => {
            if (!available) {
                this.hasStructure = false;
                this.structureLink = undefined;
                this.imageLink = undefined;
            } else {
                this.hasStructure = true;
                this.structureLink = this.generateStructureLink(row, columns, structureId);
                this.imageLink = this.buildImageLink(structureId, subsetRaw);
            }
            this.changeDetector.markForCheck();
        }).catch(() => {
            this.hasStructure = false;
            this.structureLink = undefined;
            this.imageLink = undefined;
            this.changeDetector.markForCheck();
        });
    }

    private getCellValue(row: SearchTableRow, columns: TableColumn[], columnName: string): string | undefined {
        const columnIndex = columns.findIndex((c) => c.name === columnName);
        if (columnIndex === -1) {
            return undefined;
        }
        return row.getEntries()[columnIndex];
    }

    private buildImageLink(structureId: string, subsetRaw: string): string {
        const dir = subsetRaw && subsetRaw.toLowerCase().indexOf('cd4') !== -1 ? 'cd4' : 'cd8';
        return `/structure-files/${dir}/${structureId}.png`;
    }

    private generateStructureLink(row: SearchTableRow, columns: TableColumn[], explicitStructureId?: string): string | undefined {
        const species = this.getCellValue(row, columns, 'species');
        const tcrChain = this.getCellValue(row, columns, 'gene');
        const mhcClass = this.getCellValue(row, columns, 'mhc.class');
        const mhcValue = this.getCellValue(row, columns, 'mhc.a');
        const gene = mhcValue ? mhcValue.replace(/:.+/, '') : undefined;
        const epitopeSeq = this.getCellValue(row, columns, 'antigen.epitope');
        let structureId = explicitStructureId || '';
        if (!structureId) {
            const metaValue = this.getCellValue(row, columns, 'meta');
            if (metaValue) {
                try {
                    const meta = JSON.parse(metaValue);
                    structureId = (meta && meta['structure.id']) ? String(meta['structure.id']).trim() : '';
                } catch {
                    structureId = '';
                }
            }
        }

        if (!species || !tcrChain || !mhcClass || !gene || !epitopeSeq || !structureId) {
            return undefined;
        }

        const params = new URLSearchParams();
        params.set('species', species);
        params.set('tcr_chain', tcrChain);
        params.set('mhc_class', mhcClass);
        params.set('gene', gene.replace(/:.+/, ''));
        params.set('epitope_seq', epitopeSeq);
        params.set('structure_id', structureId);
        return `/structure?${params.toString()}`;
    }
}
