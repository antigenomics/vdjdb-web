import { Pipe, PipeTransform } from '@angular/core';
import { isUndefined } from "util";
import { SetComponent } from "./set.component";

@Pipe({
    name: 'autocomplete'
})
export class AutocompletePipe implements PipeTransform {
    static maxElements: number = 5;

    transform(values: string[], set: string): string[] {
        if (isUndefined(set)) return AutocompletePipe.addTriplePoints(values);
        if (set === '') return AutocompletePipe.addTriplePoints(values);
        let setValues: string[] = set.split(',');
        let lastSetValue: string = setValues[setValues.length - 1].trim();
        let filtered = values.filter((value: string) => value.indexOf(lastSetValue) !== -1);
        if (filtered.length !== 0) {
            return AutocompletePipe.addTriplePoints(filtered);
        }
        return ['No matches']
    }

    private static addTriplePoints(values: string[]): string[] {
        if (values.length > AutocompletePipe.maxElements) {
            return values.slice(0, AutocompletePipe.maxElements).concat([ SetComponent.dots ])
        } else return values;
    }
}