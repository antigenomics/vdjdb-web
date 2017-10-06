import { enableProdMode } from '@angular/core';
import { platformBrowser } from '@angular/platform-browser';

import { ApplicationModuleNgFactory } from './build/app/application.module.ngfactory';
import { ConfigurationService } from './configuration.service';
import { LoggerService } from './utils/logger/logger.service';

if (ConfigurationService.isProductionMode()) {
    enableProdMode();
}
const logger = new LoggerService();
platformBrowser().bootstrapModuleFactory(ApplicationModuleNgFactory).then(() => logger.info(`Application loaded (${ConfigurationService.buildMode()})`, ''));
