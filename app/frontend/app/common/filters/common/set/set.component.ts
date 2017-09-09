import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';


@Component({
    selector: 'set',
    templateUrl: './set.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetComponent {
    static dots: string = '...';

    @Input() model: string;
    @Output() modelChange = new EventEmitter();

    @Input() placeholder: string;

    @Input() search: string[] = [];
    searchVisible: boolean = false;

    onFocusIn(): void {
        this.searchVisible = true;
    }

    onFocusOut(): void {
        this.searchVisible = false;
    }

    change(newValue: string): void {
        this.model = newValue;
        this.modelChange.emit(newValue);

        // if (this.allowSuggestions) {
        //     this.availableSuggestions.splice(0, this.availableSuggestions.length);
        //     let values = this.model.split(",");
        //     this.haveSuggestions = false;
        //     for (let i = 0; i < values.length; ++i) {
        //         let value = values[ i ];
        //         if (this.suggestions.hasOwnProperty(value)) {
        //             let suggestionsForValue: any = this.suggestions[ value ];
        //             for (let j = 0; j < suggestionsForValue.length; ++j) {
        //                 let suggestion: any = suggestionsForValue[ j ];
        //                 if (values.indexOf(suggestion.sequence) === -1) {
        //                     this.availableSuggestions.push(suggestion);
        //                     this.haveSuggestions = true;
        //                 }
        //             }
        //         }
        //     }
        // }
    }

    append(value: string): void {
        if (value !== SetComponent.dots) {
            let values = this.model.split(',');
            values[ values.length - 1 ] = value;
            let newValue = values.join(',');
            this.change(newValue);
        }
    }

}