import 'reflect-metadata';
import 'core-js';
import 'zone.js';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';

import { ApplicationModule } from "./application.module";

export declare let buildMode: string;
if (buildMode == 'production') {
    enableProdMode();
}

platformBrowserDynamic().bootstrapModule(ApplicationModule).then(() => console.log('Application loaded (' + buildMode + ')'));