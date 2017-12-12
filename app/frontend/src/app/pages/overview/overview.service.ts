/*
 *     Copyright 2017 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { LoggerService } from '../../utils/logger/logger.service';
import { Utils } from '../../utils/utils';

@Injectable()
export class OverviewService {
    private _rejected: boolean = false;
    private _overviewContent: string;

    constructor(private logger: LoggerService) {}

    public getSummaryContent(): Observable<string> {
        if (this._rejected) {
            return Observable.create((observer: Observer<string>) => {
                observer.next('');
                observer.complete();
            });
        }
        if (this._overviewContent) {
            return Observable.create((observer: Observer<string>) => {
                observer.next(this._overviewContent);
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
                        this._overviewContent = request.responseText;
                        observer.next(request.responseText);
                    }
                    observer.complete();
                });
            });
        }
    }
}
