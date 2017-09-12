import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { AutocompleteEntry } from "./autocomplete.pipe";


@Component({
    selector:        'set',
    templateUrl:     './set.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetComponent implements OnInit {
    private _searchVisible: boolean = false;
    private _model: string = '';

    @ViewChild('input') input: ElementRef;

    @Input()
    set model(value: string) {
        if (value === '') {
            this.selected.splice(0, this.selected.length);
        }
        this._model = value;
    }

    get model() {
        return this._model;
    }

    @Output()
    modelChange = new EventEmitter();

    @Input()
    placeholder: string;

    @Input()
    search: string[] = [];

    fakeModel: string = '';
    selected: AutocompleteEntry[] = [];

    ngOnInit() {
        if (this._model !== '') {
            let values = this._model.split(',');
            this.selected = values.map((entry: string) => {
                let display = entry;
                if (this.search.indexOf(entry) === -1) {
                    display = 'Search substring: ' + display;
                }
                return { value: entry, display: display, disabled: false }
            });
        }
    }

    focus() {
        this.input.nativeElement.focus();
    }

    onFocusIn(): void {
        this._searchVisible = true;
    }

    onFocusOut(): void {
        if (this.fakeModel !== '') {
            if (this.search.indexOf(this.fakeModel) !== -1) {
                this.append({ value: this.fakeModel, display: this.fakeModel, disabled: false })
            } else {
                let filtered = this.search.filter((entry: string) => {
                    return entry.indexOf(this.fakeModel) !== -1;
                });
                if (filtered.length !== 0) {
                    this.append({ value: this.fakeModel, display: 'Search substring: ' + this.fakeModel, disabled: false });
                } else {
                    this.change('');
                }
            }
        }
        this._searchVisible = false;
    }

    change(newValue: string): void {
        this.fakeModel = newValue.toUpperCase();
        this.model = this.selected.map((entry: AutocompleteEntry) => entry.value).join(',');
        if (this.fakeModel !== '') {
            if (this.model === '') {
                this.model = this.fakeModel;
            } else {
                this.model += ',';
                this.model += this.fakeModel;
            }
        }
        this.modelChange.emit(this.model);
    }

    append(entry: AutocompleteEntry): void {
        if (!entry.disabled) {
            this.selected.push(entry);
            this.change('');
        }
    }

    remove(entry: AutocompleteEntry): void {
        this.selected.splice(this.selected.indexOf(entry), 1);
        this.change(this.fakeModel);
    }

    get searchVisible() {
        return this._searchVisible && this.search.length !== 0;
    }
}