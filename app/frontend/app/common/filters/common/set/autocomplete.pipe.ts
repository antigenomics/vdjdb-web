import { Pipe, PipeTransform } from '@angular/core';
import { isUndefined } from 'util';
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
        if (isUndefined(model) || model === '') {
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
