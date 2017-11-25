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

import 'core-js';
import 'reflect-metadata';
import 'zone.js';

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { ApplicationModule } from './app/application.module';
import { LoggerService } from './app/utils/logger/logger.service';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

const logger = new LoggerService();
platformBrowserDynamic().bootstrapModule(ApplicationModule, { preserveWhitespaces: false })
                        .then(() => {
                            const mode = environment.production ? 'production' : 'development';
                            logger.info('Application loaded',  `(${mode})`);
                        })
                        .catch((error) => {
                            logger.error('Bootstrap error', error);
                        });
