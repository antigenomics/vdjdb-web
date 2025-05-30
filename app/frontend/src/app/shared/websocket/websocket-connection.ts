/*
 *     Copyright 2017-2019 Bagaev Dmitry
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

import { environment } from 'environments/environment';
import { Observable, Subject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { LoggerService } from 'utils/logger/logger.service';
import { Utils } from 'utils/utils';
import { IWebSocketRequestData } from './websocket-request';
import { IWebSocketResponseData, WebSocketResponseData } from './websocket-response';

export type WebSocketResponseStatus = string;

export namespace WebSocketResponseStatus {
  export const SUCCESS: string = 'success';
  export const WARNING: string = 'warning';
  export const ERROR: string = 'error';
}

export type WebSocketConnectionStatus = number;

export namespace WebSocketConnectionStatus {
  export const UNDEFINED: number = 0;
  export const CONNECTING: number = 1;
  export const CONNECTED: number = 2;
  export const CLOSED: number = 3;
}

export class WebSocketRequestMessage {
  public id?: number;
  public action?: string;
  public data?: IWebSocketRequestData;
}

export class WebSocketConnection {
  private static pingConnectionTimeout: number = 30000;
  private static maxReconnectAttempts: number = 15;

  private _uniqueMessageID: number = 0;
  private _currentReconnectAttempt: number = 0;
  private _lastConnectedUrl: string;
  private _connectionTimeoutEvent: number = -1;
  private _connection: WebSocket;
  private _connectionStatus: WebSocketConnectionStatus = WebSocketConnectionStatus.UNDEFINED;
  private _messages: Subject<IWebSocketResponseData> = new Subject();

  // Callbacks
  private _onOpenCallback: (event: Event) => void;
  private _onErrorCallback: (event: Event) => void;
  private _onCloseCallback: (event: CloseEvent) => void;

  constructor(private logger: LoggerService, private enableReconnect?: boolean) {}

  public isDisconnected(): boolean {
    return this._connectionStatus === WebSocketConnectionStatus.CLOSED;
  }

  public isConnected(): boolean {
    return this._connectionStatus === WebSocketConnectionStatus.CONNECTED;
  }

  public connect(url: string): void {
    if (this._connection) {
      if (this._lastConnectedUrl !== url) {
        this.logger.debug('WebSocketConnection WARNING!: attempt to reconnect', `Last connected url: ${this._lastConnectedUrl}, Attempt: ${url}`);
      }
      return;
    }

    this._currentReconnectAttempt = 0;
    this._lastConnectedUrl = WebSocketConnection.getWebSocketPrefix() + url;
    this._connectionStatus = WebSocketConnectionStatus.CONNECTING;
    this._connection = new WebSocket(this._lastConnectedUrl);

    this.bindConnectionEvents();
  }

  public reconnect(): boolean {
    this._currentReconnectAttempt += 1;
    if (this._currentReconnectAttempt < WebSocketConnection.maxReconnectAttempts) {
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

  public getMessages(): Observable<WebSocketResponseData> {
    return this._messages.pipe(map((response: IWebSocketResponseData) => {
      return new WebSocketResponseData(response);
    }));
  }

  public async sendMessage(message: WebSocketRequestMessage): Promise<WebSocketResponseData> {
    message.id = this._uniqueMessageID++;
    return new Promise<WebSocketResponseData>(async (resolve) => {
      this._messages.pipe(filter((response: IWebSocketResponseData) => {
        return (message.action === response.action) && (message.id === response.id);
      }), take(1)).subscribe((response: IWebSocketResponseData) => {
        resolve(new WebSocketResponseData(response));
      });
      const success = await this.send(message);
      if (!success) {
        resolve(new WebSocketResponseData({ status: 'error' }));
      }
    });
  }

  public subscribeMessages(message: WebSocketRequestMessage, observerCallback: (o: Observable<WebSocketResponseData>) => void): void {
    message.id = this._uniqueMessageID++;
    const stream = this._messages.pipe(filter((response: IWebSocketResponseData) => {
      return (message.action === response.action) && (message.id === response.id);
    }), map((response: IWebSocketResponseData) => {
      return new WebSocketResponseData(response);
    }));
    observerCallback(stream);
    this.send(message);
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

  private send(message: WebSocketRequestMessage): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isDisconnected() && this.enableReconnect) {
        this.onOpen(() => {
          this._connection.send(JSON.stringify(message));
        });
        resolve(this.reconnect());
      } else if (this.isConnected()) {
        this._connection.send(JSON.stringify(message));
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  private bindConnectionEvents(): void {
    this._connection.onopen = (event: Event) => {
      this._connectionStatus = WebSocketConnectionStatus.CONNECTED;
      this.logger.debug('WebSocket service open: ', this._lastConnectedUrl);
      if (this._onOpenCallback) {
        this._onOpenCallback(event);
      }
    };

    this._connection.onerror = (event: Event) => {
      this.logger.error('WebSocket service error:', event);
      if (this._onErrorCallback) {
        this._onErrorCallback(event);
      }
    };

    this._connection.onclose = (event: CloseEvent) => {
      this._connectionStatus = WebSocketConnectionStatus.CLOSED;
      this.logger.error('WebSocket service close:', event);
      if (this._onCloseCallback) {
        this._onCloseCallback(event);
      }
    };

    this._connection.onmessage = (message: MessageEvent) => {
      this.logger.debug('Message received', `(size: ${Utils.Memory.formattedMemorySizeOf(message.data)})`);
      this._messages.next(JSON.parse(message.data));
    };

    if (this._connectionTimeoutEvent) {
      window.clearTimeout(this._connectionTimeoutEvent);
    }
    this._connectionTimeoutEvent = window.setInterval(() => {
      this.logger.debug('WebSocket service', 'ping');
      // noinspection JSIgnoredPromiseFromCall
      this.sendMessage({
        action: 'ping'
      });
    }, WebSocketConnection.pingConnectionTimeout);

    if (!environment.production) {
      this._messages.subscribe((message: any) => {
        if (message.status === WebSocketResponseStatus.ERROR) {
          this.logger.debug('WebSocket error message: ', message);
        }
      });
    }
  }

  private static getWebSocketProtocol(): string {
    if (location.protocol === 'https:') {
      return 'wss://';
    } else {
      return 'ws://';
    }
  }

  private static getWebSocketLocation(): string {
    return location.host;
  }

  private static getWebSocketPrefix(): string {
    return WebSocketConnection.getWebSocketProtocol() + WebSocketConnection.getWebSocketLocation();
  }
}
