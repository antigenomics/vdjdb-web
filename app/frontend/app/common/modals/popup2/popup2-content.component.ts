import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { InputConverter, NumberConverter } from '../../../utils/input-converter.decorator';
import { Utils } from '../../../utils/utils';

export class PopupContentBoundingRectangle {
    public left: string;
    public top: string;
    public width: string;
}

@Component({
    selector:        'popup2-content',
    templateUrl:     './popup2-content.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class Popup2ContentComponent implements AfterViewInit {
    private _content: SafeHtml;
    private _header: SafeHtml;

    public br: PopupContentBoundingRectangle = new PopupContentBoundingRectangle();

    @Input('hostElement')
    public hostElement: HTMLElement;

    @Input('width')
    @InputConverter(NumberConverter)
    public width: number;

    @Input('position')
    public position: string;

    @Input('content')
    set content(popupContent: string) {
        this._content = this.sanitizer.bypassSecurityTrustHtml(popupContent);
    }

    @Input('header')
    set header(headerContent: string) {
        this._header = this.sanitizer.bypassSecurityTrustHtml(headerContent);
    }

    constructor(private sanitizer: DomSanitizer, private changeDetector: ChangeDetectorRef) {
    }

    public ngAfterViewInit(): void {
        this.recalculateOffsets();
        this.changeDetector.detectChanges();
    }

    public getPopupContent(): SafeHtml {
        return this._content;
    }

    public getHeaderContent(): SafeHtml {
        return this._header;
    }

    private recalculateOffsets(): void {
        const hostBoundingRectangle = this.hostElement.getBoundingClientRect();
        const clientViewport = Utils.Window.getViewport();

        let left = 0;
        let top = 0;

        switch (this.position) {
            case 'left':
                left = (hostBoundingRectangle.left - this.width);
                top = (hostBoundingRectangle.top);
                break;
            default:
                break;
        }

        this.br.left = left + 'px';
        this.br.top = top + 'px';
        this.br.width = this.width + 'px';
    }

}
