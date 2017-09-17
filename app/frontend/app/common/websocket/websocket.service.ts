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

export const enum WebsocketResponseStatus {
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

    private _connectionTimeoutEvent: number = -1;
    private _connection: WebSocket;
    private _messages: Subject<any> = new Subject();

    constructor(private configuration: ConfigurationService, private logger: LoggerService) {
    }

    public connect(url: string): void {
        if (this._connection) {
            return;
        }
        this._connection = new WebSocket(this.configuration.websocketPrefix + url);

        this._connection.onerror = (error: any) => {
            this.logger.debug('Websocket service', `Error: ${error}`);
        };

        this._connection.onmessage = (message: any) => {
            this._messages.next(JSON.parse(message.data));
        };

        this._connectionTimeoutEvent = window.setTimeout(() => {
            this._connection.send(JSON.stringify({ action: 'ping' }));
        }, WebSocketService.pingConnectionTimeout);
    }

    public onOpen(callback: () => void): void {
        this._connection.onopen = callback;
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
        this._connection.close();
        this._connection = undefined;
    }
}
