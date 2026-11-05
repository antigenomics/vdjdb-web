import { NO_ERRORS_SCHEMA } from '@angular/core';
import { async, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TCRGeneralFilterComponent } from './tcr-general-filter.component';
import { TCRFiltersService } from '../tcr-filters.service';
import { CheckboxDirective } from '../../../modals/checkbox/checkbox.directive';
import { Filter } from '../../filters';

describe('TCR general filter controls', () => {
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [FormsModule],
            declarations: [TCRGeneralFilterComponent, CheckboxDirective],
            providers: [TCRFiltersService],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();
    }));

    it('changes the append-pairs model when its visible label is clicked', fakeAsync(() => {
        const service: TCRFiltersService = TestBed.get(TCRFiltersService);
        service.setDefault();
        const fixture = TestBed.createComponent(TCRGeneralFilterComponent);
        fixture.detectChanges(); tick();
        const labels: HTMLLabelElement[] = Array.from(fixture.nativeElement.querySelectorAll('label'));
        const append = labels.find(label => label.textContent.trim() === 'Append pairs');
        expect(append.control).toBe(fixture.nativeElement.querySelector('input#' + append.htmlFor));
        append.click();
        tick(); fixture.detectChanges();
        expect(service.general.appendPaired).toBe(true);
        const repeated = TestBed.createComponent(TCRGeneralFilterComponent);
        repeated.detectChanges(); tick();
        const secondLabels: HTMLLabelElement[] = Array.from(repeated.nativeElement.querySelectorAll('label'));
        expect(append.htmlFor).not.toBe(secondLabels.find(label => label.textContent.trim() === 'Append pairs').htmlFor);
    }));

    it('offers a cattle control that excludes BosTaurus when unchecked and resets with the form', fakeAsync(() => {
        const service: TCRFiltersService = TestBed.get(TCRFiltersService);
        service.setDefault();
        const fixture = TestBed.createComponent(TCRGeneralFilterComponent);
        fixture.detectChanges(); tick();
        const labels: HTMLLabelElement[] = Array.from(fixture.nativeElement.querySelectorAll('label'));
        const cattle = labels.find(label => label.textContent.trim() === 'Cattle');
        expect(cattle).toBeDefined();
        if (!cattle) { return; }
        cattle.click(); tick(); fixture.detectChanges();
        const filters: Filter[] = [];
        service.general.collectFilters(filters, []);
        expect(filters.map(filter => filter.unpack()).some(filter => filter.column === 'species' && filter.value === 'BosTaurus' && filter.negative)).toBe(true);
        expect(service.general.isDefault()).toBe(false);
        service.setDefault();
        expect(service.general.isDefault()).toBe(true);
    }));
});
