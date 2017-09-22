import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { InputConverter, NumberConverter } from '../../../utils/input-converter.decorator';
import { Utils } from '../../../utils/utils';
import WindowViewport = Utils.Window.WindowViewport;

export class PopupBoundingRect {
    public left: string;
    public top: string;
    public bottom: string;
    public width: string;
}

@Component({
    selector:        'popup-content',
    templateUrl:     './popup-content.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PopupContentComponent implements AfterViewInit {
    private static _magicConstant: number = 20.0;
    private _content: string[];
    private _header: string;

    public boundingRect: PopupBoundingRect = new PopupBoundingRect();

    @Input('hostElement')
    public hostElement: HTMLElement;

    @Input('width')
    @InputConverter(NumberConverter)
    public width: number;

    @Input('position')
    public position: 'left' | 'right' | 'top' | 'bottom';

    @Input('display')
    public display: 'paragraph' | 'list';

    @Input('content')
    set content(popupContent: string | string[]) {
        if (typeof popupContent === 'string') {
            this._content = Utils.Text.splitParagraphs(popupContent);
        } else if (Array.isArray(popupContent)) {
            this._content = popupContent;
        }
    }

    @Input('header')
    set header(headerContent: string) {
        this._header = headerContent;
    }

    constructor(private changeDetector: ChangeDetectorRef) {}

    public ngAfterViewInit(): void {
        this.positionElement();
        this.changeDetector.detectChanges();
    }

    public getPopupContent(): string[] {
        return this._content;
    }

    public getHeaderContent(): string {
        return this._header;
    }

    private positionElement(): void {
        const hostBoundingRectangle = this.hostElement.getBoundingClientRect();
        const windowViewport = Utils.Window.getViewport();

        switch (this.position) {
            case 'left':
                this.positionLeft(hostBoundingRectangle, windowViewport);
                break;
            case 'right':
                this.positionRight(hostBoundingRectangle, windowViewport);
                break;
            case 'top':
                this.positionTop(hostBoundingRectangle, windowViewport);
                break;
            case 'bottom':
                this.positionBottom(hostBoundingRectangle, windowViewport);
                break;
            default:
                break;
        }
        this.boundingRect.width = this.width + 'px';
    }

    private positionLeft(hostBoundingRectangle: ClientRect, _: WindowViewport): void {
        let left = hostBoundingRectangle.left - this.width - PopupContentComponent._magicConstant;
        const top = hostBoundingRectangle.top;

        if (left < 0) {
            left = hostBoundingRectangle.left + hostBoundingRectangle.width;
        }

        this.boundingRect.left = left + 'px';
        this.boundingRect.top = top + 'px';
        this.boundingRect.bottom = 'auto';
    }

    private positionRight(hostBoundingRectangle: ClientRect, windowViewport: WindowViewport): void {
        let left = hostBoundingRectangle.left + hostBoundingRectangle.width;
        const top = hostBoundingRectangle.top;

        if ((left + this.width) > windowViewport.width) {
            left = hostBoundingRectangle.left - this.width;
        }

        this.boundingRect.left = left + 'px';
        this.boundingRect.top = top + 'px';
        this.boundingRect.bottom = 'auto';
    }

    private positionTop(hostBoundingRectangle: ClientRect, windowViewport: WindowViewport): void {
        let left = hostBoundingRectangle.left - (this.width / 2.0);
        const bottom = windowViewport.height - hostBoundingRectangle.top;

        const rightOverflow = (left + this.width + PopupContentComponent._magicConstant) - windowViewport.width;
        if (rightOverflow > 0) {
            left -= rightOverflow;
        }

        if (left < 0) {
            left = PopupContentComponent._magicConstant;
        }

        this.boundingRect.left = left + 'px';
        this.boundingRect.top = 'auto';
        this.boundingRect.bottom = bottom + 'px';
    }

    private positionBottom(hostBoundingRectangle: ClientRect, windowViewport: WindowViewport): void {
        let left = hostBoundingRectangle.left - (this.width / 2.0);
        const top = hostBoundingRectangle.top + hostBoundingRectangle.height;

        const rightOverflow = (left + this.width + PopupContentComponent._magicConstant) - windowViewport.width;
        if (rightOverflow > 0) {
            left -= rightOverflow;
        }

        if (left < 0) {
            left = PopupContentComponent._magicConstant;
        }

        this.boundingRect.left = left + 'px';
        this.boundingRect.top = top + 'px';
        this.boundingRect.bottom = 'auto';
    }

}
