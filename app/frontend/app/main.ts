import 'reflect-metadata';
import 'core-js';
import 'zone.js';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';

import { AppModule } from "./app.module";

declare let buildMode: string;
if (buildMode == 'production') {
    enableProdMode();
}
platformBrowserDynamic().bootstrapModule(AppModule).then(() => console.log('Application loaded (' + buildMode + ')'));