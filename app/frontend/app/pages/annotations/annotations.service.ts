/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { User } from '../../shared/user/user';
import { WebSocketService } from '../../shared/websocket/websocket.service';
import { LoggerService } from '../../utils/logger/logger.service';

export type AnnotationsServiceEvents = number;

export namespace AnnotationsServiceEvents {
    export const INITIALIZED: number = 0;
}

export type AnnotationsServiceWebSocketActions = string;

export namespace AnnotationsServiceWebSocketActions {
    export const USER_DETAILS: string = 'details';
}

@Injectable()
export class AnnotationsService {
    private _events: Subject<AnnotationsServiceEvents> = new Subject();
    private _initialized: boolean = false;
    private _user: User;

    constructor(private connection: WebSocketService, private logger: LoggerService) {
        this.connection.onOpen(async () => {
            const userDetailsRequest = this.connection.sendMessage({
                action: AnnotationsServiceWebSocketActions.USER_DETAILS
            });

            const userDetailsResponse = await userDetailsRequest;
            this._user = User.deserialize(userDetailsResponse.get('details'));
            this.logger.debug('AnnotationsService: user', this._user);

            this._initialized = true;
            this._events.next(AnnotationsServiceEvents.INITIALIZED);
        });
        this.connection.connect('/api/annotations/connect');
    }

    public isInitialized(): boolean {
        return this._initialized;
    }

    public getEvents(): Subject<AnnotationsServiceEvents> {
        return this._events;
    }
}
