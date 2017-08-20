import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'set',
    templateUrl: './set.component.html',
    styleUrls: [ './set.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetComponent {
    @Input() model: string;
    @Output() modelChange = new EventEmitter();

    @Input() placeholder: string;

    @Input() allowAutocomplete: boolean = false;
    @Input() autocomplete: string[] = [];

    isAutocompleteAllowed() : boolean {
        return this.allowAutocomplete && this.autocomplete.length !== 0;
    }

    change(newValue: string) {
        this.model = newValue;
        this.modelChange.emit(newValue);
    }

    append(value: string) {
        let values = this.model.split(',');
        values[values.length - 1] = value;
        this.model = values.join(',');
    }

}