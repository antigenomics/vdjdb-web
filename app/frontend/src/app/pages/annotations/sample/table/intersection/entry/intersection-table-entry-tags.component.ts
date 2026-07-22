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

import { ChangeDetectionStrategy, Component, ComponentFactoryResolver, HostBinding, ViewContainerRef } from '@angular/core';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { IntersectionTableRow } from '../row/intersection-table-row';

/** One badge. `href` is set for epitopes only; everything else renders as a plain label. */
interface ITag {
  readonly text: string;
  readonly color: string;
  readonly href: string;
}

@Component({
  selector: 'td[intersection-table-entry-tags]',
  template: `
                <a *ngIf="tag.href" class="ui small basic {{ tag.color }} label" [href]="tag.href"
                   target="_blank" rel="noopener noreferrer"
                   title="Open this epitope in Browse">{{ tag.text }}</a><!--
             --><div *ngIf="!tag.href" class="ui small basic {{ tag.color }} label">{{ tag.text }}</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntersectionTableEntryTagsComponent extends TableEntry {
  private static readonly _colors: string[] = [ 'teal', 'blue', 'violet', 'red' ];

  /** The tag group the backend fills from `antigen.epitope` — see `IntersectionTableRow.tagsFields`. */
  private static readonly _epitopeField: string = 'antigen.epitope';

  @HostBinding('class')
  public width: string = 'seven wide';

  public values: ITag[] = [];

  public create(_entry: string, _column: TableColumn, _columns: TableColumn[], row: IntersectionTableRow,
                _hostViewContainer: ViewContainerRef, _resolver: ComponentFactoryResolver): void {
    this.values = [];

    let index = 0;
    for (const key in row.tags) {
      if (row.tags.hasOwnProperty(key)) {
        const color = IntersectionTableEntryTagsComponent._colors[ index ];
        // Only the epitope badge links. Browse takes `epitope_seq` and nothing else here has a filter
        // to land on: the species badge would need an antigen filter Browse does not expose as a
        // parameter, and an MHC allele would need the HLA picker rather than a query string.
        const linked = key === IntersectionTableEntryTagsComponent._epitopeField;
        this.values = this.values.concat(row.tags[ key ].map((tag) => ({
          text:  tag,
          color,
          // A new tab, because the annotation results took a websocket round trip and minutes of
          // compute to produce and navigating away from them in place loses all of it.
          href:  linked ? `/search?epitope_seq=${encodeURIComponent(tag)}` : ''
        } as ITag)));
        index += 1;
      }
    }
  }
}
