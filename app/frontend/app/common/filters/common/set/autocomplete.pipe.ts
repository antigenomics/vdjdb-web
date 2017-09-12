import { Pipe, PipeTransform } from '@angular/core';
import { isUndefined } from "util";

export class AutocompleteEntry {
    value: string = '';
    display: string = '';
    disabled: boolean = false;
}

@Pipe({
    name: 'autocomplete'
})
export class AutocompletePipe implements PipeTransform {

    transform(values: string[], model: string, alreadySelected: AutocompleteEntry[]): AutocompleteEntry[] {
        let result: AutocompleteEntry[] = [{
            value: model,
            display: 'Search substring: ' + model,
            disabled: false
        }];
        if (isUndefined(model) || model === '') {
            result = values.map((value: string) => { return { value: value, display: value, disabled: false } });
        } else {
            let filtered = values
                .filter((value: string) => value.indexOf(model) !== -1)
                .map((value: string) => { return { value: value, display: value, disabled: false } });
            if (filtered.length !== 0) {
                result = result.concat(filtered);
            } else {
                result = [{
                    value: '',
                    display: 'No matches',
                    disabled: true
                }]
            }
        }

        let alreadySelectedValues = alreadySelected.map((entry: AutocompleteEntry) => entry.value);
        return result.filter((entry: AutocompleteEntry) => {
            return alreadySelectedValues.indexOf(entry.value) === -1;
        });
    }
}