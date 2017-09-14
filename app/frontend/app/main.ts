import 'core-js';
import 'reflect-metadata';
import 'zone.js';

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { ApplicationModule } from './application.module';
import { ConfigurationService } from './configuration.service';

const configuration = new ConfigurationService();
if (configuration.isProductionMode()) {
    enableProdMode();
}

platformBrowserDynamic().bootstrapModule(ApplicationModule).then(() => console.log(`Application loaded (${configuration.buildMode})`));
