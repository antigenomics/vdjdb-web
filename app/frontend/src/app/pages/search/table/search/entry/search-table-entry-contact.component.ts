/*
 *     Licensed under the Apache License, Version 2.0
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, ViewChild, ViewContainerRef, ViewRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SearchAvailabilityService } from 'pages/search/table/search/search-availability.service';
import { SearchTableRow } from 'pages/search/table/search/row/search-table-row';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { PopupDirective } from 'shared/modals/popup/popup.directive';
import { StructureService } from 'pages/structure/structure.service';
import { Utils } from 'utils/utils';

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
               [popup]="popupContent" [display]="popupDisplay" position="left" width="300"
               tableClass="ui very compact small very basic table"
               [footer]="popupFooter"
               [topShift]="popupTopShift" [shiftStrategy]="popupShiftStrategy" #popupDirective>
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
    public popupContent: string | SafeHtml | undefined;
    public popupDisplay: 'html' = 'html';
    public hasStructure: boolean = false;
    public popupTopShift: number = -320;
    public popupShiftStrategy: 'absolute' | 'per-item' = 'absolute';
    public popupFooter: string = 'Click on the icon to open the full structure';
    private popupLoaderMarkup: SafeHtml;

    @ViewChild('popupDirective', { read: PopupDirective })
    private popupDirective: PopupDirective | undefined;

    constructor(private availability: SearchAvailabilityService, private changeDetector: ChangeDetectorRef,
                private sanitizer: DomSanitizer) {
        super();
        this.popupLoaderMarkup = this.sanitizer.bypassSecurityTrustHtml('<div class="ui active centered inline loader"></div>');
    }

    public create(_entry: string, _column: TableColumn, columns: TableColumn[], row: SearchTableRow,
                  _hostViewContainer: ViewContainerRef, _resolver: ComponentFactoryResolver): void {
        this.structureLink = undefined;
        this.popupContent = undefined;
        this.popupDisplay = 'html';
        this.hasStructure = false;
        this.popupFooter = 'Click on the icon to open the full structure';
        this.popupTopShift = -320;

        const metaValue = this.getCellValue(row, columns, 'meta');
        const contactsValue = this.getCellValue(row, columns, 'contacts');
        const structureId = this.extractStructureId(metaValue, contactsValue);

        if (!structureId) {
            this.changeDetector.markForCheck();
            return;
        }

        const normalizedId = structureId.toLowerCase();
        Promise.all([
            this.availability.hasStructure(normalizedId),
            this.availability.getStructureVisualization(normalizedId)
        ]).then(([ available, visualization ]) => {
            if (!available || !visualization || !visualization.url) {
                this.hasStructure = false;
                this.structureLink = undefined;
                this.popupContent = undefined;
            } else {
                this.hasStructure = true;
                this.structureLink = this.generateStructureLink(row, columns, structureId);
                this.popupContent = this.popupLoaderMarkup;
                this.fetchPopupHtml(visualization.url);
            }
            this.changeDetector.markForCheck();
            this.updatePopup();
        }).catch(() => {
            this.hasStructure = false;
            this.structureLink = undefined;
            this.popupContent = undefined;
            this.changeDetector.markForCheck();
            this.updatePopup(false);
        });
    }

    private getCellValue(row: SearchTableRow, columns: TableColumn[], columnName: string): string | undefined {
        const columnIndex = columns.findIndex((c) => c.name === columnName);
        if (columnIndex === -1) {
            return undefined;
        }
        return row.getEntries()[columnIndex];
    }

    private async fetchPopupHtml(url: string): Promise<void> {
        try {
            const response = await Utils.HTTP.get(url);
            const markup = StructureService.normalizeVisualizationMarkup(response.response);
            const safeMarkup = this.sanitizer.bypassSecurityTrustHtml(markup);
            this.popupContent = safeMarkup;
            this.popupFooter = 'Click on the icon to open the full structure';
            this.changeDetector.markForCheck();
            this.updatePopup();
        } catch {
            const fallback = '<div class="ui tiny warning message">Failed to load structure preview.</div>';
            this.popupContent = this.sanitizer.bypassSecurityTrustHtml(fallback);
            this.popupFooter = 'Unable to load preview';
            this.changeDetector.markForCheck();
            this.updatePopup();
        }
    }

    private extractStructureId(metaValue?: string, contactsValue?: string): string {
        const fromContacts = this.extractStructureIdFromContacts(contactsValue);
        if (fromContacts) {
            return fromContacts;
        }
        const fromMeta = this.extractStructureIdFromMeta(metaValue);
        return fromMeta || '';
    }

    private extractStructureIdFromContacts(contactsValue?: string): string | undefined {
        if (!contactsValue) {
            return undefined;
        }
        const trimmed = contactsValue.trim();
        if (!trimmed) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(trimmed);
            const candidate = this.extractIdFromUnknown(parsed);
            if (candidate) {
                return candidate;
            }
        } catch {
            // not JSON, fall through
        }
        return this.normalizeStructureIdCandidate(trimmed);
    }

    private extractStructureIdFromMeta(metaValue?: string): string | undefined {
        if (!metaValue) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(metaValue);
            return this.extractIdFromUnknown(parsed);
        } catch {
            return undefined;
        }
    }

    private extractIdFromUnknown(value: any): string | undefined {
        if (typeof value === 'string') {
            return this.normalizeStructureIdCandidate(value);
        }
        if (Array.isArray(value)) {
            for (const entry of value) {
                const candidate = this.extractIdFromUnknown(entry);
                if (candidate) {
                    return candidate;
                }
            }
            return undefined;
        }
        if (value && typeof value === 'object') {
            const prioritizedKeys = [ 'structure', 'structure_id', 'structureId', 'structure.hash', 'structureHash', 'structure.id', 'hash', 'id' ];
            for (const key of prioritizedKeys) {
                const candidate = this.extractIdFromUnknown(this.getValueByPath(value, key));
                if (candidate) {
                    return candidate;
                }
            }
            for (const key of Object.keys(value)) {
                const candidate = this.extractIdFromUnknown(value[ key ]);
                if (candidate) {
                    return candidate;
                }
            }
        }
        return undefined;
    }

    private getValueByPath(target: any, path: string): any {
        if (!target || typeof target !== 'object') {
            return undefined;
        }
        const segments = path.split('.');
        let current: any = target;
        for (const segment of segments) {
            if (!current || typeof current !== 'object' || !(segment in current)) {
                return undefined;
            }
            current = current[ segment ];
        }
        return current;
    }

    private normalizeStructureIdCandidate(candidate?: string): string | undefined {
        if (!candidate) {
            return undefined;
        }
        const trimmed = candidate.trim();
        if (!trimmed) {
            return undefined;
        }
        const lower = trimmed.toLowerCase();
        const withoutExt = lower.endsWith('.html') ? trimmed.slice(0, trimmed.length - 5) : trimmed;
        const tokens = withoutExt.replace(/\\/g, '/').split(/[\s,;|:/]+/)
            .map((token) => token.trim())
            .filter((token) => token.length > 0);
        for (let i = tokens.length - 1; i >= 0; i--) {
            const token = tokens[ i ];
            if (/^[A-Za-z0-9_-]{4,}$/.test(token)) {
                return token;
            }
        }
        return undefined;
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
            const contactsValue = this.getCellValue(row, columns, 'contacts');
            structureId = this.extractStructureId(metaValue, contactsValue);
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

    private updatePopup(visible?: boolean): void {
        if ((this.changeDetector as ViewRef).destroyed) {
            return;
        }

        // Trigger change detection so the popup picks up latest bindings before positioning.
        this.changeDetector.detectChanges();
        if (this.popupDirective) {
            this.popupDirective.updateView(visible);
        }
    }
}
