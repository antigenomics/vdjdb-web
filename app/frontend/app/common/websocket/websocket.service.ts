import { Injectable } from '@angular/core';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/share';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { Subject } from 'rxjs/Subject';
import { ConfigurationService } from '../../configuration.service';
import { LoggerService } from '../../utils/logger/logger.service';

export const enum WebSocketResponseStatus {
    Success = 'success',
    Warning = 'warning',
    Error   = 'error'
}

export class WebSocketRequestMessage {
    public action?: string;
    public data?: any;
}

@Injectable()
export class WebSocketService {
    private static pingConnectionTimeout: number = 10000;
    private static maxReconnectAttemps: number = 5;

    private _currentReconnectAttempt: number = 0;
    private _lastConnectedUrl: string;
    private _connectionTimeoutEvent: number = -1;
    private _connection: WebSocket;
    private _messages: Subject<any> = new Subject();

    // Callbacks
    private _onOpenCallback: (event: Event) => void;
    private _onErrorCallback: (event: Event) => void;
    private _onCloseCallback: (event: CloseEvent) => void;

    constructor(private configuration: ConfigurationService, private logger: LoggerService) {}

    public connect(url: string): void {
        if (this._connection) {
            return;
        }

        this._currentReconnectAttempt = 0;
        this._lastConnectedUrl = this.configuration.websocketPrefix + url;
        this._connection = new WebSocket(this._lastConnectedUrl);

        this.bindConnectionEvents();
    }

    public reconnect(): boolean {
        this._currentReconnectAttempt += 1;
        if (this._currentReconnectAttempt < WebSocketService.maxReconnectAttemps) {
            this.disconnect();
            this._connection = new WebSocket(this._lastConnectedUrl);
            this.bindConnectionEvents();
            return true;
        } else {
            this._onOpenCallback = undefined;
            this._onCloseCallback = undefined;
            this._onErrorCallback = undefined;
            return false;
        }
    }

    public onOpen(callback: (event: Event) => void): void {
        this._onOpenCallback = callback;
    }

    public onError(callback: (event: Event) => void): void {
        this._onCloseCallback = callback;
    }

    public onClose(callback: (event: CloseEvent) => void): void {
        this._onCloseCallback = callback;
    }

    public sendMessage(message: WebSocketRequestMessage): Observable<any> {
        return Observable.create((observer: Observer<any>) => {
            this._messages
                .filter((response: any) => {
                    return response.action === message.action;
                })
                .first()
                .subscribe((response: any) => {
                    observer.next(response);
                    observer.complete();
                });
            this._connection.send(JSON.stringify(message));
        });
    }

    public disconnect(): void {
        if (this._connection) {
            this._connection.close();
        }
        if (this._connectionTimeoutEvent) {
            window.clearTimeout(this._connectionTimeoutEvent);
        }
        this._connection = undefined;
    }

    private bindConnectionEvents(): void {
        this._connection.onopen = (event: Event) => {
            this.logger.debug('WebSocket service open: ', this._lastConnectedUrl);
            if (this._onOpenCallback) {
                this._onOpenCallback(event);
            }
        };

        this._connection.onerror = (error: Event) => {
            this.logger.debug('WebSocket service error:', error);
            if (this._onErrorCallback) {
                this._onErrorCallback(event);
            }
        };

        this._connection.onclose = (event: CloseEvent) => {
            this.logger.debug('WebSocket service close:', event);
            if (this._onCloseCallback) {
                this._onCloseCallback(event);
            }
        };

        this._connection.onmessage = (message: any) => {
            this._messages.next(JSON.parse(message.data));
        };

        if (this._connectionTimeoutEvent) {
            window.clearTimeout(this._connectionTimeoutEvent);
        }
        this._connectionTimeoutEvent = window.setTimeout(() => {
            this._connection.send(JSON.stringify({ action: 'ping' }));
        }, WebSocketService.pingConnectionTimeout);

        if (this.configuration.isDevelopmentMode()) {
            this._messages.subscribe((message: any) => {
                if (message.status === WebSocketResponseStatus.Error) {
                    this.logger.debug('WebSocket error message: ', message);
                }
            });
        }
    }
}
