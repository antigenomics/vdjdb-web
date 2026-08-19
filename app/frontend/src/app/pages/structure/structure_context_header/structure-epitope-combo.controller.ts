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

import { ElementRef } from '@angular/core';
import { IStructuresMetadataTreeLevelValue } from 'pages/structure/structure';

/**
 * The type-to-filter epitope box in the context header.
 *
 * A combobox that shows a chosen value when idle and a query when focused needs more state than it
 * looks: what is typed, what is selected, whether the field has focus, and whether the list is open.
 * Those four decide the value, the placeholder and the option list between them, and inlining that
 * in the header put nine members and six handlers there for one control.
 *
 * The list is filtered by prefix rather than by substring on purpose - epitopes are read left to
 * right and a reader typing `GIL` means the ones that start that way.
 */
export class StructureEpitopeComboController {

    /** What the user has typed. Separate from the selection, which survives an abandoned query. */
    public query: string = '';
    public isFocused: boolean = false;
    public isOpen: boolean = false;

    private input?: ElementRef<HTMLInputElement>;

    /** The `<input>`, so the controller can drop focus after a selection. */
    public bindInput(element: ElementRef<HTMLInputElement> | undefined): void {
        this.input = element;
    }

    /** Options matching what is typed. Everything, when nothing is. */
    public filter(values: IStructuresMetadataTreeLevelValue[]): IStructuresMetadataTreeLevelValue[] {
        const query = this.query.trim().toLowerCase();
        if (!query) {
            return values;
        }
        return values.filter((value) => value.value.toLowerCase().indexOf(query) === 0);
    }

    /** What the field shows: the query while it is being typed, the selection otherwise. */
    public value(selected: string | null): string {
        if (this.query.length !== 0) {
            return this.query;
        }
        // Focused and empty means the reader has cleared it to type: leave it clear, and let the
        // placeholder carry the current selection.
        return this.isFocused ? '' : (selected || '');
    }

    /**
     * What the field shows when empty.
     *
     * On focus the current selection becomes the placeholder rather than the value, so the box
     * clears ready for typing without the reader losing sight of what is chosen.
     */
    public placeholder(selected: string | null): string {
        if (this.isFocused) {
            return this.query.length !== 0 ? '' : (selected || 'Select epitope');
        }
        return !selected && this.query.length === 0 ? 'Select epitope' : '';
    }

    /** Whether to say so when a query matches nothing. Silent while the box is empty. */
    public isEmptyResult(values: IStructuresMetadataTreeLevelValue[]): boolean {
        return this.query.trim().length !== 0 && this.filter(values).length === 0;
    }

    /** `enabled` is false until an MHC pair is chosen: there is nothing to list before that. */
    public onFocus(enabled: boolean): void {
        if (!enabled) {
            return;
        }
        this.isFocused = true;
        this.isOpen = true;
    }

    public onBlur(): void {
        this.isFocused = false;
        this.isOpen = false;
    }

    public onInput(value: string, enabled: boolean): void {
        this.query = value;
        if (!this.isOpen && enabled) {
            this.isOpen = true;
        }
    }

    public toggle(enabled: boolean): void {
        if (!enabled) {
            return;
        }
        this.isOpen = !this.isOpen;
        if (!this.isOpen) {
            this.close();
        }
    }

    /** Clears the query and closes, which is what selecting an option should leave behind. */
    public commit(): void {
        this.query = '';
        this.close();
    }

    public close(): void {
        this.isFocused = false;
        this.isOpen = false;
        if (this.input && this.input.nativeElement) {
            this.input.nativeElement.blur();
        }
    }
}
