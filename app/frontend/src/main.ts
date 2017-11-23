import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { ApplicationModule } from './app/application.module';
import { LoggerService } from './app/utils/logger/logger.service';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

const logger = new LoggerService();
platformBrowserDynamic().bootstrapModule(ApplicationModule, { preserveWhitespaces: false })
    .then(() => {
        const mode = environment.production ? 'production' : 'development';
        logger.info('Application loaded',  `(${mode})`);
    })
    .catch((error) => {
        logger.error('Bootstrap error', error);
    });
