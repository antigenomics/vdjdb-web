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

import { enableProdMode } from '@angular/core';
import { platformBrowser } from '@angular/platform-browser';

// Please do not touch this import. It will be resolved during compilation stage.
import { ApplicationModuleNgFactory } from './build/app/application.module.ngfactory';
import { ConfigurationService } from './configuration.service';
import { LoggerService } from './utils/logger/logger.service';

enableProdMode();
ConfigurationService.enableProductionMode();
const logger = new LoggerService();
platformBrowser().bootstrapModuleFactory(ApplicationModuleNgFactory)
                 .then(() => logger.info(`Application loaded`, ConfigurationService.buildMode()));
