import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { async, fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { TableExportComponent } from 'shared/table/export/table-export.component';
import { TableComponent } from 'shared/table/table.component';
import { WebSocketResponseData } from 'shared/websocket/websocket-response';
import { Utils } from 'utils/utils';
import { SearchTable } from './search-table';
import { SearchTableComponent } from './search-table.component';

describe('Search table export template wiring', () => {
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [SearchTableComponent, TableComponent, TableExportComponent],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();
    }));

    it('sends TSV and paired options from a real menu click, then downloads the response link', fakeAsync(() => {
        const events = new Subject<number>();
        const sendMessage = jasmine.createSpy('sendMessage').and.returnValue(Promise.resolve(
            new WebSocketResponseData({status: 'success', link: '/temporary/SearchTable.tsv'})
        ));
        const service: any = {
            getLastResponse: (): undefined => undefined,
            getEvents: () => events,
            getConnection: () => ({isDisconnected: () => false, sendMessage})
        };
        const logger: any = {debug: (): void => undefined};
        const notifications: any = {warn: jasmine.createSpy('warn')};
        const analytics: any = {reachGoal: (): void => undefined};
        const table = new SearchTable(service, {} as any, analytics, logger, notifications);
        spyOn(table, 'isEmpty').and.returnValue(false);
        const download = spyOn(Utils.File, 'download');
        const fixture = TestBed.createComponent(SearchTableComponent);
        fixture.componentInstance.table = table;
        fixture.componentInstance.configuration = {
            utils: {export: {
                formats: [{name: 'tsv', title: 'TSV'}],
                options: [{name: 'paired_export', title: 'Paired gene export', value: true}]
            }}
        };
        fixture.detectChanges();
        const item: HTMLAnchorElement = fixture.nativeElement.querySelector('table-export a.item');
        expect(item.textContent.trim()).toBe('TSV');
        item.click();
        flushMicrotasks();
        expect(sendMessage).toHaveBeenCalledWith({
            action: 'export', data: {format: 'tsv', options: [
                {name: 'paired_export', title: 'Paired gene export', value: true}
            ]}
        });
        expect(download).toHaveBeenCalledWith('/temporary/SearchTable.tsv');
        expect(notifications.warn).not.toHaveBeenCalled();
        fixture.destroy();
        table.destroy();
    }));
});
