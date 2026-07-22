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

import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges
} from '@angular/core';
import { Subscription } from 'rxjs';
import { createDefaultTableConfiguration, ITableConfigurationDescriptor } from 'shared/table/configuration/table-configuration';
import { Configuration } from 'utils/configuration/configuration';
import { Utils } from 'utils/utils';
import { TableColumn } from './column/table-column';
import { IExportFormat } from './export/table-export.component';
import { TableRow } from './row/table-row';
import { Table } from './table';

/**
 * Header state that the template used to recompute per column on every change detection cycle.
 * It is derived from the columns, the hidden set and the table sort rule, all of which change
 * rarely, so it is precomputed once per actual change instead.
 */
export interface ITableHeaderColumn {
  readonly column: TableColumn;
  readonly sortClass: string;
  readonly hidden: boolean;
}

@Component({
  selector:    'div[table-component]',
  templateUrl: './table.component.html',
  styleUrls:   [ './table.component.css' ]
})
export class TableComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  private static _resizeEventWaitTime: number = 500;

  private _resizeEventListener: () => void;
  private _resizeDebouncedHandler = Utils.Time.debounce(this.updateFontSize, TableComponent._resizeEventWaitTime);

  private _tableEventsSubscription: Subscription;
  private _configuration: ITableConfigurationDescriptor = createDefaultTableConfiguration();

  public headerFontSize: string = 'inherit';
  public contentFontSize: string = 'inherit';
  public hiddenColumns: string[] = [];
  public headerColumns: ITableHeaderColumn[] = [];
  public visibleColumnsCount: number = 1;

  private _hiddenColumnsSet: Set<string> = new Set();

  @HostBinding('style.overflow')
  public hostOverflowProperty: string = 'auto';

  @Input('configuration')
  public set configuration(source: ITableConfigurationDescriptor) {
    this._configuration = createDefaultTableConfiguration();
    Configuration.extend(this._configuration, source);
  }

  public get configuration(): ITableConfigurationDescriptor {
    return this._configuration;
  }

  @Input('columns')
  public columns: TableColumn[];

  @Input('table')
  public table: Table<TableRow>;

  @Input('table-class')
  public tableClass: string;

  @Output('onColumnClick')
  public onColumnClick = new EventEmitter<TableColumn>();

  @Output('onPageChange')
  public onPageChange = new EventEmitter<number>();

  @Output('onPageSizeChange')
  public onPageSizeChange = new EventEmitter<number>();

  @Output('onExport')
  public onExport = new EventEmitter<IExportFormat>();

  /** Stable identity for *ngFor so rows are reused (not re-created) when the page/data refreshes. */
  public trackRow(_: number, row: TableRow): string {
    return row.hash();
  }

  constructor(private changeDetector: ChangeDetectorRef, private renderer: Renderer2) {
  }

  public ngOnInit(): void {
    this._tableEventsSubscription = this.table.events.subscribe(() => {
      // Every sort path emits a table event, and the sort rule is what decides the header arrow,
      // so the derived header state is rebuilt here rather than probed from the template.
      this.updateHeaderColumns();
      this.changeDetector.detectChanges();
    });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes.columns) {
      const columns = this.columns || [];
      const skippedNames = columns.filter((c) => c.skip).map((c) => c.name);
      const userHidden = (this.hiddenColumns || []).filter((name) => columns.some((c) => c.name === name));
      const merged = Array.from(new Set([ ...skippedNames, ...userHidden ]));
      this.hiddenColumns = merged;
      this.updateHiddenColumnsSet();
      this.updateHeaderColumns();
    }
  }

  public ngAfterViewInit(): void {
    if (this.configuration.size.header.dynamicSizeEnabled || this.configuration.size.content.dynamicSizeEnabled) {
      this.updateFontSize();
      this._resizeEventListener = this.renderer.listen('window', 'resize', () => {
        this._resizeDebouncedHandler();
      });
    }
  }

  public trackColumnFn(_index: number, header: ITableHeaderColumn) {
    return header.column.name;
  }

  public onHiddenColumnsChange(hidden: string[]): void {
    this.hiddenColumns = hidden || [];
    this.updateHiddenColumnsSet();
    this.updateHeaderColumns();
    this.changeDetector.markForCheck();
  }

  public isColumnHidden(columnName: string): boolean {
    return this._hiddenColumnsSet.has(columnName);
  }

  public getVisibleColumnsCount(): number {
    if (!this.columns || this.columns.length === 0) {
      return 1;
    }
    const visible = this.columns.reduce((count, column) => {
      return count + (this.isColumnHidden(column.name) ? 0 : 1);
    }, 0);
    if (visible === 0) {
      return this.columns.length;
    }
    return visible;
  }

  public ngOnDestroy(): void {
    if (this._resizeEventListener) {
      this._resizeEventListener();
    }
    if (this._tableEventsSubscription) {
      this._tableEventsSubscription.unsubscribe();
    }
  }

  private updateFontSize(): void {
    setImmediate(() => {
      if (this.configuration.size.header.dynamicSizeEnabled) {
        this.calculateHeaderFontSize();
      }
      if (this.configuration.size.content.dynamicSizeEnabled) {
        this.calculateContentFontSize();
      }

      if (window.innerWidth < this.configuration.size.overflowThreshold) {
        this.hostOverflowProperty = 'auto';
      } else {
        this.hostOverflowProperty = 'visible';
      }

      this.changeDetector.markForCheck();
    });
  }

  private calculateHeaderFontSize(): void {
    const a = this.configuration.size.header.dynamicSizeWeightA;
    const b = this.configuration.size.header.dynamicSizeWeightB;
    const headerSize = a * window.innerWidth + b;
    this.headerFontSize = headerSize + 'em';
  }

  private calculateContentFontSize(): void {
    const a = this.configuration.size.content.dynamicSizeWeightA;
    const b = this.configuration.size.content.dynamicSizeWeightB;
    const contentFontSize = a * window.innerWidth + b;
    this.contentFontSize = contentFontSize + 'em';
  }

  private updateHiddenColumnsSet(): void {
    this._hiddenColumnsSet = new Set(this.hiddenColumns || []);
  }

  private updateHeaderColumns(): void {
    const columns = this.columns || [];
    this.headerColumns = columns.map((column) => ({
      column,
      // The table input is bound together with the columns, but ngOnChanges can in principle run
      // before it is assigned, so the sort class falls back to "not sorted" instead of throwing.
      sortClass: this.table ? this.table.isSorted(column.name) : '',
      hidden:    this.isColumnHidden(column.name)
    }));
    this.visibleColumnsCount = this.getVisibleColumnsCount();
  }
}
