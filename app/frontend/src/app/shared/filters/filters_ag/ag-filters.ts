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
import { SuggestionEntry } from '../common/set/suggestion-entry';
import { Filter, FilterInterface, FilterType, IFiltersOptions } from '../filters';

export class AGOriginFilter implements FilterInterface {
    public speciesSelected: SetEntry[] = [];
    public speciesValues: string[] = [];

    public genesSelected: SetEntry[] = [];
    public genesValues: string[] = [];

    public setDefault(): void {
        this.speciesSelected = [];
        this.genesSelected = [];
    }

    public setOptions(options: IFiltersOptions): void {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        if (options.hasOwnProperty('speciesValues')) {
            this.speciesValues = options['speciesValues'];
        }
        if (options.hasOwnProperty('genesValues')) {
            this.genesValues = options['genesValues'];
        }
        /* tslint:enable:no-string-literal */
    }

    public collectFilters(filters: Filter[], _: string[]): void {
        if (this.speciesSelected.length > 0) {
            filters.push(new Filter('antigen.species', FilterType.SUBSTRING_SET, false, SetEntry.toString(this.speciesSelected)));
        }
        if (this.genesSelected.length > 0) {
            filters.push(new Filter('antigen.gene', FilterType.SUBSTRING_SET, false, SetEntry.toString(this.genesSelected)));
        }
    }

    public getFilterId(): string {
        return 'origin';
    }
}

export class AGEpitopeFilter implements FilterInterface {
    public epitopeSelected: SetEntry[] = [];
    public epitopeValues: string[] = [];
    public epitopeSuggestions: { [value: string]: SuggestionEntry[]; } = {};

    public epitopePattern: string;
    public epitopePatternSubstring: boolean;
    public epitopePatternValid: boolean;

    public setDefault(): void {
        this.epitopeSelected = [];
        this.epitopePattern = '';
        this.epitopePatternSubstring = false;
        this.epitopePatternValid = true;
    }

    public setOptions(options: IFiltersOptions): void {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        if (options.hasOwnProperty('epitopeValues')) {
            this.epitopeValues = options['epitopeValues'];
        }
        if (options.hasOwnProperty('epitopeSuggestions')) {
            for (const key in options['epitopeSuggestions']) {
                if (options['epitopeSuggestions'].hasOwnProperty(key)) {
                    const value = options['epitopeSuggestions'][ key ];
                    this.epitopeSuggestions[ key ] = value.map((o: any) => new SuggestionEntry(o));
                }
            }
        }
        /* tslint:enable:no-string-literal */
    }

    public collectFilters(filters: Filter[], errors: string[]): void {
        if (!this.isPatternValid()) {
            errors.push('Epitope pattern is not valid');
            return;
        }
        if (this.epitopeSelected.length > 0) {
            filters.push(new Filter('antigen.epitope', FilterType.SUBSTRING_SET, false, SetEntry.toString(this.epitopeSelected)));
        }
        if (this.epitopePattern.length !== 0) {
            let value = this.epitopePattern;
            if (this.epitopePatternSubstring === false) {
                value = `^${value}$`;
            }
            filters.push(new Filter('antigen.epitope', FilterType.PATTERN, false, value.replace(/X/g, '.')));
        }
    }

    public getFilterId(): string {
        return 'epitope';
    }

    public checkPattern(newValue: string): void {
        this.epitopePattern = newValue.toUpperCase();
        this.epitopePatternValid = Utils.SequencePattern.isPatternValid(this.epitopePattern);
    }

    public isPatternValid(): boolean {
        return this.epitopePatternValid;
    }
}
