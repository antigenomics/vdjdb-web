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
