import { Injectable } from '@angular/core';
import { from, interval, Observable, of, ReplaySubject } from 'rxjs';
import { catchError, map, mergeMap, startWith } from 'rxjs/operators';
import { Utils } from 'utils/utils';

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

    private queryResults: ReplaySubject<any[] | undefined> = new ReplaySubject(1);

    constructor() {
        this.queryResults.next(undefined) // In the beginning we have an empty request
    }

    public search(): void {
        this.queryResults.next([])
    }

    public reset(): void {
        this.queryResults.next(undefined)
    }

    public getRows(): Observable<any[]> {
        return this.queryResults;
    }

    public isAlive(): Observable<RefSearchBackendState> {
        return RefSearchService.isAliveRequest;
    }
}