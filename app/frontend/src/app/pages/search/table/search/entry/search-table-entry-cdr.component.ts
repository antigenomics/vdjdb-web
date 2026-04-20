import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, ViewContainerRef } from '@angular/core';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { Utils } from 'utils/utils';
import { SearchTableRow } from '../row/search-table-row';
import ColorizedPatternRegion = Utils.SequencePattern.ColorizedPatternRegion;

@Component({
  selector:        'td[search-table-entry-cdr]',
  template: `
    <span class="motif-link motif-link--inactive">
      <span *ngFor="let region of regions" [style.color]="region.color">{{ region.part }}</span>
    </span>
  `,
  styles: [
    `/* .motif-link--active { color: #377eb8; text-decoration: underline; } */
     .motif-link--inactive { color: inherit; text-decoration: none; cursor: default; }`
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryCdrComponent extends TableEntry {
  public link: string = '#';
  public regions: ColorizedPatternRegion[] = [];
  public hasMotif: boolean = false;

  constructor(private changeDetector: ChangeDetectorRef) {
    super();
  }

  public create(entry: string, _column: TableColumn, _columns: TableColumn[], row: SearchTableRow,
                _hostViewContainer: ViewContainerRef, _resolver: ComponentFactoryResolver): void {
    this.regions = Utils.SequencePattern.colorizePattern(entry, row.metadata.cdr3vEnd, row.metadata.cdr3jStart);
    this.link = '#';
    this.hasMotif = false;
    this.changeDetector.markForCheck();
  }

}
