/*
 *     Copyright 2017 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

import { ConfigurationService } from '../../../app/frontend/app/configuration.service';
import {} from '../../../app/frontend/node_modules/@types/jasmine';

describe('Configuration service', () => {

    it('should be able to enable production mode', () => {
        expect(ConfigurationService.buildMode()).toBe('development');
        expect(ConfigurationService.isProductionMode()).toBe(false);
        expect(ConfigurationService.isDevelopmentMode()).toBe(true);
        ConfigurationService.enableProductionMode();
        expect(ConfigurationService.buildMode()).toBe('production');
        expect(ConfigurationService.isProductionMode()).toBe(true);
        expect(ConfigurationService.isDevelopmentMode()).toBe(false);
    });

});
