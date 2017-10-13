/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { Pipe, PipeTransform } from '@angular/core';
import { SetEntry } from './set-entry';

@Pipe({
    name: 'autocomplete'
})
export class AutocompletePipe implements PipeTransform {

    public transform(values: string[], model: string, alreadySelected: SetEntry[]): SetEntry[] {
        let result: SetEntry[] = [{
            value: model,
            display: 'Search substring: ' + model,
            disabled: false
        }];
        if (model === undefined || model === '') {
            result = values.map((value: string) => ({ value, display: value, disabled: false }));
        } else {
            const filtered = values
                .filter((value: string) => value.indexOf(model) !== -1)
                .map((value: string) => ({ value, display: value, disabled: false }));
            if (filtered.length !== 0) {
                result = result.concat(filtered);
            } else {
                result = [{
                    value: '',
                    display: 'No matches',
                    disabled: true
                }];
            }
        }

        const alreadySelectedValues = alreadySelected.map((entry: SetEntry) => entry.value);
        return result.filter((entry: SetEntry) => {
            return alreadySelectedValues.indexOf(entry.value) === -1;
        });
    }
}
