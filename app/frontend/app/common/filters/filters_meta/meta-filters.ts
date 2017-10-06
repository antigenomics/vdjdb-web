import { SetEntry } from '../common/set/set-entry';
import { Filter, FilterInterface, FilterType, IFiltersOptions } from '../filters';

export class MetaGeneralFilter implements FilterInterface {
    public referencesSelected: SetEntry[] = [];
    public referencesValues: string[];

    public methodSort: boolean;
    public methodCulture: boolean;
    public methodOther: boolean;

    public seqSanger: boolean;
    public seqAmplicon: boolean;
    public seqSingleCell: boolean;

    public setDefault(): void {
        this.referencesSelected = [];
        this.methodSort = true;
        this.methodCulture = true;
        this.methodOther = true;
        this.seqSanger = true;
        this.seqAmplicon = true;
        this.seqSingleCell = true;
    }

    public setOptions(options: IFiltersOptions): void {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        if (options.hasOwnProperty('referencesValues')) {
            this.referencesValues = options['referencesValues'];
        }
        /* tslint:enable:no-string-literal */
    }

    public collectFilters(filters: Filter[], _: string[]): void {
        if (this.referencesSelected.length > 0) {
            filters.push(new Filter('reference.id', FilterType.SUBSTRING_SET, false, SetEntry.toString(this.referencesSelected)));
        }
        if (this.methodSort === false) {
            filters.push(new Filter('web.method', FilterType.EXACT, true, 'sort'));
        }
        if (this.methodCulture === false) {
            filters.push(new Filter('web.method', FilterType.EXACT, true, 'culture'));
        }
        if (this.methodOther === false) {
            filters.push(new Filter('web.method', FilterType.EXACT, true, 'other'));
        }
        if (this.seqSanger === false) {
            filters.push(new Filter('web.method.seq', FilterType.EXACT, true, 'sanger'));
        }
        if (this.seqAmplicon === false) {
            filters.push(new Filter('web.method.seq', FilterType.EXACT, true, 'amplicon'));
        }
        if (this.seqSingleCell === false) {
            filters.push(new Filter('web.method.seq', FilterType.EXACT, true, 'singlecell'));
        }
    }

    public getFilterId(): string {
        return 'general';
    }
}

export class MetaReliabilityFilter implements FilterInterface {
    public confidenceScoreMin: number = 0;
    public confidenceScoreMax: number = 3;

    public minimalConfidenceScore: number;
    public nonCanonical: boolean;
    public unmapped: boolean;

    public setDefault(): void {
        this.minimalConfidenceScore = 0;
        this.nonCanonical = false;
        this.unmapped = false;
    }

    public setOptions(_: IFiltersOptions): void {
        return;
    }

    public collectFilters(filters: Filter[], errors: string[]): void {
        if (this.minimalConfidenceScore < this.confidenceScoreMin || this.minimalConfidenceScore > this.confidenceScoreMax) {
            errors.push(`Invalid minimal confidence score value, should be between ${this.confidenceScoreMin} and ${this.confidenceScoreMax}`);
        }
        if (this.minimalConfidenceScore > 0) {
            filters.push(new Filter('vdjdb.score', FilterType.LEVEL, false, this.minimalConfidenceScore.toString()));
        }
        if (this.nonCanonical === false) {
            filters.push(new Filter('web.cdr3fix.nc', FilterType.EXACT, true, 'yes'));
        }
        if (this.unmapped === false) {
            filters.push(new Filter('web.cdr3fix.unmp', FilterType.EXACT, true, 'yes'));
        }
    }

    public getFilterId(): string {
        return 'reliability';
    }
}
