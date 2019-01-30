/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Utils } from 'utils/utils';
import { SetEntry } from './set-entry';
import { SuggestionEntry } from './suggestion-entry';

@Component({
    selector:        'set',
    templateUrl:     './set.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetComponent implements OnInit {
    private _searchVisible: boolean = false;
    private _selected: SetEntry[] = [];

    private _suggestions: { [value: string]: SuggestionEntry[]; };
    private _visibleSuggestions: SuggestionEntry[] = [];
    private _suggestionsAvailable: boolean = false;
    private _suggestionVisible: boolean = false;

    @ViewChild('input') public input: ElementRef;

    @Input()
    public set selected(input: SetEntry[]) {
        this._selected = input;
        this.updateSuggestions();
    }

    public get selected(): SetEntry[] {
        return this._selected;
    }

    @Output()
    public selectedChange = new EventEmitter();

    @Input()
    public placeholder: string;

    @Input()
    public values: string[] = [];

    @Input()
    public inputUpperOnly: boolean = false;

    @Input()
    public disabled: boolean = false;

    @Input()
    public substringDisabled: boolean = false;

    @Input('suggestions')
    public set suggestions(input: { [value: string]: SuggestionEntry[]; }) {
        if (Object.keys(input).length !== 0) {
            this._suggestionsAvailable = true;
            this._suggestions = input;
        }
    }

    public get visibleSuggestions(): SuggestionEntry[] {
        return this._visibleSuggestions;
    }

    public inputText: string = '';

    public ngOnInit(): void {
        this.updateSuggestions();
    }

    public focus() {
        this.input.nativeElement.focus();
    }

    public onFocusIn(): void {
        this._searchVisible = true;
    }

    public onFocusOut(): void {
        if (this.inputText !== '') {
            if (this.values.indexOf(this.inputText) !== -1) {
                this.append({ value: this.inputText, display: this.inputText, disabled: false });
            } else {
                const filtered = this.values.filter((entry: string) => {
                    return entry.indexOf(this.inputText) !== -1;
                });
                if (filtered.length !== 0 && !this.substringDisabled) {
                    this.append({ value: this.inputText, display: 'Search substring: ' + this.inputText, disabled: false });
                } else {
                    this.change('');
                }
            }
        }
        this._searchVisible = false;
    }

    public change(newValue: string): void {
        if (this.inputUpperOnly) {
            this.inputText = newValue.toUpperCase();
        } else {
            this.inputText = newValue;
        }
    }

    public append(entry: SetEntry): void {
        if (!entry.disabled) {
            this._selected.push(entry);
            this.selectedChange.emit(this._selected);
            this.updateSuggestions();
            this.change('');
        }
    }

    public remove(entry: SetEntry): void {
        Utils.Array.deleteElement(this._selected, entry);
        this.updateSuggestions();
        this.selectedChange.emit(this._selected);
    }

    public isPlaceholderVisible(): boolean {
        return this.inputText.length === 0 && this._selected.length === 0;
    }

    public isSearchVisible(): boolean {
        return this._searchVisible && this.values.length !== 0;
    }

    public isSearchDisabled(): boolean {
        return this.disabled;
    }

    public showSuggestions(): void {
        this._suggestionVisible = true;
    }

    public hideSuggestions(): void {
        this._suggestionVisible = false;
    }

    public isSuggestionAvailable(): boolean {
        return this._suggestionsAvailable && this._visibleSuggestions.length !== 0;
    }

    public isSuggestionsVisible(): boolean {
        return this._suggestionVisible;
    }

    public addSuggestion(entry: SuggestionEntry): void {
        this.append({ value: entry.value, display: entry.value, disabled: false });
    }

    public updateSuggestions(): void {
        if (this._suggestionsAvailable) {
            let suggestions: SuggestionEntry[] = [];
            const selectedValues: string[] = [];
            this._selected.forEach((selected: SetEntry) => {
                if (!selected.disabled && selected.display.indexOf('Search substring') === -1) {
                    suggestions = suggestions.concat(this._suggestions[ selected.value ]);
                    selectedValues.push(selected.value);
                }
            });

            const uniqueValues: string[] = [];
            this._visibleSuggestions = suggestions.filter((entry: SuggestionEntry) => {
                if (uniqueValues.indexOf(entry.value) === -1 && selectedValues.indexOf(entry.value) === -1) {
                    uniqueValues.push(entry.value);
                    return true;
                }
                return false;
            });
        }
    }
}
