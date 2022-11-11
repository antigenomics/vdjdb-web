import { Injectable } from '@angular/core';
import { thresholdFreedmanDiaconis } from 'd3';
import { from, interval, Observable, of, ReplaySubject } from 'rxjs';
import { catchError, map, mergeMap, startWith } from 'rxjs/operators';
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

    constructor() {
        this.isQueryLoading.next(false);
        this.queryResults.next(undefined) // In the beginning we have an empty request
        this.queryError.next(undefined) // No error by default
    }

    public search(): void {
        this.isQueryLoading.next(true);
        this.queryError.next(undefined)

        let request = Utils.HTTP.post(RefSearchService.refSearchBackendURL, {
            'cdr3': 'CIV CDISH',
            'antigen.epitope': 'AFSGFSG'
        });

        request.then((response) => {
            this.queryResults.next((JSON.parse(response.response) as any[]).map((row: any) => new RefSearchTableRow(row)))
        }).catch((error) => {
            this.queryResults.next(undefined)
            this.queryError.next(error.responseText)
        }).finally(() => {
            this.isQueryLoading.next(false)
        });
        
    }

    public reset(): void {
        this.queryResults.next(undefined);
        this.queryError.next(undefined);
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