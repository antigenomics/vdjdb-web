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
