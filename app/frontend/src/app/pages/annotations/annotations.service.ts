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
import { SampleFilters } from 'pages/annotations/sample/filters/sample-filters';
import { IntersectionTableRow } from 'pages/annotations/sample/table/intersection/row/intersection-table-row';
import { Observable } from 'rxjs/Observable';
import { filter } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';
import { SampleItem } from 'shared/sample/sample-item';
import { SampleTag } from 'shared/sample/sample-tag';
import { IExportFormat, IExportOptionFlag } from 'shared/table/export/table-export.component';
import { User, UserPermissions } from 'shared/user/user';
import { WebSocketConnection, WebSocketResponseStatus } from 'shared/websocket/websocket-connection';
import { WebSocketRequestData } from 'shared/websocket/websocket-request';
import { WebSocketResponseData } from 'shared/websocket/websocket-response';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationService } from 'utils/notifications/notification.service';
import { Utils } from 'utils/utils';
import { DatabaseMetadata } from '../search/database/database-metadata';
import { FileItem } from './upload/item/file-item';

export type AnnotationsServiceEvents = number;

export namespace AnnotationsServiceEvents {
    export const INITIALIZED: number = 0;
    export const SAMPLE_ADDED: number = 1;
    export const SAMPLE_DELETED: number = 2;
    export const SAMPLE_UPDATED: number = 3;
    export const SAMPLE_TABLE_EXPORT_START: number = 4;
    export const SAMPLE_TABLE_EXPORT_END: number = 5;
    export const UPLOAD_SERVICE_STATE_REFRESHED: number = 6;
    export const UPLOAD_SERVICE_UPLOAD_STARTED: number = 7;
    export const UPLOAD_SERVICE_UPLOAD_ENDED: number = 8;
    export const SAMPLE_TAGS_UPDATED: number = 9;
}

export namespace AnnotationsServiceWebSocketActions {
    export const DATABASE_METADATA: string = 'meta';
    export const USER_DETAILS: string = 'details';
    export const AVAILABLE_SOFTWARE: string = 'available_software';
    export const VALIDATE_SAMPLE: string = 'validate_sample';
    export const UPDATE_SAMPLE_STATS: string = 'update_sample_stats';
    export const UPDATE_SAMPLE_PROPS: string = 'update_sample_props';
    export const DELETE_SAMPLE: string = 'delete_sample';
    export const INTERSECT: string = 'intersect';
    export const DOWNLOAD_MATCHES: string = 'download_matches';
    export const EXPORT: string = 'export';
    export const CREATE_TAG: string = 'create_tag';
    export const DELETE_TAG: string = 'delete_tag';
    export const UPDATE_TAG: string = 'update_tag';
}

@Injectable()
export class AnnotationsService {
    private _events: Subject<AnnotationsServiceEvents> = new Subject();
    private _initialized: boolean = false;
    private _user: User;
    private _availableSoftwareTypes: string[] = [];
    private _databaseMetadata: DatabaseMetadata;

    private connection: WebSocketConnection;

    constructor(private logger: LoggerService, private notifications: NotificationService) {
        this.connection = new WebSocketConnection(logger, notifications, true);
        this.connection.onOpen(async () => {

            const userDetailsRequest = this.connection.sendMessage({
                action: AnnotationsServiceWebSocketActions.USER_DETAILS
            });

            const availableSoftwareTypesRequest = this.connection.sendMessage({
                action: AnnotationsServiceWebSocketActions.AVAILABLE_SOFTWARE
            });

            const databaseMetadataRequest = this.connection.sendMessage({
                action: AnnotationsServiceWebSocketActions.DATABASE_METADATA
            });

            const userDetailsResponse = await userDetailsRequest;
            this._user = User.deserialize(userDetailsResponse.get('details'));
            this.logger.debug('AnnotationsService: user', this._user);

            const availableSoftwareTypesResponse = await availableSoftwareTypesRequest;
            this._availableSoftwareTypes = availableSoftwareTypesResponse.get('available');
            this.logger.debug('AnnotationsService: available software', this._availableSoftwareTypes);

            const databaseMetadataResponse = await databaseMetadataRequest;
            this._databaseMetadata = DatabaseMetadata.deserialize(databaseMetadataResponse.get('metadata'));
            this.logger.debug('AnnotationsService: database metadata', this._databaseMetadata);

            this._initialized = true;
            this._events.next(AnnotationsServiceEvents.INITIALIZED);
        });
        this.connection.connect('/api/annotations/connect');

        this.connection.getMessages()
            .pipe(filter((message: WebSocketResponseData) => message.get('action') === AnnotationsServiceWebSocketActions.UPDATE_SAMPLE_STATS))
            .subscribe((message: WebSocketResponseData) => {
                const sampleName = message.get('sampleName');
                const sampleInfoReadsCount = message.get('readsCount');
                const sampleInfoClonotypesCount = message.get('clonotypesCount');
                this._user.updateSampleInfo(sampleName, sampleInfoReadsCount, sampleInfoClonotypesCount);
                this._events.next(AnnotationsServiceEvents.SAMPLE_UPDATED);
            });
    }

    public isInitialized(): boolean {
        return this._initialized;
    }

    public getEvents(): Subject<AnnotationsServiceEvents> {
        return this._events;
    }

    public fireEvent(event: AnnotationsServiceEvents): void {
        this._events.next(event);
    }

    public getSamples(): SampleItem[] {
        return this._user ? this._user.samples : [];
    }

    public getTags(): SampleTag[] {
        return this._user ? this._user.tags : [];
    }

    public getSample(name: string): SampleItem {
        return this._user ? this._user.samples.find((sample) => sample.name === name) : undefined;
    }

    public getSampleTag(sample: SampleItem): SampleTag {
        return sample.hasTag() ? this._user.tags.find((tag) => tag.id === sample.tagID) : undefined;
    }

    public getSampleTagByName(sampleName: string): SampleTag {
        const sample = this.getSamples().find((s) => s.name === sampleName);
        return sample ? this.getSampleTag(sample) : undefined;
    }

    public getUserPermissions(): UserPermissions {
        return this._user ? this._user.permissions : undefined;
    }

    public getUser(): User {
        return this._user;
    }

    public getAvailableSoftwareTypes(): string[] {
        return this._availableSoftwareTypes;
    }

    public getDatabaseMetadata(): DatabaseMetadata {
        return this._databaseMetadata;
    }

    public intersect(sample: SampleItem, filters: SampleFilters, observerCallback: (o: Observable<WebSocketResponseData>) => void): void {
        this.connection.subscribeMessages({
            action: AnnotationsServiceWebSocketActions.INTERSECT,
            data:   new WebSocketRequestData()
                        .add('sampleName', sample.name)
                        .add('hammingDistance', filters.hammingDistance)
                        .add('confidenceThreshold', filters.confidenceThreshold)
                        .add('matchV', filters.matchV)
                        .add('matchJ', filters.matchJ)
                        .add('species', filters.species)
                        .add('gene', filters.gene)
                        .add('mhc', filters.mhc)
                        .unpack()
        }, observerCallback);
    }

    public downloadMatches(row: IntersectionTableRow, sample: SampleItem): Promise<WebSocketResponseData> {
        return this.connection.sendMessage({
            action: AnnotationsServiceWebSocketActions.DOWNLOAD_MATCHES,
            data:   new WebSocketRequestData()
                        .add('sampleName', sample.name)
                        .add('rowIndex', row.index)
                        .unpack()
        });
    }

    public async exportTable(sample: SampleItem, request: { format: IExportFormat, options: IExportOptionFlag[] }): Promise<void> {
        if (sample.table.exporting) {
            this.notifications.warn('Export', 'Please wait until previous export file will be generated');
            return;
        } else {
            const { format, options } = request;
            this.logger.debug(`Export annotations for ${sample.name}`, format);
            this._events.next(AnnotationsServiceEvents.SAMPLE_TABLE_EXPORT_START);
            sample.table.setExportStartStatus();
            const response = await this.connection.sendMessage({
                action: AnnotationsServiceWebSocketActions.EXPORT,
                data:   new WebSocketRequestData()
                            .add('sampleName', sample.name)
                            .add('format', format.name)
                            .add('options', options)
                            .unpack()
            });
            this.logger.debug(`Export annotations for ${sample.name}`, response);
            if (response.get('status') === WebSocketResponseStatus.SUCCESS) {
                Utils.File.download(response.get('link'));
            } else {
                this.notifications.warn('Export', response.get('message'));
            }
            sample.table.setExportEndStatus();
            this._events.next(AnnotationsServiceEvents.SAMPLE_TABLE_EXPORT_END);
            return;
        }
    }

    public async saveTag(tag: SampleTag): Promise<boolean> {
        const samples = tag.samples.map((e) => e.value);
        const response = await this.connection.sendMessage({
            action: AnnotationsServiceWebSocketActions.CREATE_TAG,
            data:   new WebSocketRequestData()
                        .add('name', tag.name)
                        .add('color', tag.color)
                        .add('samples', samples)
                        .unpack()
        });

        if (response.isSuccess()) {
            tag.id = response.get('tagID');
            tag.saved = true;
            this._user.samples.filter((sample) => samples.includes(sample.name)).forEach((sample) => sample.tagID = tag.id);
            this._events.next(AnnotationsServiceEvents.SAMPLE_TAGS_UPDATED);
        }

        return response.isSuccess();
    }

    public async deleteTag(tag: SampleTag): Promise<boolean> {
        const response = await this.connection.sendMessage({
            action: AnnotationsServiceWebSocketActions.DELETE_TAG,
            data:   new WebSocketRequestData()
                        .add('tagID', tag.id)
                        .unpack()
        });

        if (response.isSuccess()) {
            const index = this._user.tags.indexOf(tag);
            if (index !== -1) {
                this._user.tags.splice(index, 1);
            }
            this._user.samples.filter((sample) => sample.tagID === tag.id).forEach((sample) => sample.tagID = -1);
            this._events.next(AnnotationsServiceEvents.SAMPLE_TAGS_UPDATED);
        }

        return response.isSuccess();
    }

    public async updateTag(tag: SampleTag): Promise<boolean> {
        const samples = tag.samples.map((e) => e.value);
        const response = await this.connection.sendMessage({
            action: AnnotationsServiceWebSocketActions.UPDATE_TAG,
            data:   new WebSocketRequestData()
                        .add('tagID', tag.id)
                        .add('name', tag.name)
                        .add('color', tag.color)
                        .add('samples', samples)
                        .unpack()
        });
        if (response.isSuccess()) {
            this._user.samples.filter((sample) => sample.tagID === tag.id && !samples.includes(sample.name)).forEach((sample) => sample.tagID = -1);
            this._user.samples.filter((sample) => samples.includes(sample.name)).forEach((sample) => sample.tagID = tag.id);
            this._events.next(AnnotationsServiceEvents.SAMPLE_TAGS_UPDATED);
        }
        return response.isSuccess();
    }

    public async updateSampleProps(sample: SampleItem, newName: string, newSoftware: string): Promise<boolean> {
        const response = await this.connection.sendMessage({
            action: AnnotationsServiceWebSocketActions.UPDATE_SAMPLE_PROPS,
            data:   new WebSocketRequestData()
                        .add('prevSampleName', sample.name)
                        .add('newSampleName', newName)
                        .add('newSampleSoftware', newSoftware)
                        .unpack()
        });
        if (response.isSuccess()) {
            const prevSampleName = response.get('prevSampleName');
            const newSampleName = response.get('newSampleName');
            const newSampleSoftware = response.get('newSampleSoftware');

            const find = this.getUser().samples.find((s) => s.name === prevSampleName);
            find.updateProps(newSampleName, newSampleSoftware);
            if (sample.tagID !== -1) {
                const tag = this.getSampleTag(find);
                const entry = tag.samples.find((s) => s.value === prevSampleName);
                if (entry !== undefined) {
                    entry.value = newSampleName;
                    entry.display = newSampleName;
                }
            }

            this._events.next(AnnotationsServiceEvents.SAMPLE_UPDATED);
        }
        return response.isSuccess();
    }

    public async addSample(file: FileItem): Promise<boolean> {
        const response = await this.connection.sendMessage({
            action: AnnotationsServiceWebSocketActions.VALIDATE_SAMPLE,
            data:   new WebSocketRequestData()
                        .add('name', file.baseName)
                        .unpack()
        });
        const valid = response.isSuccess() && response.get('valid');
        if (valid) {
            const user = this.getUser();
            if (!user.samples.some((sample) => sample.name === file.baseName)) {
                user.samples.push(new SampleItem(file.baseName, file.software, -1, -1, -1));
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
            const user = this.getUser();
            if (sample !== undefined) {
                const index = user.samples.indexOf(sample);
                if (index !== -1) {
                    this.removeSampleFromTag(sample);
                    user.samples.splice(index, 1);
                }
            } else if (all) {
                user.samples.splice(0, user.samples.length);
                user.tags.forEach((tag) => {
                    tag.samples.splice(0, tag.samples.length);
                });
            }
            this._events.next(AnnotationsServiceEvents.SAMPLE_DELETED);
        }
        return valid;
    }

    private removeSampleFromTag(sample: SampleItem): void {
        if (sample !== undefined && sample.tagID !== -1) {
            const tag = this.getTags().find((t) => t.id === sample.tagID);
            if (tag !== undefined) {
                const index = tag.samples.findIndex((s) => s.value === sample.name);
                if (index !== -1) {
                    tag.samples.splice(index, 1);
                }
            }
        }
    }
}
