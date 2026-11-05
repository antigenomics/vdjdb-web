import { CommonDiseaseType, DiseasesService } from './diseases.service';
import { Filter, FilterType } from './filters';
import { FiltersService } from './filters.service';
import { AGFiltersService } from './filters_ag/ag-filters.service';
import { MetaFiltersService } from './filters_meta/meta-filters.service';
import { MHCFiltersService } from './filters_mhc/mhc-filters.service';
import { TCRFiltersService } from './filters_tcr/tcr-filters.service';

describe('Disease shortcut filters', () => {
    it('collects a COVID-19 source filter excluding SARS-CoV-1 and toggles it off', () => {
        const ag = new AGFiltersService();
        const tcr = new TCRFiltersService();
        const filters = new FiltersService(tcr, ag, new MHCFiltersService(), new MetaFiltersService());
        const diseases = new DiseasesService(ag, tcr, filters);
        tcr.general.tra = false;
        diseases.selectDisease(CommonDiseaseType.SARSCOV);
        const collected: Filter[] = [];
        const errors: string[] = [];
        filters.collectFilters(collected, errors);
        const source = collected.map(filter => filter.unpack()).find(filter => filter.column === 'antigen.species');
        expect(errors).toEqual([]);
        expect(source).toEqual({column: 'antigen.species', filterType: FilterType.SUBSTRING_SET,
            negative: false, value: 'SARS-CoV-2'});
        // The backend SubstringSetTextFilter uses case-insensitive contains for each selected token.
        const matched = ['SARS-CoV', 'SARS-CoV-1', 'SARS-CoV-2', 'SARS-CoV-2 variant'].filter(
            name => source.value.split(',').some((token: string) => name.toLowerCase().includes(token.toLowerCase()))
        );
        expect(matched).toEqual(['SARS-CoV-2', 'SARS-CoV-2 variant']);
        expect(tcr.general.tra && tcr.general.trb).toBe(true);
        expect(diseases.isDiseaseSelected(CommonDiseaseType.SARSCOV)).toBe(true);
        diseases.selectDisease(CommonDiseaseType.SARSCOV);
        expect(ag.origin.speciesSelected).toEqual([]);
    });

    it('keeps influenza and self-antigen source selections unchanged', () => {
        const ag = new AGFiltersService();
        const tcr = new TCRFiltersService();
        const filters = new FiltersService(tcr, ag, new MHCFiltersService(), new MetaFiltersService());
        const diseases = new DiseasesService(ag, tcr, filters);
        diseases.selectDisease(CommonDiseaseType.INFLUENZA);
        diseases.selectDisease(CommonDiseaseType.SELFANTIGEN);
        const collected: Filter[] = [];
        ag.origin.collectFilters(collected, []);
        expect(collected.map(filter => filter.unpack())).toEqual([
            {column: 'antigen.species', filterType: FilterType.SUBSTRING_SET,
                negative: false, value: 'Influenza,HomoSapiens'}
        ]);
    });
});
