/*
 *  SearchTableEntryImageComponent – displays an icon inside a table cell; on hover
 *  shows a popup with an image thumbnail, on click opens the full-size image in
 *  a new tab.  Implemented by analogy with SearchTableEntryUrlComponent.
 */

import {
  ChangeDetectionStrategy,
  Component,
  ComponentFactoryResolver,
  ViewContainerRef
} from '@angular/core';

import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { TableRow } from 'shared/table/row/table-row';

/**
 * Component selector is applied via <td search-table-entry-image></td> that is
 * mapped in SearchTableRow.resolveComponentFactory("contacts").
 */
@Component({
  selector:        'td[search-table-entry-image]',
  template: `
    <a [attr.href]="link" target="_blank" rel="noopener"
       [popup]="imageUrl" display="image" position="left" width="300"
       footer="Click on the icon to open the full image" topShift="-70"
       shiftStrategy="per-item" #popupDirective>
      <i class="ui image outline icon" style="color: rgb(55,126,184)"></i>
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryImageComponent extends TableEntry {
  /** Image URL (thumbnail == full-size, server can downscale if needed). */
  public imageUrl: string;
  /** Link opened on click (same as imageUrl by default). */
  public link: string;

  constructor() { super(); }

  /**
   * @param entry   raw string taken from vdjdb column (should be valid URL)
   *                e.g. https://cdn.example.com/contacts/123.png
   */
  public create(
    entry: string,
    _column: TableColumn,
    _columns: TableColumn[],
    _row: TableRow,
    _host: ViewContainerRef,
    _resolver: ComponentFactoryResolver
  ): void {
    // Trim & sanity-check.
    this.imageUrl = entry ? entry.trim() : '';
    this.link     = this.imageUrl;
  }
}
