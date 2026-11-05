import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { async, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { AnnotationsFilters } from 'pages/annotations/filters/annotations-filters';
import { CheckboxDirective } from 'shared/modals/checkbox/checkbox.directive';
import { SearchScopeComponent } from './search-scope.component';

@Component({ template: '<search-scope [filters]="filters" [disabled]="disabled"></search-scope>' })
class SearchScopeHarness {
    public filters = new AnnotationsFilters();
    public disabled = false;
}

describe('Annotation distance labels', () => {
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [FormsModule], declarations: [SearchScopeHarness, SearchScopeComponent, CheckboxDirective], schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();
    }));
    it('selects each distance mode by its visible label and respects disabled controls', () => {
        const fixture = TestBed.createComponent(SearchScopeHarness);
        fixture.detectChanges();
        const component: SearchScopeComponent = fixture.debugElement.query(By.directive(SearchScopeComponent)).componentInstance;
        const labels: HTMLLabelElement[] = Array.from(fixture.nativeElement.querySelectorAll('.radio label'));
        ['exact', 'hamming1', 'hamming2', 'levenshtein'].forEach((mode, i) => {
            labels[i].click(); fixture.detectChanges();
            expect(component.mode()).toBe(mode);
            expect(labels[i].control).toBeDefined();
        });
        fixture.componentInstance.disabled = true; fixture.detectChanges();
        expect((labels[0].control as HTMLInputElement).disabled).toBe(true);
        labels[0].click();
        expect(component.mode()).toBe('levenshtein');
    });
});
