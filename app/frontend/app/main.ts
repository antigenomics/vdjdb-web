import 'reflect-metadata';
import 'core-js';
import 'zone.js';
import 'jquery';
import 'semantic-ui';
import 'semantic-ui-types';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';

import { AppModule } from "./app.module";

declare let buildMode: string;
if (buildMode == 'production') {
    enableProdMode();
}

export class Configuration {
    static buildMode: string = buildMode;
    static websocketProtocol: string = 'ws://';
    static websocketLocation: string = location.host;
    static websocketPrefix: string = Configuration.websocketProtocol + Configuration.websocketLocation;

    static isDevMode() : boolean {
        return Configuration.buildMode === 'development';
    }

    static isProdMode() : boolean {
        return Configuration.buildMode === 'production';
    }
}

platformBrowserDynamic().bootstrapModule(AppModule).then(() => console.log('Application loaded (' + buildMode + ')'));