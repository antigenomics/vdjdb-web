export class ConfigurationService {
    public static buildMode(): string { return 'production'; }

    public static webSocketProtocol(): string {
        if (location.protocol === 'https:') {
            return 'wss://';
        } else {
            return 'ws://';
        }
    }

    public static webSocketLocation(): string { return location.host; }

    public static webSocketPrefix(): string { return ConfigurationService.webSocketProtocol() + ConfigurationService.webSocketLocation(); }

    public static isDevelopmentMode(): boolean {
        return ConfigurationService.buildMode() === 'development';
    }

    public static isProductionMode(): boolean {
        return ConfigurationService.buildMode() === 'production';
    }
}
