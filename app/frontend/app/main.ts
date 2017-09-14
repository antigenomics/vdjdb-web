import 'reflect-metadata';
import 'core-js';
import 'zone.js';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';

import { ApplicationModule } from "./application.module";
import { ConfigurationService } from "./configuration.service";

let configuration = new ConfigurationService();
if (configuration.isProductionMode()) {
    enableProdMode();
}

platformBrowserDynamic().bootstrapModule(ApplicationModule).then(() => console.log('Application loaded (' + configuration.buildMode + ')'));