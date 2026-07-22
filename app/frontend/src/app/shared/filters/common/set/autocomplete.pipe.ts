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

import { Pipe, PipeTransform } from '@angular/core';
import { SetEntry } from './set-entry';

@Pipe({
  name: 'autocomplete'
})
export class AutocompletePipe implements PipeTransform {
  // Every entry returned here becomes a DOM node that the browser lays out synchronously when the
  // dropdown opens, and a filter like the epitope one holds on the order of a thousand values, so
  // the list is capped. Nothing becomes unreachable: typing narrows the list towards the wanted
  // value, and an exact value or a substring can still be committed with Enter.
  private static readonly maxVisibleEntries: number = 50;

  public transform(values: string[], model: string, alreadySelected: SetEntry[], substringDisabled: boolean): SetEntry[] {
    let result: SetEntry[] = [];
    if (model === undefined || model === '') {
      result = values.map((value: string) => ({ value, display: value, disabled: false }));
    } else {
      const filtered = values
        .filter((value: string) => value.toLocaleLowerCase().indexOf(model.toLocaleLowerCase()) !== -1)
        .map((value: string) => ({ value, display: value, disabled: false }));
      if (filtered.length !== 0) {
        if (filtered.length > 1 && !substringDisabled) {
          result.push({
            value:    model,
            display:  'Search substring: ' + model,
            disabled: false
          });
        }
        result = result.concat(filtered);
      } else {
        result = [ {
          value:    '',
          display:  'No matches',
          disabled: true
        } ];
      }
    }

    const alreadySelectedValues = alreadySelected.map((entry: SetEntry) => entry.value.toLocaleLowerCase());
    return AutocompletePipe.truncate(result.filter((entry: SetEntry) => {
      return alreadySelectedValues.indexOf(entry.value.toLocaleLowerCase()) === -1;
    }));
  }

  private static truncate(entries: SetEntry[]): SetEntry[] {
    if (entries.length <= AutocompletePipe.maxVisibleEntries) {
      return entries;
    }
    const visible = entries.slice(0, AutocompletePipe.maxVisibleEntries);
    visible.push({
      value:    '',
      display:  `and ${entries.length - AutocompletePipe.maxVisibleEntries} more — type to narrow the list`,
      disabled: true
    });
    return visible;
  }
}
