import 'core-js';
import 'reflect-metadata';
import 'zone.js';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { ApplicationModule } from './application.module';
import { ConfigurationService } from './configuration.service';
import { LoggerService } from './utils/logger/logger.service';

const logger = new LoggerService();
platformBrowserDynamic().bootstrapModule(ApplicationModule)
                        .then(() => logger.info(`Application loaded`, ConfigurationService.buildMode()));
