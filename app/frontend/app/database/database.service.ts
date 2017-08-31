import { Injectable } from '@angular/core';
import { DatabaseMetadata } from './database-metadata';
import { Configuration } from '../main';
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { LoggerService } from '../utils/logger/logger.service';
import { LoggerErrorMessage, LoggerInfoDebugMessage } from '../utils/logger/logger-messages';
import { Subscription } from 'rxjs/Subscription';
import { WebSocketSubject } from 'rxjs/observable/dom/WebSocketSubject';
import { Subject } from 'rxjs/Subject';


export const enum DatabaseServiceResponseStatusType {
    ResponseSuccess = 'success',
    ResponseWarning = 'warning',
    ResponseError   = 'error'
}

export class DatabaseServiceRequestMessage {
    action: string;
    data: any;
}

export class DatabaseServiceResponseMessage {
    status: DatabaseServiceResponseStatusType;
    action: string;
    data: any;
}

@Injectable()
export class DatabaseService {
    private connection: WebSocketSubject<Object>;
    private subscription: Subscription;
    private messages: Subject<DatabaseServiceResponseMessage> = new Subject();
    private metadata: ReplaySubject<DatabaseMetadata> = new ReplaySubject(1);

    constructor(private logger: LoggerService) {
        this.connection = WebSocketSubject.create(Configuration.websocketPrefix + '/api/database/connect');
        this.subscription = this.connection.subscribe({
            next: (message: DatabaseServiceResponseMessage) => {
                let status = message.status;
                let action = message.action;
                let data = message.data;
                switch (action) {
                    case 'meta':
                        if (status === DatabaseServiceResponseStatusType.ResponseSuccess) {
                            this.metadata.next(DatabaseMetadata.deserialize(data))
                        }
                        break;
                }
            }
        });
        this.sendMessage({ action: 'meta', data: {} });
        setInterval(() => {
            this.sendMessage({ action: 'ping', data: {} });
        }, 10000);
    }

    sendMessage(message: DatabaseServiceRequestMessage) {
        this.connection.next(JSON.stringify(message));
    }

    getMetadata(): Observable<DatabaseMetadata> {
        return this.metadata;
    }
}