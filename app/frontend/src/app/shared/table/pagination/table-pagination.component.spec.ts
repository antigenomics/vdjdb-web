import { CommonModule } from '@angular/common';
import { async, TestBed } from '@angular/core/testing';
import { TablePaginationComponent } from './table-pagination.component';

describe('Table pagination controls', () => {
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [TablePaginationComponent]
        }).compileComponents();
    }));

    it('uses native keyboard-activatable buttons while preserving page selection', () => {
        const fixture = TestBed.createComponent(TablePaginationComponent);
        const component = fixture.componentInstance;
        component.range = 5;
        component.pageCount = 3;
        fixture.detectChanges();
        const controls: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.item'));
        const last = controls.find(control => control.textContent.trim() === 'Last');
        expect(last.tagName).toBe('BUTTON');
        const pages: number[] = [];
        component.pageChange.subscribe((page: number) => pages.push(page));
        last.click();
        expect(pages).toEqual([2]);
        component.next();
        expect(pages).toEqual([2]);
        component.previous();
        expect(pages).toEqual([2, 1]);
    });
});
