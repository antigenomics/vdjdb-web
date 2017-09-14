import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Utils } from '../../../../utils/utils';
import { SetEntry } from './set-entry';

@Component({
    selector:        'set',
    templateUrl:     './set.component.html'
})
export class SetComponent {
    private _searchVisible: boolean = false;

    @ViewChild('input') public input: ElementRef;

    @Input()
    public selected: SetEntry[] = [];

    @Output()
    public selectedChange = new EventEmitter();

    @Input()
    public placeholder: string;

    @Input()
    public values: string[] = [];

    @Input()
    public inputUpperOnly: boolean = false;

    public inputText: string = '';

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
                if (filtered.length !== 0) {
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
            this.selected.push(entry);
            this.selectedChange.emit(this.selected);
            this.change('');
        }
    }

    public remove(entry: SetEntry): void {
        Utils.Array.deleteElement(this.selected, entry);
    }

    public isPlaceholderVisible(): boolean {
        return this.inputText.length === 0 && this.selected.length === 0;
    }

    public isSearchVisible() {
        return this._searchVisible && this.values.length !== 0;
    }
}
