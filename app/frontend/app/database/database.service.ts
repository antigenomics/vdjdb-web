import { Injectable } from '@angular/core';
import { DatabaseMetadata } from './database-metadata';
import { Configuration } from '../main';
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { LoggerService } from '../utils/logger/logger.service';
import { Subscription } from 'rxjs/Subscription';
import { WebSocketSubject } from 'rxjs/observable/dom/WebSocketSubject';
import { Subject } from 'rxjs/Subject';
import { Filter } from '../common/filters/filters';
import { LoggerErrorMessage, LoggerErrorNotificationMessage, LoggerInfoDebugMessage } from "../utils/logger/logger-messages";

export const enum DatabaseServiceActions {
    MetadataAction   = 'meta',
    ColumnInfoAction = 'columnInfo',
    SearchAction     = 'search',
    MessageAction    = 'message'
}

export const enum DatabaseServiceResponseStatusType {
    Success = 'success',
    Warning = 'warning',
    Error   = 'error'
}

export class DatabaseServiceRequestMessage {
    action?: string;
    data?: any;
}

@Injectable()
export class DatabaseService {
    private connection: WebSocketSubject<Object>;
    private subscription: Subscription;
    private messages: Subject<any> = new Subject();
    private metadata: ReplaySubject<DatabaseMetadata> = new ReplaySubject(1);

    constructor(private logger: LoggerService) {
        this.connection = WebSocketSubject.create(Configuration.websocketPrefix + '/api/database/connect');
        this.subscription = this.connection.subscribe({
            next: (message: any) => {
                let status = message.status;
                let action = message.action;
                switch (action) {
                    case DatabaseServiceActions.MetadataAction:
                        if (status === DatabaseServiceResponseStatusType.Success) {
                            this.metadata.next(DatabaseMetadata.deserialize(message.metadata))
                        } else {
                            this.logger.log(new LoggerErrorNotificationMessage('Bad metadata response', 'Database service'))
                        }
                        break;
                    case DatabaseServiceActions.SearchAction:
                        this.messages.next(message);
                        logger.log(new LoggerInfoDebugMessage(message, 'Search'));
                        break;
                    case DatabaseServiceActions.MessageAction:
                        if (message.message !== 'pong') {
                            logger.log(new LoggerInfoDebugMessage(message, 'Message'));
                        }
                        break;
                    default:
                        logger.log(new LoggerErrorMessage('Unknown action in websocket: ' + action))
                }
            }
        });
        this.sendMessage({ action: DatabaseServiceActions.MetadataAction });
        setInterval(() => {
            this.sendMessage({ action: 'ping' });
        }, 10000);
    }

    filter(filters: Filter[]) {
        this.sendMessage({
            action: DatabaseServiceActions.SearchAction,
            data: {
                filters: filters
            }
        });
    }

    sendMessage(message: DatabaseServiceRequestMessage) {
        this.connection.next(JSON.stringify(message));
    }

    getMetadata(): Observable<DatabaseMetadata> {
        return this.metadata;
    }
}