import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';


@Component({
    selector:        'set',
    templateUrl:     './set.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetComponent {
    private _searchVisible: boolean = false;

    @ViewChild('input') input: ElementRef;

    @Input()
    model: string;

    @Output()
    modelChange = new EventEmitter();

    @Input()
    placeholder: string;

    @Input()
    search: string[] = [];

    fakeModel: string = '';
    selected: string[] = [];

    focus() {
        this.input.nativeElement.focus();
    }

    onFocusIn(): void {
        this._searchVisible = true;
    }

    onFocusOut(): void {
        this._searchVisible = false;
    }

    change(): void {
        this.model = this.selected.join(',');
        if (this.fakeModel !== '') this.model += this.fakeModel;
        this.modelChange.emit(this.model);
    }

    append(value: string): void {
        this.selected.push(value);
        this.fakeModel = '';
        this.change();
    }

    get searchVisible() {
        return this._searchVisible && this.search.length !== 0;
    }
}