import { Injectable } from '@angular/core';

declare let buildMode: string;

@Injectable()
export class ConfigurationService {
    private _buildMode: string;
    private _webSocketProtocol: string;
    private _webSocketLocation: string;
    private _webSocketPrefix: string;

    constructor() {
        this._buildMode = buildMode;
        this._webSocketProtocol = 'ws://';
        this._webSocketLocation = location.host;
        this._webSocketPrefix = this._webSocketProtocol + this._webSocketLocation;
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

    get webSocketProtocol(): string {
        return this._webSocketProtocol;
    }

    get webSocketLocation(): string {
        return this._webSocketLocation;
    }

    get webSocketPrefix(): string {
        return this._webSocketPrefix;
    }
}
