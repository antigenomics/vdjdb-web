import { Pipe, PipeTransform } from '@angular/core';
import { isUndefined } from "util";

@Pipe({
    name: 'autocomplete'
})
export class AutocompletePipe implements PipeTransform {

    transform(values: string[], set: string): string[] {
        if (isUndefined(set)) return values;
        if (set === '') return values;
        let setValues: string[] = set.split(',');
        let lastSetValue: string = setValues[setValues.length - 1].trim();
        let filtered = values.filter((value: string) => value.indexOf(lastSetValue) !== -1);
        if (filtered.length !== 0) {
            return filtered;
        }
        return ['No matches']
    }
}