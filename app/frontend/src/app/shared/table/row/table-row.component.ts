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
  ChangeDetectionStrategy,
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { TableColumn } from '../column/table-column';
import { TableEntryDefaultComponent } from '../entry/table-entry-default.component';
import { TableRow } from './table-row';

@Component({
  selector:        'tr[table-row]',
  template:        '<ng-container #rowViewContainer></ng-container>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableRowComponent implements OnInit, OnDestroy {
  private _components: Array<{ column: TableColumn; component: ComponentRef<any> }> = [];
  private _hiddenColumns: Set<string> = new Set();

  @Input('columns')
  public columns: TableColumn[];

  @Input('row')
  public row: TableRow;

  @Input('hiddenColumns')
  public set hiddenColumns(hidden: string[]) {
    this._hiddenColumns = new Set(hidden || []);
    this.applyHiddenState();
  }

  @ViewChild('rowViewContainer', { read: ViewContainerRef })
  public rowViewContainer: ViewContainerRef;

  constructor(private hostViewContainer: ViewContainerRef, private resolver: ComponentFactoryResolver, private renderer: Renderer2) {}

  public ngOnInit(): void {
    const columns = this.columns || [];
    if (columns.length === 0) {
      return;
    }

    const defaultEntryComponentResolver = this.resolver.resolveComponentFactory(TableEntryDefaultComponent);
    const entries: string[] = this.row.getEntries();
    let entryIndex: number = 0;

    columns.forEach((column: TableColumn) => {
      const entry = column.noEntry ? '' : entries[ entryIndex++ ];
      let entryResolver = this.row.resolveComponentFactory(column, this.resolver);
      if (!entryResolver) {
        entryResolver = defaultEntryComponentResolver;
      }
      const component = this.rowViewContainer.createComponent(entryResolver);
      component.instance.create(entry, column, columns, this.row, this.hostViewContainer, this.resolver);
      this._components.push({ column, component });
      this.applyHiddenStateForComponent(column, component);
    });
  }

  public ngOnDestroy(): void {
    this._components.forEach(({ component }) => {
      component.destroy();
    });
  }

  private applyHiddenState(): void {
    if (!this._components || this._components.length === 0) {
      return;
    }
    this._components.forEach(({ column, component }) => {
      this.applyHiddenStateForComponent(column, component);
    });
  }

  private applyHiddenStateForComponent(column: TableColumn, component: ComponentRef<any>): void {
    const nativeElement = component.location.nativeElement;
    if (!nativeElement) {
      return;
    }
    if (this._hiddenColumns.has(column.name)) {
      this.renderer.addClass(nativeElement, 'hidden-column');
      this.renderer.setStyle(nativeElement, 'display', 'none');
    } else {
      this.renderer.removeClass(nativeElement, 'hidden-column');
      this.renderer.removeStyle(nativeElement, 'display');
    }
    // Entries that own a nested row (the gene cell's paired TRA+TRB sub-row) follow the live
    // hidden set so the sub-row mirrors this row's visible columns on every toggle.
    if (typeof component.instance.setHiddenColumns === 'function') {
      component.instance.setHiddenColumns(Array.from(this._hiddenColumns));
    }
  }
}
