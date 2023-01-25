import { Injectable } from '@angular/core';
import { combineLatest, from, interval, Observable, of, ReplaySubject, Subject, zip } from 'rxjs';
import { catchError, map, mergeMap, startWith, take } from 'rxjs/operators';
import { LoggerService } from 'utils/logger/logger.service';
import { SetEntry } from 'shared/filters/common/set/set-entry';
import { Utils } from 'utils/utils';
import { RefSearchTableRow } from './refsearch';

export type RefSearchBackendState = number;

export namespace RefSearchBackendStates {
    export const UNDEFINED: number = 1;
    export const ALIVE: number = 2;
    export const UNREACHABLE: number = 3;
}

export type RefSearchBackendPrefetchEvent = number;

export namespace RefSearchBackendPrefetchEvents {
    export const INITIATED: number = 1;
    export const FINISHED: number = 2;
}

export interface IArticleAuthorMetadata {
    readonly first_name: string | undefined;
    readonly last_name: string | undefined;
    readonly collective_name: string | undefined;
}

export interface IArticleMetadata {
    readonly abstract: string;
    readonly authors_list: IArticleAuthorMetadata[];
    readonly journal: string;
    readonly publication_year: string;
    readonly title: string;
    readonly error: string | undefined;
    readonly link: string | undefined;
}

@Injectable()
export class RefSearchService {
    private static readonly refSearchBackendURL: string = 'https://vdjdb.cdr3.net/refsearch/';
    private static readonly isAliveInterval: number = 15000;
    private static readonly isAliveRequest = interval(RefSearchService.isAliveInterval).pipe(
        startWith(RefSearchBackendStates.UNDEFINED),
        mergeMap((_) => from(Utils.HTTP.get(RefSearchService.refSearchBackendURL)).pipe(
            map((response) => response.status === Utils.HTTP.SUCCESS_STATUS ? RefSearchBackendStates.ALIVE : RefSearchBackendStates.UNREACHABLE),
            catchError((_, __) => of(RefSearchBackendStates.UNREACHABLE))
        )),
        catchError((_, __) => of(RefSearchBackendStates.UNREACHABLE))
    )

    private static readonly prefetchIntervalDelay: number = 15;
    private static readonly referenceMetadataMap: Map<string | number, ReplaySubject<IArticleMetadata | undefined>> = new Map();
    private static readonly referenceFetchingEvents: Subject<RefSearchBackendPrefetchEvent> = new Subject();

    private static readonly queryMaxRows: number = 10;
    private isQueryLoading: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
    private queryError: ReplaySubject<string | undefined> = new ReplaySubject<string>(1);
    private queryResults: ReplaySubject<RefSearchTableRow[] | undefined> = new ReplaySubject(1);

    private filterCDR3: ReplaySubject<SetEntry[]> = new ReplaySubject<SetEntry[]>(1);
    private filterEpitope: ReplaySubject<SetEntry[]> = new ReplaySubject<SetEntry[]>(1);
    private filterExtraSearchByAntigen: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
    private filterExtraFilterStopWords: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
    private filterSpeciesToSearch: ReplaySubject<SetEntry[]> = new ReplaySubject<SetEntry[]>(1);

    constructor(private logger: LoggerService) {
        this.isQueryLoading.next(false);
        this.reset()
        this.queryResults.subscribe((results) => {
            if (results != undefined) {
                zip(interval(RefSearchService.prefetchIntervalDelay), from(results)).subscribe(([ _, result ]) => {
                    this.logger.info(`Prefetching article metadata`, result.pmid)
                    this.prefetchArticleMetadata(result.pmid)
                })
            }
        })
    }

    public updateCDR3(cdr3: SetEntry[]): void {
        this.filterCDR3.next(cdr3);
    }

    public updateEpitope(epitope: SetEntry[]): void {
        this.filterEpitope.next(epitope);
    }

    public updateExtraSearchByAntigen(flag: boolean): void {
        this.filterExtraSearchByAntigen.next(flag);
    }

    public updateExtraFilterStopWords(flag: boolean): void {
        this.filterExtraFilterStopWords.next(flag);
    }

    public updateSpecies(species: SetEntry[]): void {
        this.filterSpeciesToSearch.next(species);
    }

    public search(): void {
        this.isQueryLoading.next(true);
        this.queryError.next(undefined);

        combineLatest(this.filterCDR3, this.filterEpitope, this.filterExtraSearchByAntigen, this.filterExtraFilterStopWords, this.filterSpeciesToSearch).pipe(
            take(1),
            map(([ cdr3, epitope, searchByAntigen, filterStopWords, species ]) => { 
                let extra_parameters = [];

                if (searchByAntigen) {
                    extra_parameters.push('search_by_antigen');
                }

                if (filterStopWords) {
                    extra_parameters.push('filter_stop_words');
                }

                let speciesToSearch = species.map((entry) => entry.value).join(' ')

                if (speciesToSearch.length == 0) {
                    speciesToSearch = "HomoSapiens MusMusculus MacacaMulatta";
                }

                return { 
                    'cdr3': cdr3.map((entry) => entry.value).join(' '),
                    'antigen.epitope': epitope.map((entry) => entry.value).join(' '),
                    'extra_parameters': extra_parameters.join(' '),
                    'species_to_search': speciesToSearch
                }
            })
        ).subscribe((filters) => {
            Utils.HTTP.post(RefSearchService.refSearchBackendURL, filters).then((response) => {
                try {
                    this.queryResults.next((JSON.parse(response.response) as any[]).slice(0, RefSearchService.queryMaxRows).map((row: any) => new RefSearchTableRow(row)))
                } catch (error) {
                    this.queryError.next(error)
                } 
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
        this.filterCDR3.next([]);
        this.filterEpitope.next([]);
        this.filterExtraSearchByAntigen.next(false);
        this.filterExtraFilterStopWords.next(false);
        this.filterSpeciesToSearch.next([]);
    }

    public getCDR3Filter(): Observable<SetEntry[]> {
        return this.filterCDR3;
    }

    public getEpitopeFilter(): Observable<SetEntry[]> {
        return this.filterEpitope;
    }

    public getExtraSearchByAntigenFilter(): Observable<boolean> {
        return this.filterExtraSearchByAntigen;
    }

    public getExtraFilterStopWordsFilter(): Observable<boolean> {
        return this.filterExtraFilterStopWords;
    }

    public getSpeciesToSearchFilter(): Observable<SetEntry[]> {
        return this.filterSpeciesToSearch;
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

    public getPrefetchEvents(): Observable<RefSearchBackendPrefetchEvent> {
        return RefSearchService.referenceFetchingEvents;
    }

    public getArticleMetadata(id: string | number): ReplaySubject<IArticleMetadata | undefined> {
        if (RefSearchService.referenceMetadataMap.has(id)) {
            return RefSearchService.referenceMetadataMap.get(id);
        } else {
            const metadata = new ReplaySubject<IArticleMetadata | undefined>(1);
            metadata.next(undefined);
            RefSearchService.referenceMetadataMap.set(id, metadata);
            return metadata;
        }
    }

    public prefetchArticleMetadata(id: string | number): void {
        const metadata = this.getArticleMetadata(id);
        metadata.pipe(take(1)).subscribe((cachedmeta) => {
            // We do not fetch metadata again if we have saved cache
            if (cachedmeta == undefined) {
                RefSearchService.referenceFetchingEvents.next(RefSearchBackendPrefetchEvents.INITIATED)
                if (typeof id === "number" || (typeof id === "string" && id.startsWith("PMID:"))) {
                    const pmid = (typeof id === "string" && id.startsWith("PMID:")) ? id.replace("PMID:", "") : id;
        
                    // By default there is no metadata available
                    const metadata = new ReplaySubject<IArticleMetadata | undefined>(1);
                    metadata.next(undefined);
        
                    const promise = new Promise<IArticleMetadata>((resolve, reject) => {
                        const fetchPMIDMetaAPI = `${RefSearchService.refSearchBackendURL}/articles`;
                        const response = Utils.HTTP.post(fetchPMIDMetaAPI, { pmid: pmid });
        
                        response.then((r) => {
                            const result = JSON.parse(r.responseText) as IArticleMetadata;
                            const imetadata = { ...result, link: `http://www.ncbi.nlm.nih.gov/pubmed/?term=${pmid}` };
                            resolve(imetadata);
                        }).catch(reject);
                    });
        
                    promise.then((imetadata) => {
                        this.logger.info(`Fetched metadata info for ${id}`, imetadata)
                        metadata.next(imetadata)
                    }).catch((err) => {
                        this.logger.error(`Error metadata for ${id}`, err)
                        metadata.next({ error: err.responseText, link: undefined } as IArticleMetadata)
                    }).finally(() => {
                        RefSearchService.referenceFetchingEvents.next(RefSearchBackendPrefetchEvents.FINISHED)
                    })
        
                    RefSearchService.referenceMetadataMap.set(id, metadata)
                } else {
                    metadata.next({ title: id, error: 'No metadata available.', link: id } as IArticleMetadata)
                }
            }
        })
      }
}
