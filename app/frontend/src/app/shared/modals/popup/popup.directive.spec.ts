import { ApplicationRef, Component } from '@angular/core';
import { async, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ModalsModule } from '../modals.module';
import { PopupDirective } from './popup.directive';

@Component({template: '<button popup="Quick view" [disabled]="disabled">Details</button>'})
class PopupHarness {
    public disabled = false;
}

describe('Popup lifecycle', () => {
    beforeEach(async(() => {
        TestBed.configureTestingModule({imports: [ModalsModule], declarations: [PopupHarness]}).compileComponents();
    }));

    it('removes body content and attached views on explicit hide, disable, and host destruction', () => {
        const fixture = TestBed.createComponent(PopupHarness);
        fixture.detectChanges();
        const host = fixture.debugElement.query(By.directive(PopupDirective));
        const directive = host.injector.get(PopupDirective);
        const appRef = TestBed.get(ApplicationRef);
        const baseline = appRef.viewCount;
        const open = (): any => {
            host.nativeElement.dispatchEvent(new Event('focusin'));
            const tooltip = (directive as any)._tooltip;
            expect(document.body.contains(tooltip.location.nativeElement)).toBe(true);
            expect(appRef.viewCount).toBe(baseline + 1);
            spyOn(tooltip, 'destroy').and.callThrough();
            return tooltip;
        };
        const hidden = open();
        directive.updateView(false);
        expect(document.body.contains(hidden.location.nativeElement)).toBe(false);
        expect(appRef.viewCount).toBe(baseline);
        const disabled = open();
        fixture.componentInstance.disabled = true;
        fixture.detectChanges();
        expect(document.body.contains(disabled.location.nativeElement)).toBe(false);
        expect(appRef.viewCount).toBe(baseline);
        fixture.componentInstance.disabled = false;
        fixture.detectChanges();
        const destroyed = open();
        fixture.destroy();
        expect(document.body.contains(destroyed.location.nativeElement)).toBe(false);
        expect(appRef.viewCount).toBe(baseline);
        [hidden, disabled, destroyed].forEach(tooltip => expect(tooltip.destroy).toHaveBeenCalledTimes(1));
    });
});
