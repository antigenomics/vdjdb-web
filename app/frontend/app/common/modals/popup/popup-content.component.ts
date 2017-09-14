import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';

@Component({
    selector:    'popup-content',
    templateUrl: './popup-content.component.html'
})
export class PopupContentComponent implements AfterViewInit {
    private static popupContentHideValue: number = -100000;

    @Input()
    public hostElement: HTMLElement;

    @Input()
    public content: SafeHtml;

    @Input()
    public header: string;

    @Input()
    public popupWidth: '' | 'wide' | 'very wide' = '';

    @Input()
    public placement: 'top' | 'bottom' | 'left' | 'right' = 'top';

    public top: number = -100000;
    public left: number = -100000;

    constructor(private element: ElementRef, private cdr: ChangeDetectorRef) {}

    public ngAfterViewInit(): void {
        this.show();
        this.cdr.detectChanges();
    }

    public show(): void {
        if (!this.hostElement) {
            return;
        }

        const p = PopupContentComponent.positionElements(this.hostElement, this.element.nativeElement.children[ 0 ], this.placement);
        this.top = p.top;
        this.left = p.left;
    }

    public hide(): void {
        this.top = PopupContentComponent.popupContentHideValue;
        this.left = PopupContentComponent.popupContentHideValue;
    }

    private static parentOffsetEl(nativeEl: HTMLElement): any {
        let offsetParent: any = nativeEl.offsetParent || window.document;
        while (offsetParent && offsetParent !== window.document && PopupContentComponent.isStaticPositioned(offsetParent)) {
            offsetParent = offsetParent.offsetParent;
        }
        return offsetParent || window.document;
    }

    private static positionElements(hostEl: HTMLElement, targetEl: HTMLElement,
                                    positionStr: string, appendToBody: boolean = false): { top: number, left: number } {
        const positionStrParts = positionStr.split('-');
        const pos0 = positionStrParts[ 0 ];
        const pos1 = positionStrParts[ 1 ] || 'center';
        const hostElPos = appendToBody ? PopupContentComponent.offset(hostEl) : PopupContentComponent.position(hostEl);
        const targetElWidth = targetEl.offsetWidth;
        const targetElHeight = targetEl.offsetHeight;
        const shiftWidth: any = {
            center(): number {
                return hostElPos.left + hostElPos.width / 2 - targetElWidth / 2;
            },
            left(): number {
                return hostElPos.left;
            },
            right(): number {
                return hostElPos.left + hostElPos.width;
            }
        };

        const shiftHeight: any = {
            center(): number {
                return hostElPos.top + hostElPos.height / 2 - targetElHeight / 2;
            },
            top(): number {
                return hostElPos.top;
            },
            bottom(): number {
                return hostElPos.top + hostElPos.height;
            }
        };

        let targetElPos: { top: number, left: number };
        switch (pos0) {
            case 'right':
                targetElPos = {
                    top:  shiftHeight[ pos1 ](),
                    left: shiftWidth[ pos0 ]()
                };
                break;

            case 'left':
                targetElPos = {
                    top:  shiftHeight[ pos1 ](),
                    left: hostElPos.left - targetElWidth
                };
                break;

            case 'bottom':
                targetElPos = {
                    top:  shiftHeight[ pos0 ](),
                    left: shiftWidth[ pos1 ]()
                };
                break;

            default:
                targetElPos = {
                    top:  hostElPos.top - targetElHeight,
                    left: shiftWidth[ pos1 ]()
                };
                break;
        }

        return targetElPos;
    }

    private static position(nativeEl: HTMLElement): { width: number, height: number, top: number, left: number } {
        let offsetParentBCR = { top: 0, left: 0 };
        const elBCR = PopupContentComponent.offset(nativeEl);
        const offsetParentEl = PopupContentComponent.parentOffsetEl(nativeEl);
        if (offsetParentEl !== window.document) {
            offsetParentBCR = PopupContentComponent.offset(offsetParentEl);
            offsetParentBCR.top += offsetParentEl.clientTop - offsetParentEl.scrollTop;
            offsetParentBCR.left += offsetParentEl.clientLeft - offsetParentEl.scrollLeft;
        }

        const boundingClientRect = nativeEl.getBoundingClientRect();
        return {
            width:  boundingClientRect.width || nativeEl.offsetWidth,
            height: boundingClientRect.height || nativeEl.offsetHeight,
            top:    elBCR.top - offsetParentBCR.top,
            left:   elBCR.left - offsetParentBCR.left
        };
    }

    private static offset(nativeEl: any): { width: number, height: number, top: number, left: number } {
        const boundingClientRect = nativeEl.getBoundingClientRect();
        return {
            width:  boundingClientRect.width || nativeEl.offsetWidth,
            height: boundingClientRect.height || nativeEl.offsetHeight,
            top:    boundingClientRect.top + (window.pageYOffset || window.document.documentElement.scrollTop),
            left:   boundingClientRect.left + (window.pageXOffset || window.document.documentElement.scrollLeft)
        };
    }

    private static getStyle(nativeEl: HTMLElement, cssProp: string): string {
        if ((nativeEl as any).currentStyle) {
            return (nativeEl as any).currentStyle[ cssProp ];
        }

        if (window.getComputedStyle) {
            return (window.getComputedStyle(nativeEl) as any)[ cssProp ];
        }

        // finally try and get inline style
        return (nativeEl.style as any)[ cssProp ];
    }

    private static isStaticPositioned(nativeEl: HTMLElement): boolean {
        return (PopupContentComponent.getStyle(nativeEl, 'position') || 'static' ) === 'static';
    }
}
