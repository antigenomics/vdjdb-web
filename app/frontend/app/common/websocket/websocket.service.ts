import { Injectable } from '@angular/core';
// import { Observable, Observer, Subject } from 'rxjs/Rx';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { Subject } from 'rxjs/Subject';
// import { do } from 'rxjs/operator/do';
// import { filter } from 'rxjs/operator/filter';
// import { first } from 'rxjs/operator/first';
// import { share } from 'rxjs/operator/share';
// import 'rxjs/Rx'
import { ConfigurationService } from '../../configuration.service';
import { LoggerService } from '../../utils/logger/logger.service';

export namespace WebSocketResponseStatus {
    export const Success:string = 'success';
    export const Warning:string = 'warning';
    export const Error:string   = 'error';
}

export class WebSocketRequestMessage {
    public action?: string;
    public data?: any;
}

@Injectable()
export class WebSocketService {
    private static pingConnectionTimeout: number = 15000;
    private static maxReconnectAttempts: number = 5;

    private _currentReconnectAttempt: number = 0;
    private _lastConnectedUrl: string;
    private _connectionTimeoutEvent: number = -1;
    private _connection: WebSocket;
    private _messages: Subject<any> = new Subject();

    // Callbacks
    private _onOpenCallback: (event: Event) => void;
    private _onErrorCallback: (event: Event) => void;
    private _onCloseCallback: (event: CloseEvent) => void;

    constructor(private logger: LoggerService) {}

    public connect(url: string): void {
        if (this._connection) {
            return;
        }

        this._currentReconnectAttempt = 0;
        this._lastConnectedUrl = ConfigurationService.webSocketPrefix + url;
        this._connection = new WebSocket(this._lastConnectedUrl);

        this.bindConnectionEvents();
    }

    public reconnect(): boolean {
        this._currentReconnectAttempt += 1;
        if (this._currentReconnectAttempt < WebSocketService.maxReconnectAttempts) {
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
                //.filter((response: any) => {
                //    return response.action === message.action;
                //})
                //.first()
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
            window.clearInterval(this._connectionTimeoutEvent);
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
            this.logger.error('WebSocket service error:', error);
            if (this._onErrorCallback) {
                this._onErrorCallback(event);
            }
        };

        this._connection.onclose = (event: CloseEvent) => {
            this.logger.error('WebSocket service close:', event);
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
        this._connectionTimeoutEvent = window.setInterval(() => {
            this.logger.debug('WebSocket service', 'ping');
            this._connection.send(JSON.stringify({ action: 'ping' }));
        }, WebSocketService.pingConnectionTimeout);

        if (ConfigurationService.isDevelopmentMode()) {
            this._messages.subscribe((message: any) => {
                if (message.status === WebSocketResponseStatus.Error) {
                    this.logger.debug('WebSocket error message: ', message);
                }
            });
        }
    }
}
