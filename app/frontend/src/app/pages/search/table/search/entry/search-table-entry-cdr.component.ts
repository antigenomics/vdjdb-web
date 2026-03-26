import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, ViewContainerRef } from '@angular/core';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { Utils } from 'utils/utils';
import { SearchTableRow } from '../row/search-table-row';
import { SearchAvailabilityService } from '../search-availability.service';
import ColorizedPatternRegion = Utils.SequencePattern.ColorizedPatternRegion;

@Component({
  selector:        'td[search-table-entry-cdr]',
  template:        `
    <ng-container *ngIf="hasMotif; else noMotif">
      <a [href]="link" class="motif-link motif-link--active">
        <span *ngFor="let region of regions" [style.color]="region.color">{{ region.part }}</span>
      </a>
    </ng-container>
    <ng-template #noMotif>
      <span class="motif-link motif-link--inactive">
        <span *ngFor="let region of regions" [style.color]="region.color">{{ region.part }}</span>
      </span>
    </ng-template>
  `,
  styles: [
    `.motif-link--active { color: #377eb8; text-decoration: underline; }
     .motif-link--inactive { color: inherit; text-decoration: none; cursor: default; }`
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryCdrComponent extends TableEntry {
  public link: string = '#';
  public regions: ColorizedPatternRegion[] = [];
  public hasMotif: boolean = false;

  constructor(private availability: SearchAvailabilityService, private changeDetector: ChangeDetectorRef) {
    super();
  }

  public create(entry: string, _column: TableColumn, columns: TableColumn[], row: SearchTableRow,
                _hostViewContainer: ViewContainerRef, _resolver: ComponentFactoryResolver): void {
    this.regions = Utils.SequencePattern.colorizePattern(entry, row.metadata.cdr3vEnd, row.metadata.cdr3jStart);
    this.link = '#';
    this.hasMotif = false;

    const motifLinkData = this.extractMotifLinkData(row, columns);
    if (!motifLinkData) {
      this.changeDetector.markForCheck();
      return;
    }

    const { species, tcrChain, mhcClass, gene, epitopeSeq } = motifLinkData;
    this.availability.hasMotif(species, tcrChain, mhcClass, gene, epitopeSeq).then((available) => {
      if (available) {
        this.hasMotif = true;
        this.link = this.generateMotifLink(species, tcrChain, mhcClass, gene, epitopeSeq);
      } else {
        this.hasMotif = false;
        this.link = '#';
      }
      this.changeDetector.markForCheck();
    }).catch(() => {
      this.hasMotif = false;
      this.link = '#';
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

  private extractMotifLinkData(row: SearchTableRow, columns: TableColumn[]): { species: string; tcrChain: string; mhcClass: string; gene: string; epitopeSeq: string } | null {
    const species = this.getCellValue(row, columns, 'species');
    const tcrChain = this.getCellValue(row, columns, 'gene');
    const mhcClass = this.getCellValue(row, columns, 'mhc.class');
    const mhcValue = this.getCellValue(row, columns, 'mhc.a');
    const gene = mhcValue ? mhcValue.replace(/:.+/, '') : undefined;
    const epitopeSeq = this.getCellValue(row, columns, 'antigen.epitope');

    if (!species || !tcrChain || !mhcClass || !gene || !epitopeSeq) {
      return null;
    }

    return { species, tcrChain, mhcClass, gene, epitopeSeq };
  }

  private generateMotifLink(species: string, tcrChain: string, mhcClass: string, gene: string, epitopeSeq: string): string {
    const params = new URLSearchParams();
    params.set('species', species);
    params.set('tcr_chain', tcrChain);
    params.set('mhc_class', mhcClass);
    params.set('gene', gene);
    params.set('epitope_seq', epitopeSeq);
    return `/motif?${params.toString()}`;
  }
}
