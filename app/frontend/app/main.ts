import 'core-js';
import 'reflect-metadata';
import 'zone.js';

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { ApplicationModule } from './application.module';
import { ConfigurationService } from './configuration.service';
import { LoggerService } from './utils/logger/logger.service';

const configuration = new ConfigurationService();
if (configuration.isProductionMode()) {
    enableProdMode();
}
const logger = new LoggerService(configuration);
platformBrowserDynamic().bootstrapModule(ApplicationModule).then(() => logger.info(`Application loaded (${configuration.buildMode})`, ''));
