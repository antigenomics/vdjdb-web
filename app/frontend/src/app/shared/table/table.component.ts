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

import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output, Renderer2 } from '@angular/core';
import { Subscription } from 'rxjs';
import { createDefaultTableConfiguration, ITableConfigurationDescriptor } from 'shared/table/configuration/table-configuration';
import { Configuration } from 'utils/configuration/configuration';
import { Utils } from 'utils/utils';
import { TableColumn } from './column/table-column';
import { IExportFormat } from './export/table-export.component';
import { TableRow } from './row/table-row';
import { Table } from './table';

@Component({
  selector:    'div[table-component]',
  templateUrl: './table.component.html',
  styleUrls:   [ './table.component.css' ]
})
export class TableComponent implements OnInit, AfterViewInit, OnDestroy {
  private static _resizeEventWaitTime: number = 500;

  private _resizeEventListener: () => void;
  private _resizeDebouncedHandler = Utils.Time.debounce(this.updateFontSize, TableComponent._resizeEventWaitTime);

  private _tableEventsSubscription: Subscription;
  private _configuration: ITableConfigurationDescriptor = createDefaultTableConfiguration();

  public headerFontSize: string = 'inherit';
  public contentFontSize: string = 'inherit';

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

  constructor(private changeDetector: ChangeDetectorRef, private renderer: Renderer2) {
  }

  public ngOnInit(): void {
    this._tableEventsSubscription = this.table.events.subscribe(() => {
      this.changeDetector.detectChanges();
    });
  }

  public ngAfterViewInit(): void {
    if (this.configuration.size.header.dynamicSizeEnabled || this.configuration.size.content.dynamicSizeEnabled) {
      this.updateFontSize();
      this._resizeEventListener = this.renderer.listen('window', 'resize', () => {
        this._resizeDebouncedHandler();
      });
    }
  }

  public isSorted(column: TableColumn): string {
    return this.table.isSorted(column.name);
  }

  public trackColumnFn(_index: number, column: TableColumn) {
    return column.name;
  }

  public trackRowFn(index: number, row: TableRow) {
    return `${index}${row.hash()}`;
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
}
