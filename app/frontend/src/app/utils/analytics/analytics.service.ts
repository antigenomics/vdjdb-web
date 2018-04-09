/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { Injectable } from '@angular/core';
import { YandexMetrikaTools } from 'utils/analytics/yandex.metrika';
import { LoggerService } from 'utils/logger/logger.service';

@Injectable()
export class AnalyticsService {
    private yandexMetrikaTools: YandexMetrikaTools;

    constructor(private logger: LoggerService) {
        window.addEventListener('analytics', () => {
            const w = window as any;
            if (w.analytics !== undefined && w.analytics.yandexID !== undefined) {
                this.logger.info('AnalyticsService', `Yandex metrika analytics tools has been found (id: ${w.analytics.yandexID})`);
                this.yandexMetrikaTools = new YandexMetrikaTools(w.analytics.yandexID);
            }
        });
    }

    public reachGoal(target: string): void {
        this.logger.debug('AnalyticsService', `Goal reached: ${target}`);
        if (this.yandexMetrikaTools) {
            this.yandexMetrikaTools.reachGoal(target);
        }
    }

    public hit(url: string): void {
        this.logger.debug('AnalyticsService', `Hit: ${url}`);
        if (this.yandexMetrikaTools) {
            this.yandexMetrikaTools.hit(url);
        }
    }

    public extLink(url: string): void {
        this.logger.debug('AnalyticsService', `External link: ${url}`);
        if (this.yandexMetrikaTools) {
            this.yandexMetrikaTools.extLink(url);
        }
    }

}
