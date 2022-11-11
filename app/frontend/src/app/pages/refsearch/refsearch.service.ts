import { Injectable } from '@angular/core';
import { thresholdFreedmanDiaconis } from 'd3';
import { combineLatest, from, interval, Observable, of, ReplaySubject } from 'rxjs';
import { catchError, map, mergeMap, startWith, take } from 'rxjs/operators';
import { Utils } from 'utils/utils';
import { RefSearchTableRow } from './refsearch';

export type RefSearchBackendState = number;

export namespace RefSearchBackendStates {
    export const UNDEFINED: number = 1;
    export const ALIVE: number = 2;
    export const UNREACHABLE: number = 3;
  }

@Injectable()
export class RefSearchService {
    private static readonly refSearchBackendURL: string = 'http://localhost:5001';
    private static readonly isAliveInterval: number = 15000;
    private static readonly isAliveRequest = interval(RefSearchService.isAliveInterval).pipe(
        startWith(RefSearchBackendStates.UNDEFINED),
        mergeMap((_) => from(Utils.HTTP.get(RefSearchService.refSearchBackendURL)).pipe(
            map((response) => response.status === Utils.HTTP.SUCCESS_STATUS ? RefSearchBackendStates.ALIVE : RefSearchBackendStates.UNREACHABLE),
            catchError((_, __) => of(RefSearchBackendStates.UNREACHABLE))
        )),
        catchError((_, __) => of(RefSearchBackendStates.UNREACHABLE))
    )

    private isQueryLoading: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
    private queryError: ReplaySubject<string | undefined> = new ReplaySubject<string>(1);
    private queryResults: ReplaySubject<RefSearchTableRow[] | undefined> = new ReplaySubject(1);

    private filterCDR3: ReplaySubject<string> = new ReplaySubject<string>(1);
    private filterEpitope: ReplaySubject<string> = new ReplaySubject<string>(1);

    constructor() {
        this.isQueryLoading.next(false);
        this.queryResults.next(undefined) // In the beginning we have an empty request
        this.queryError.next(undefined) // No error by default
        this.filterCDR3.next('') // Empty filters by default
        this.filterEpitope.next('') // Empty filters by default
    }

    public updateCDR3(cdr3: string): void {
        this.filterCDR3.next(cdr3);
    }

    public updateEpitope(epitope: string): void {
        this.filterEpitope.next(epitope);
    }

    public search(): void {
        this.isQueryLoading.next(true);
        this.queryError.next(undefined);

        combineLatest(this.filterCDR3, this.filterEpitope).pipe(
            take(1),
            map(([ cdr3, epitope ]) => ({ 'cdr3': cdr3, 'antigen.epitope': epitope }))
        ).subscribe((filters) => {
            Utils.HTTP.post(RefSearchService.refSearchBackendURL, filters).then((response) => {
                this.queryResults.next((JSON.parse(response.response) as any[]).map((row: any) => new RefSearchTableRow(row)))
            }).catch((error) => {
                this.queryResults.next(undefined)
                this.queryError.next(error.responseText)
            }).finally(() => {
                this.isQueryLoading.next(false)
            });
        })

    }

    public reset(): void {
        this.queryResults.next(undefined);
        this.queryError.next(undefined);
        this.filterCDR3.next('');
        this.filterEpitope.next('');
    }

    public getCDR3Filter(): Observable<string> {
        return this.filterCDR3;
    }

    public getEpitopeFilter(): Observable<string> {
        return this.filterEpitope;
    }

    public getRows(): Observable<RefSearchTableRow[] | undefined> {
        return this.queryResults;
    }

    public getError(): Observable<string | undefined> {
        return this.queryError;
    }

    public isLoading(): Observable<boolean> {
        return this.isQueryLoading;
    }

    public isAlive(): Observable<RefSearchBackendState> {
        return RefSearchService.isAliveRequest;
    }
}