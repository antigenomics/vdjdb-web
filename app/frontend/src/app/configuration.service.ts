/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

export class ConfigurationService {
    private static _isProduction: boolean = false;

    public static enableProductionMode(): void {
        this._isProduction = true;
    }

    public static buildMode(): string {
        if (this._isProduction) {
            return 'production';
        } else {
            return 'development';
        }
    }

    public static webSocketProtocol(): string {
        if (location.protocol === 'https:') {
            return 'wss://';
        } else {
            return 'ws://';
        }
    }

    public static webSocketLocation(): string {
        return location.host;
    }

    public static webSocketPrefix(): string {
        return ConfigurationService.webSocketProtocol() + ConfigurationService.webSocketLocation();
    }

    public static isDevelopmentMode(): boolean {
        return this._isProduction === false;
    }

    public static isProductionMode(): boolean {
        return this._isProduction === true;
    }
}
