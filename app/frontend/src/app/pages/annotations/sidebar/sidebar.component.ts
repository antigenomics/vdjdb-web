/*
 *
 *       Copyright 2017 Bagaev Dmitry
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *       You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */

import {
    ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, ComponentRef, OnDestroy, OnInit,
    ViewContainerRef
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { ModalComponent } from '../../../shared/modals/modal/modal.component';
import { SampleItem } from '../../../shared/sample/sample-item';
import { LoggerService } from '../../../utils/logger/logger.service';
import { NotificationService } from '../../../utils/notifications/notification.service';
import { AnnotationsService } from '../annotations.service';
import { UploadService, UploadServiceEvent } from '../upload/upload.service';

export class AnnotationsSidebarState {
    public path: string = '';
    public metadata: Map<string, string> = new Map();

    constructor(url: string) {
        this.update(url);
    }

    public update(url: string): void {
        this.path = url.substring('/annotations/'.length);
        if (this.path.startsWith('sample')) {
            const [ sample, route ] = this.parseSampleName(this.path);
            this.metadata.set('sample', sample);
            this.metadata.set('route', route);
        } else {
            this.metadata.delete('sample');
            this.metadata.delete('route');
        }
    }

    public isRouteContains(s: string): boolean {
        if (this.metadata.has('route')) {
            return this.metadata.get('route').indexOf(s) !== -1;
        }
        return false;
    }

    private parseSampleName(url: string): [string, string] {
        const sampleRoute = url.substring('sample/'.length);
        const additionalRouteIndex = sampleRoute.indexOf('/');
        const sampleName = sampleRoute.substring(0, additionalRouteIndex === -1 ? sampleRoute.length : additionalRouteIndex);
        const route = sampleRoute.substring(sampleName.length, sampleRoute.length);
        return [ sampleName, route ];
    }
}

@Component({
    selector:        'annotations-sidebar',
    templateUrl:     './sidebar.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnnotationsSidebarComponent implements OnInit, OnDestroy {
    private _confirmDeletingModalComponent: ComponentRef<ModalComponent>;
    private _filesUploadingLabel: boolean = false;
    private _uploadServiceEventsSubscription: Subscription;
    private _annotationsServiceEventsSubscription: Subscription;
    private _state: AnnotationsSidebarState;

    constructor(private uploadService: UploadService, private annotationsService: AnnotationsService,
                private hostViewContainer: ViewContainerRef, private resolver: ComponentFactoryResolver, private router: Router,
                private changeDetector: ChangeDetectorRef, private logger: LoggerService, private notifications: NotificationService) {
        this._state = new AnnotationsSidebarState(this.router.url);
    }

    public ngOnInit(): void {
        this._uploadServiceEventsSubscription = this.uploadService.getEvents().subscribe((event) => {
            if (event === UploadServiceEvent.UPLOADING_STARTED) {
                this._filesUploadingLabel = true;
            } else if (event === UploadServiceEvent.UPLOADING_ENDED) {
                this._filesUploadingLabel = false;
            }
            this.changeDetector.detectChanges();
        });
        this._annotationsServiceEventsSubscription = this.annotationsService.getEvents().subscribe(() => {
            this.changeDetector.detectChanges();
        });
    }

    public async sidebarRoute(link: string, ...args: string[]): Promise<void> {
        const routed = await this.router.navigate(['annotations', link].concat(args));
        if (routed) {
            this._state.update(this.router.url);
        }
    }

    public isSampleSelected(sample: SampleItem) {
        return this._state.metadata.get('sample') === sample.name;
    }

    public getSamples(): SampleItem[] {
        return this.annotationsService.getSamples();
    }

    public isSamplesEmpty(): boolean {
        return this.getSamples().length === 0;
    }

    public isSampleRouteContains(route: string): boolean {
        return this._state.isRouteContains(route);
    }

    public isFilesUploading(): boolean {
        return this._filesUploadingLabel;
    }

    public deleteSample(sample: SampleItem): void {
        if (!this.annotationsService.getUserPermissions().isDeleteAllowed) {
            this.notifications.error('Delete', 'Deleting is not allowed for this account');
            return;
        }
        const modalComponentResolver = this.resolver.resolveComponentFactory<ModalComponent>(ModalComponent);
        this._confirmDeletingModalComponent = this.hostViewContainer.createComponent<ModalComponent>(modalComponentResolver);
        this._confirmDeletingModalComponent.instance.header = sample.name;
        this._confirmDeletingModalComponent.instance.content = `Are you sure you want to delete this sample (${sample.name})?`;
        this._confirmDeletingModalComponent.instance.yesCallback = async () => {
            this.logger.debug('Sidebar', `Deleting sample ${sample.name}`);
            const deleted = await this.annotationsService.deleteSample(sample);
            if (deleted) {
                this.notifications.info('Delete', `Sample ${sample.name} has been deleted`);
                if (this.isSampleSelected(sample)) {
                    this.router.navigate(['annotations', 'info']);
                }
            } else {
                this.notifications.error('Delete', `Unable to delete ${sample.name} sample`);
            }
        };
        this._confirmDeletingModalComponent.instance.hideCallback = async () => {
            this.destroyConfirmDeletingModalComponent();
        };
    }

    public deleteAllSamples(): void {
        if (!this.annotationsService.getUserPermissions().isDeleteAllowed) {
            this.notifications.error('Delete', 'Deleting is not allowed for this account');
            return;
        }
        const modalComponentResolver = this.resolver.resolveComponentFactory<ModalComponent>(ModalComponent);
        this._confirmDeletingModalComponent = this.hostViewContainer.createComponent<ModalComponent>(modalComponentResolver);
        this._confirmDeletingModalComponent.instance.header = 'Delete all samples';
        this._confirmDeletingModalComponent.instance.content = `Are you sure you want to delete all your samples?`;
        this._confirmDeletingModalComponent.instance.yesCallback = async () => {
            this.logger.debug('Sidebar', `Deleting all samples`);
            const deleted = await this.annotationsService.deleteAllSamples();
            if (deleted) {
                this.notifications.info('Delete', `All samples have been deleted`);
                if (this._state.path.startsWith('sample')) {
                    this.router.navigate(['annotations', 'info']);
                }
            } else {
                this.notifications.error('Delete', `Unable to delete samples`);
            }
        };
        this._confirmDeletingModalComponent.instance.hideCallback = async () => {
            this.destroyConfirmDeletingModalComponent();
        };
    }

    public ngOnDestroy(): void {
        this._uploadServiceEventsSubscription.unsubscribe();
        this._annotationsServiceEventsSubscription.unsubscribe();
        this.destroyConfirmDeletingModalComponent();
    }

    private destroyConfirmDeletingModalComponent(): void {
        if (this._confirmDeletingModalComponent) {
            this._confirmDeletingModalComponent.destroy();
            this._confirmDeletingModalComponent = undefined;
        }
    }
}
