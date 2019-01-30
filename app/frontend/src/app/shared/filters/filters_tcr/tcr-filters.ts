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

import { Utils } from 'utils/utils';
import { SetEntry } from '../common/set/set-entry';
import { SliderRangeModel } from '../common/slider/slider.component';
import { Filter, FilterInterface, FilterType, IFiltersOptions } from '../filters';

export class TCRSegmentsFilter implements FilterInterface {
    public vSegmentSelected: SetEntry[] = [];
    public vSegmentValues: string[] = [];

    public jSegmentSelected: SetEntry[] = [];
    public jSegmentValues: string[] = [];

    public setDefault(): void {
        this.vSegmentSelected = [];
        this.jSegmentSelected = [];
    }

    public setOptions(options: IFiltersOptions): void {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        if (options.hasOwnProperty('vSegmentValues')) {
            this.vSegmentValues = options['vSegmentValues'];
        }
        if (options.hasOwnProperty('jSegmentValues')) {
            this.jSegmentValues = options['jSegmentValues'];
        }
        /* tslint:enable:no-string-literal */
        return;
    }

    public collectFilters(filters: Filter[], _: string[]): void {
        if (this.vSegmentSelected.length !== 0) {
            filters.push(new Filter('v.segm', FilterType.SUBSTRING_SET, false, SetEntry.toString(this.vSegmentSelected)));
        }
        if (this.jSegmentSelected.length !== 0) {
            filters.push(new Filter('j.segm', FilterType.SUBSTRING_SET, false, SetEntry.toString(this.jSegmentSelected)));
        }
    }

    public getFilterId(): string {
        return 'segments';
    }
}

export class TCRGeneralFilter implements FilterInterface {
    private _tra: boolean;
    private _trb: boolean;

    public set tra(input: boolean) {
        this._tra = input;
        if (this._tra === false && this._trb === false) {
            this._trb = true;
        }
    }

    public get tra(): boolean {
        return this._tra;
    }

    public set trb(input: boolean) {
        this._trb = input;
        if (this._tra === false && this._trb === false) {
            this._tra = true;
        }
    }

    public get trb(): boolean {
        return this._trb;
    }

    public pairedOnly: boolean;
    public appendPaired: boolean;

    public human: boolean;
    public monkey: boolean;
    public mouse: boolean;

    public setDefault(): void {
        this.human = true;
        this.monkey = true;
        this.mouse = true;

        this.tra = false;
        this.trb = true;
        this.pairedOnly = false;
        this.appendPaired = false;
    }

    public setOptions(_: IFiltersOptions): void {
        return;
    }

    public collectFilters(filters: Filter[], _: string[]): void {
        if (this.human === false) {
            filters.push(new Filter('species', FilterType.EXACT, true, 'HomoSapiens'));
        }
        if (this.monkey === false) {
            filters.push(new Filter('species', FilterType.EXACT, true, 'MacacaMulatta'));
        }
        if (this.mouse === false) {
            filters.push(new Filter('species', FilterType.EXACT, true, 'MusMusculus'));
        }
        if (this.tra === false) {
            filters.push(new Filter('gene', FilterType.EXACT, true, 'TRA'));
        }
        if (this.trb === false) {
            filters.push(new Filter('gene', FilterType.EXACT, true, 'TRB'));
        }
        if (this.pairedOnly === true) {
            filters.push(new Filter('complex.id', FilterType.EXACT, true, '0'));
        }
        if (this.appendPaired === true) {
            filters.push(new Filter('option:append-paired', FilterType.EXACT, false, 'true'));
        }
    }

    public getFilterId(): string {
        return 'general';
    }
}

export class TCRcdr3Filter implements FilterInterface {
    public pattern: string;
    public patternSubstring: boolean;
    public patternValid: boolean;

    public lengthMin: number = 5;
    public lengthMax: number = 30;
    public length: SliderRangeModel;

    public levenstein: string;
    public levensteinValid: boolean;
    public levensteinSubstitutions: number;
    public levensteinInsertions: number;
    public levensteinDeletions: number;

    public setDefault(): void {
        this.pattern = '';
        this.patternSubstring = false;
        this.patternValid = true;
        this.length = new SliderRangeModel(this.lengthMin, this.lengthMax);
        this.levenstein = '';
        this.levensteinValid = true;
        this.levensteinSubstitutions = 0;
        this.levensteinInsertions = 0;
        this.levensteinDeletions = 0;
    }

    public setOptions(_: IFiltersOptions): void {
        return;
    }

    public collectFilters(filters: Filter[], errors: string[]): void {
        if (!this.isPatternValid()) {
            errors.push('CDR3 pattern is not valid');
            return;
        } else if (this.pattern.length !== 0) {
            let value = this.pattern;
            if (this.patternSubstring === false) {
                value = `^${value}$`;
            }
            filters.push(new Filter('cdr3', FilterType.PATTERN, false, value.replace(/X/g, '.')));
        }

        if (this.length.min < this.lengthMin || this.length.max > this.lengthMax) {
            errors.push('Incorrect cdr3 length');
        } else if (this.length.min !== this.lengthMin || this.length.max !== this.lengthMax) {
            filters.push(new Filter('cdr3', FilterType.RANGE, false, this.length.toString()));
        }

        if (!this.isLevensteinValid()) {
            errors.push('CDR3 pattern is not valid in levenstein distance filter');
            return;
        } else if (this.levenstein.length !== 0) {
            filters.push(new Filter('cdr3', FilterType.SEQUENCE, false,
                `${this.levenstein}:${this.levensteinSubstitutions}:${this.levensteinInsertions}:${this.levensteinDeletions}`));
        }
    }

    public getFilterId(): string {
        return 'cdr3';
    }

    public checkPattern(newValue: string): void {
        this.pattern = newValue.toUpperCase();
        this.patternValid = Utils.SequencePattern.isPatternValid(this.pattern);
    }

    public isPatternValid(): boolean {
        return this.patternValid;
    }

    public checkLevenstein(newValue: string): void {
        this.levenstein = newValue.toUpperCase();
        this.levensteinValid = Utils.SequencePattern.isPatternValidStrict(this.levenstein);
    }

    public isLevensteinValid(): boolean {
        return this.levensteinValid;
    }
}
