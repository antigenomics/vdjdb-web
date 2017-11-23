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
import { SampleItem } from '../../shared/sample/sample-item';
import { User, UserPermissions } from '../../shared/user/user';
import { WebSocketRequestData } from '../../shared/websocket/websocket-request';
import { WebSocketService } from '../../shared/websocket/websocket.service';
import { LoggerService } from '../../utils/logger/logger.service';

export type AnnotationsServiceEvents = number;

export namespace AnnotationsServiceEvents {
    export const INITIALIZED: number = 0;
    export const SAMPLE_ADDED: number = 1;
    export const SAMPLE_DELETED: number = 2;
}

export namespace AnnotationsServiceWebSocketActions {
    export const USER_DETAILS: string = 'details';
    export const VALIDATE_SAMPLE: string = 'validate_sample';
    export const DELETE_SAMPLE: string = 'delete_sample';
}

@Injectable()
export class AnnotationsService {
    private _events: Subject<AnnotationsServiceEvents> = new Subject();
    private _initialized: boolean = false;
    private _user: User;

    private connection: WebSocketService;

    constructor(private logger: LoggerService) {
        this.connection = new WebSocketService(logger);
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

    public getSamples(): SampleItem[] {
        if (this._user === undefined) {
            return [];
        }
        return this._user.samples;
    }

    public getUserPermissions(): UserPermissions {
        return this._user.permissions;
    }

    public async addSample(sampleName: string): Promise<boolean> {
        const response = await this.connection.sendMessage({
            action: AnnotationsServiceWebSocketActions.VALIDATE_SAMPLE,
            data:   new WebSocketRequestData()
                    .add('name', sampleName)
                    .unpack()
        });
        const valid = response.isSuccess() && response.get('valid');
        if (valid) {
            if (!this._user.samples.some((sample) => sample.name === sampleName)) {
                this._user.samples.push(new SampleItem(sampleName));
                this._events.next(AnnotationsServiceEvents.SAMPLE_ADDED);
            }
        }
        return valid;
    }

    public async deleteSample(sample: SampleItem): Promise<boolean> {
        return await this.deleteAction(false, sample);
    }

    public async deleteAllSamples(): Promise<boolean> {
        return await this.deleteAction(true);
    }

    private async deleteAction(all: boolean, sample?: SampleItem): Promise<boolean> {
        const response = await this.connection.sendMessage({
            action: AnnotationsServiceWebSocketActions.DELETE_SAMPLE,
            data:   new WebSocketRequestData()
                    .add('name', sample === undefined ? '' : sample.name)
                    .add('all', all)
                    .unpack()
        });
        const valid = response.isSuccess() && response.get('valid');
        if (valid) {
            if (sample !== undefined) {
                const index = this._user.samples.indexOf(sample);
                if (index !== -1) {
                    this._user.samples.splice(index, 1);
                }
            } else if (all) {
                this._user.samples.splice(0, this._user.samples.length);
            }
            this._events.next(AnnotationsServiceEvents.SAMPLE_DELETED);
        }
        return valid;
    }
}
