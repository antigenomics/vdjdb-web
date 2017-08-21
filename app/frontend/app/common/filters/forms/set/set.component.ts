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

    @Input() allowSuggestions: boolean = false;
    @Input() suggestions: any = {}; //TODO

    haveSuggestions: boolean = false;
    showSuggestions: boolean = false;
    availableSuggestions: any[] = [];

    isAutocompleteAllowed() : boolean {
        return this.allowAutocomplete && this.autocomplete.length !== 0;
    }

    isSuggestionsAllowed() : boolean {
        return this.allowSuggestions && this.suggestions.length !== 0;
    }

    isSuggestionsAvailable() : boolean {
        return this.haveSuggestions;
    }

    isSuggestionsVisible() : boolean {
        return this.showSuggestions;
    }

    change(newValue: string) {
        this.model = newValue;
        this.modelChange.emit(newValue);

        if (this.allowSuggestions) {
            this.availableSuggestions.splice(0, this.availableSuggestions.length);
            let values = this.model.split(",");
            this.haveSuggestions = false;
            for (let i = 0; i < values.length; ++i) {
                let value = values[ i ];
                if (this.suggestions.hasOwnProperty(value)) {
                    let suggestionsForValue: any = this.suggestions[ value ];
                    for (let j = 0; j < suggestionsForValue.length; ++j) {
                        let suggestion: any = suggestionsForValue[ j ];
                        if (values.indexOf(suggestion.sequence) === -1) {
                            this.availableSuggestions.push(suggestion);
                            this.haveSuggestions = true;
                        }
                    }
                }
            }
        }
    }

    append(value: string) {
        let values = this.model.split(',');
        values[values.length - 1] = value;
        this.model = values.join(',');
    }

}