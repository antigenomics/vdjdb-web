import { Injectable } from '@angular/core';

declare let buildMode: string;

@Injectable()
export class ConfigurationService {
    private _buildMode: string;
    private _websocketProtocol: string;
    private _websocketLocation: string;
    private _websocketPrefix: string;

    constructor() {
        this._buildMode = buildMode;
        this._websocketProtocol = 'ws://';
        this._websocketLocation = location.host;
        this._websocketPrefix = this._websocketProtocol + this._websocketLocation;
    }

    public isDevelopmentMode(): boolean {
        return this._buildMode === 'development';
    }

    public isProductionMode(): boolean {
        return this._buildMode === 'production';
    }

    get buildMode(): string {
        return this._buildMode;
    }

    get websocketProtocol(): string {
        return this._websocketProtocol;
    }

    get websocketLocation(): string {
        return this._websocketLocation;
    }

    get websocketPrefix(): string {
        return this._websocketPrefix;
    }
}
