/*
 *     Copyright 2017-2019 Bagaev Dmitry
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
 */

import { Injectable } from '@angular/core';
import { LoggerService } from 'utils/logger/logger.service';
import { Utils } from 'utils/utils';

@Injectable()
export class OverviewService {
  private static readonly _rejectedMessage: string = 'Security issue, please try again later';
  private static readonly _failedMessage: string = 'Failed to download overview, please try again later';

  private _rejected: boolean = false;
  private _overviewContent: string;

  constructor(private logger: LoggerService) {}

  public getOverviewContent(): Promise<string> {
    return new Promise<string>((resolve) => {
      if (this._rejected) {
        resolve(OverviewService._rejectedMessage);
      } else if (this._overviewContent) {
        resolve(this._overviewContent);
      } else {
        this.logger.debug('Overview service', 'downloading..');
        Utils.HTTP.get('/api/database/summary').then((request: XMLHttpRequest) => {
          const text = request.responseText;
          if (text.indexOf('script') !== -1) {
            this._rejected = true;
            resolve(OverviewService._rejectedMessage);
            this.logger.debug('Overview service: WARNING', 'rejected');
          } else {
            this._overviewContent = request.responseText;
            this.logger.debug('Overview service', 'downloaded successfully');
            resolve(this._overviewContent);
          }
        }).catch(() => {
          this.logger.warn('Overview service', 'failed');
          resolve(OverviewService._failedMessage);
        });
      }
    });
  }
}
