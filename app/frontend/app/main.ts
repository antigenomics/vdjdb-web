import 'core-js';
import 'reflect-metadata';
import 'zone.js';

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { ApplicationModule } from './application.module';
import { ConfigurationService } from './configuration.service';
import { LoggerService } from './utils/logger/logger.service';

if (ConfigurationService.isProductionMode()) {
    enableProdMode();
}
const logger = new LoggerService();
platformBrowserDynamic().bootstrapModule(ApplicationModule).then(() => logger.info(`Application loaded (${ConfigurationService.buildMode})`, ''));
