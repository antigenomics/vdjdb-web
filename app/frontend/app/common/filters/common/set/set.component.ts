import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, Renderer2, ViewChild } from '@angular/core';
import { isUndefined } from 'util';


@Component({
    selector: 'set',
    templateUrl: './set.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetComponent {
    @Input() model: string;
    @Output() modelChange = new EventEmitter();

    @Input() placeholder: string;

    autocompleteFocusCount: number = 0;
    @Input() allowAutocomplete: boolean = false;
    @Input() autocomplete: string[] = [];

    @Input() allowSuggestions: boolean = false;
    @Input() suggestions: any = {}; //TODO

    @ViewChild('resultsAutocomplete') resultsAutocomplete: ElementRef;

    haveSuggestions: boolean = false;
    showSuggestions: boolean = false;
    availableSuggestions: any[] = [];

    isAutocompleteAllowed() : boolean {
        return this.allowAutocomplete && !isUndefined(this.autocomplete) && this.autocomplete.length !== 0;
    }

    isAutocompleteVisible(): boolean {
        return this.isAutocompleteAllowed() && this.autocompleteFocusCount > 0;
    }

    hideAutocomplete(): void {
        this.autocompleteFocusCount -= 1;
    }

    showAutocomplete(): void {
        this.autocompleteFocusCount += 1;
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
        let newValue = values.join(',');
        this.change(newValue);
        this.autocompleteFocusCount = 0;
    }

}