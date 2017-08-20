import { Pipe, PipeTransform } from '@angular/core';
import { isUndefined } from "util";

@Pipe({
    name: 'autocomplete'
})
export class AutocompletePipe implements PipeTransform {
    transform(values: string[], set: string): string[] {
        if (isUndefined(set)) return values;
        if (set === '') return values;
        let setValues = set.split(',');
        let lastSetValue = setValues[setValues.length - 1];
        return values.filter((value: string) => value.indexOf(lastSetValue) !== -1);
    }
}