import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { SetEntry } from "./set-entry";
import { Utils } from "../../../../utils/utils";

@Component({
    selector:        'set',
    templateUrl:     './set.component.html'
})
export class SetComponent {
    private _searchVisible: boolean = false;

    @ViewChild('input') input: ElementRef;

    @Input()
    selected: SetEntry[] = [];

    @Output()
    selectedChange = new EventEmitter();

    @Input()
    placeholder: string;

    @Input()
    values: string[] = [];

    inputText: string = '';

    focus() {
        this.input.nativeElement.focus();
    }

    onFocusIn(): void {
        this._searchVisible = true;
    }

    onFocusOut(): void {
        if (this.inputText !== '') {
            if (this.values.indexOf(this.inputText) !== -1) {
                this.append({ value: this.inputText, display: this.inputText, disabled: false })
            } else {
                let filtered = this.values.filter((entry: string) => {
                    return entry.indexOf(this.inputText) !== -1;
                });
                if (filtered.length !== 0) {
                    this.append({ value: this.inputText, display: 'Search substring: ' + this.inputText, disabled: false });
                } else {
                    this.change('');
                }
            }
        }
        this._searchVisible = false;
    }

    change(newValue: string): void {
        this.inputText = newValue.toUpperCase();
    }

    append(entry: SetEntry): void {
        if (!entry.disabled) {
            this.selected.push(entry);
            this.selectedChange.emit(this.selected);
            this.change('');
        }
    }

    remove(entry: SetEntry): void {
        Utils.Array.deleteElement(this.selected, entry);
    }

    isPlaceholderVisible() : boolean {
        return this.inputText.length === 0 && this.selected.length === 0;
    }

    isSearchVisible() {
        return this._searchVisible && this.values.length !== 0;
    }
}