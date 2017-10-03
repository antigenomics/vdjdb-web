declare let buildMode: string;

export class ConfigurationService {
    public static get buildMode(): string { return buildMode; }
    public static get webSocketProtocol(): string { return 'ws://'; }
    public static get webSocketLocation(): string { return location.host; }
    public static get webSocketPrefix(): string { return ConfigurationService.webSocketProtocol + ConfigurationService.webSocketLocation; }

    public static isDevelopmentMode(): boolean {
        return this.buildMode === 'development';
    }

    public static isProductionMode(): boolean {
        return this.buildMode === 'production';
    }
}
