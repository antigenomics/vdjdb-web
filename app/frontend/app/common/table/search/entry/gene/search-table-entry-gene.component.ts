import {
    ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactory, ComponentRef, HostListener, Renderer2, ViewContainerRef
} from '@angular/core';
import { NotificationService } from '../../../../../utils/notification/notification.service';
import { WebSocketResponseData } from '../../../../websocket/websocket-response';
import { SearchTableRow } from '../../row/search-table-row';
import { SearchTableService } from '../../search-table.service';

@Component({
    selector:        'td[search-table-entry-gene]',
    template:        `<i class="plus icon cursor pointer" [class.disabled]="isDisabled()" *ngIf="!visible"></i>
                      <i class="minus icon cursor pointer" *ngIf="visible"></i>{{ value }}`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryGeneComponent {
    private _hostRowViewContainer: ViewContainerRef;
    private _loading: boolean = false;

    private _visible: boolean = false;
    private _pairedRow: ComponentRef<any>;
    private _pairedRowResolver: ComponentFactory<any>;

    private _value: string;
    private _pairedID: string;

    constructor(private renderer: Renderer2, private table: SearchTableService, private notifications: NotificationService,
                private changeDetector: ChangeDetectorRef) {
    }

    public generate(value: string, pairedID: string, viewContainer: ViewContainerRef, pairedRowResolver: ComponentFactory<any>): void {
        this._value = value;
        this._pairedID = pairedID;
        this._hostRowViewContainer = viewContainer;
        this._pairedRowResolver = pairedRowResolver;
    }

    @HostListener('click')
    public checkPaired(): void {
        if (this._pairedID === '0') {
            this.notifications.warn('Paired', 'Paired not found');
        } else {
            if (this._pairedRow) {
                if (this._visible) {
                    this.renderer.setStyle(this._pairedRow.location.nativeElement, 'display', 'none');
                } else {
                    this.renderer.setStyle(this._pairedRow.location.nativeElement, 'display', 'table-row');
                }
                this._visible = !this._visible;
            } else if (!this._loading) {
                this._loading = true;
                const paired = this.table.getPaired(this._pairedID, this._value);
                paired.subscribe((response: WebSocketResponseData) => {
                    this._loading = false;
                    this._pairedRow = this._hostRowViewContainer.createComponent(this._pairedRowResolver);
                    this._pairedRow.instance.row = new SearchTableRow(response.get('paired'));
                    this._pairedRow.instance.allowPaired = false;
                    this._pairedRow.instance.ngOnInit();
                    this._pairedRow.changeDetectorRef.detectChanges();
                    this.renderer.addClass(this._pairedRow.location.nativeElement, 'warning');
                    this._visible = true;
                    this.changeDetector.detectChanges();
                });
            } else if (this._loading) {
                this.notifications.info('Paired', 'Loading...');
            }
        }
    }

    public isDisabled(): boolean {
        return this._pairedID === '0';
    }

    get visible(): boolean {
        return this._visible;
    }

    get value(): string {
        return this._value;
    }

    get pairedID(): string {
        return this._pairedID;
    }
}
