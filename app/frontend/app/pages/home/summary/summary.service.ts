import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { LoggerService } from '../../../utils/logger/logger.service';
import { Utils } from '../../../utils/utils';

@Injectable()
export class SummaryService {
    private _rejected: boolean = false;
    private _summaryContent: string;

    constructor(private logger: LoggerService) {}

    public getSummaryContent(): Observable<string> {
        if (this._rejected) {
            return Observable.create((observer: Observer<string>) => {
                observer.next('');
                observer.complete();
            });
        }
        if (this._summaryContent) {
            return Observable.create((observer: Observer<string>) => {
                observer.next(this._summaryContent);
                observer.complete();
            });
        } else {
            return Observable.create((observer: Observer<string>) => {
                this.logger.debug('Summary service', 'downloaded');
                Utils.HTTP.get('/api/database/summary').subscribe((request: XMLHttpRequest) => {
                    const text = request.responseText;
                    if (text.indexOf('script') !== -1) {
                        this._rejected = true;
                        observer.next('');
                    } else {
                        this._summaryContent = request.responseText;
                        observer.next(request.responseText);
                    }
                    observer.complete();
                });
            });
        }
    }
}
