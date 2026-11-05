import { CommonModule } from '@angular/common';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { async, TestBed } from '@angular/core/testing';
import { TableColumn } from 'shared/table/column/table-column';
import { SearchPageComponent } from './search.component';

@Component({ templateUrl: './search.component.html' })
class SearchActionsHarness {
    public table = { loading: false, dirty: false };
    public columns: TableColumn[] = [];
    public filtersCollapsed = false;
    public isLoading = SearchPageComponent.prototype.isLoading;
    public reset = jasmine.createSpy('reset');
    public search = jasmine.createSpy('search');
    public toggleFilters(): void {}
}

describe('Search action recovery', () => {
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [CommonModule], declarations: [SearchActionsHarness], schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();
    }));

    it('allows retry after an initial failure without rows, and disables actions while busy', () => {
        const fixture = TestBed.createComponent(SearchActionsHarness);
        fixture.detectChanges();
        const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
        expect(buttons.every(button => !button.disabled)).toBe(true);
        buttons[0].click();
        buttons[1].click();
        expect(fixture.componentInstance.reset).toHaveBeenCalled();
        expect(fixture.componentInstance.search).toHaveBeenCalled();
        fixture.componentInstance.table.loading = true;
        fixture.detectChanges();
        expect(buttons.every(button => button.disabled)).toBe(true);
    });
});
