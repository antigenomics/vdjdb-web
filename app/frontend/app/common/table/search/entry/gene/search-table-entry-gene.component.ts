import {
    ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, ComponentRef, HostListener, Renderer2, ViewContainerRef
} from '@angular/core';
import { NotificationService } from '../../../../../utils/notification/notification.service';
import { SearchTableRow } from '../../row/search-table-row';
import { SearchTableRowComponent } from '../../row/search-table-row.component';
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
    private _pairedRow: ComponentRef<SearchTableRowComponent>;

    private _value: string;
    private _pairedID: string;

    constructor(private resolver: ComponentFactoryResolver, private renderer: Renderer2,
                private table: SearchTableService, private notifications: NotificationService,
                private changeDetector: ChangeDetectorRef) {
    }

    public generate(value: string, pairedID: string, viewContainer: ViewContainerRef): void {
        this._value = value;
        this._pairedID = pairedID;
        this._hostRowViewContainer = viewContainer;
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
                paired.subscribe((pairedResponse: any) => {
                    this._loading = false;
                    const rowComponentResolver = this.resolver.resolveComponentFactory<SearchTableRowComponent>(SearchTableRowComponent);
                    this._pairedRow = this._hostRowViewContainer.createComponent(rowComponentResolver);
                    this._pairedRow.instance.row = new SearchTableRow(pairedResponse.paired);
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