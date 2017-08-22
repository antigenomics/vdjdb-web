import { Injectable } from '@angular/core';
import { DatabaseMetadata } from "./database-metadata";
import { Configuration } from "../main";
import { Observable } from "rxjs/Observable";
import { ReplaySubject } from "rxjs/ReplaySubject";
import { LoggerService } from "../utils/log.service";


@Injectable()
export class DatabaseService {
    private connection: WebSocket;
    private metadata: ReplaySubject<DatabaseMetadata>;

    constructor(private logger: LoggerService) {
        this.metadata = new ReplaySubject(1);
        this.metadata.subscribe((value: DatabaseMetadata) => {
            logger.log('DatabaseMetadata received from WebSocket connection');
            logger.devLog(value);
        });

        this.connection = new WebSocket(Configuration.websocketPrefix + '/api/database/connect');
        this.connection.onopen = () => {
            this.connection.send(JSON.stringify('Hello!'));
        };
        this.connection.onmessage = (message: MessageEvent) => {
            let meta: DatabaseMetadata = DatabaseMetadata.deserialize(JSON.parse(message.data));
            this.metadata.next(meta);
        };
    }

    getMetadata(): Observable<DatabaseMetadata> {
        return this.metadata;
    }
}