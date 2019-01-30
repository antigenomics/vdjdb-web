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

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TableColumn } from 'shared/table/column/table-column';
import { ITableConfigurationDescriptor } from 'shared/table/configuration/table-configuration';
import { AnnotationsService } from '../../../../annotations.service';
import { MatchesTable } from './matches-table';

@Component({
  selector:        'tr[matches-table]',
  templateUrl:     './matches-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchesTableComponent {
  @Input('table')
  public table: MatchesTable;

  public configuration: ITableConfigurationDescriptor;

  constructor(private annotationsService: AnnotationsService) {
    this.configuration = {
      classes: {
        columns: 'collapsing center aligned',
        rows:    'center aligned'
      },
      utils:   {
        disable: true
      },
      size:    {
        header:  {
          dynamicSizeEnabled: true,
          dynamicSizeWeightB: 0.25
        },
        content: {
          dynamicSizeEnabled: true,
          dynamicSizeWeightB: 0.4
        }
      }
    };
  }

  public getColumns(): TableColumn[] {
    const skip: string[] = [ 'gene', 'cdr3', 'species' ];
    const columns = [
      new TableColumn('alignment', 'Alignment', false, false, true, true, 'Alignment of query (top) and VDJdb hit (bottom) CDR3 sequences'),
      new TableColumn('match-score', 'Match Score', true, false, true, true, 'Final aggregate score of the TCR alignment between query and VDJdb hit'),
      new TableColumn('weight', 'Weight', true, false, true)
    ];

    return columns.concat(this.annotationsService.getDatabaseMetadata().columns.map((c) => {
      return new TableColumn(c.name, c.title, false, skip.indexOf(c.name) !== -1, false, true, c.comment, '');
    }));
  }
}
