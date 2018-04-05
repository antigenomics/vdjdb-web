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
    ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, ComponentRef, ElementRef, EventEmitter,
    OnDestroy, OnInit, Output, Renderer2, RendererStyleFlags2, ViewChild, ViewContainerRef
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { ModalComponent } from 'shared/modals/modal/modal.component';
import { SampleItem } from 'shared/sample/sample-item';
import { SampleTag } from 'shared/sample/sample-tag';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationService } from 'utils/notifications/notification.service';
import { AnnotationsService, AnnotationsServiceEvents } from '../annotations.service';

export interface ISampleSettings {
    top: string;
    isNameValid: boolean;
    name: string;
    software: string;
    saving: boolean;
    sample: SampleItem;
}

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

    public isSampleSelected(): boolean {
        return this.metadata.has('sample');
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
    private static readonly _settingsHideDelay: number = 200;
    private static readonly _settingsTopShift: number = -35;
    private static readonly _displaySidebarContentDelay: number = 200;
    private _confirmDeletingModalComponent: ComponentRef<ModalComponent>;
    private _filesUploadingLabel: boolean = false;
    private _annotationsServiceEventsSubscription: Subscription;
    private _state: AnnotationsSidebarState;
    private _hidden: boolean = false;

    @ViewChild('sidebar')
    public sidebar: ElementRef;

    @ViewChild('sidebarContent')
    public sidebarContent: ElementRef;

    @ViewChild('sidebarSettings')
    public sidebarSettings: ElementRef;

    @Output('visible')
    public visible: EventEmitter<boolean> = new EventEmitter();

    public settings: ISampleSettings;

    constructor(private annotationsService: AnnotationsService, private renderer: Renderer2,
                private hostViewContainer: ViewContainerRef, private resolver: ComponentFactoryResolver, private router: Router,
                private changeDetector: ChangeDetectorRef, private logger: LoggerService, private notifications: NotificationService) {
        this._state = new AnnotationsSidebarState(this.router.url);
    }

    public ngOnInit(): void {
        this._annotationsServiceEventsSubscription = this.annotationsService.getEvents().subscribe((event) => {
            if (event === AnnotationsServiceEvents.UPLOAD_SERVICE_UPLOAD_STARTED) {
                this._filesUploadingLabel = true;
            } else if (event === AnnotationsServiceEvents.UPLOAD_SERVICE_UPLOAD_ENDED) {
                this._filesUploadingLabel = false;
            }
            this.changeDetector.detectChanges();
        });
    }

    public hide(): void {
        this.closeConfigureSample();
        this.visible.emit(false);
        this.renderer.setStyle(this.sidebar.nativeElement, 'width', '40px', RendererStyleFlags2.Important);
        this.renderer.setStyle(this.sidebarContent.nativeElement, 'display', 'none');
        this.renderer.setStyle(this.sidebarContent.nativeElement, 'opacity', '0');
        this._hidden = true;
    }

    public show(): void {
        this.visible.emit(true);
        this.renderer.setStyle(this.sidebar.nativeElement, 'width', '12.5%', RendererStyleFlags2.Important);
        this.renderer.setStyle(this.sidebarContent.nativeElement, 'display', 'block');
        window.setTimeout(() => {
            this.renderer.setStyle(this.sidebarContent.nativeElement, 'opacity', '1.0');
        }, AnnotationsSidebarComponent._displaySidebarContentDelay);
        this._hidden = false;
    }

    public toggle(): void {
        if (this._hidden) {
            this.show();
        } else {
            this.hide();
        }
    }

    public async sidebarRoute(link: string, ...args: string[]): Promise<void> {
        const routed = await this.router.navigate([ 'annotations', link ].concat(args));
        if (routed) {
            this._state.update(this.router.url);
        }
        this.closeConfigureSample();
        this.changeDetector.detectChanges();
    }

    public getAvailableSoftwareTypes(): string[] {
        return this.annotationsService.getAvailableSoftwareTypes();
    }

    public isSampleSelected(sample: SampleItem): boolean {
        return this._state.metadata.get('sample') === sample.name;
    }

    public isAllSamplesSelected(): boolean {
        return !this._state.isSampleSelected() && this._state.path.includes('multisample');
    }

    public isTagsPageSelected(): boolean {
        return !this._state.isSampleSelected() && this._state.path.includes('tags');
    }

    public getSamples(): SampleItem[] {
        return this.annotationsService.getSamples();
    }

    public getSampleTag(sample: SampleItem): SampleTag {
        return this.annotationsService.getSampleTag(sample);
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

    public isUploadingAllowed(): boolean {
        return this.annotationsService.getUserPermissions().isUploadAllowed;
    }

    public isDeletingAllowed(): boolean {
        return this.annotationsService.getUserPermissions().isDeleteAllowed;
    }

    public isConfiguringAllowed(): boolean {
        return this.annotationsService.getUserPermissions().isDeleteAllowed;
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
                    this.router.navigate([ 'annotations', 'info' ]);
                }
                if (this.settings !== undefined && this.settings.sample === sample) {
                    this.closeConfigureSample();
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
                    this.router.navigate([ 'annotations', 'info' ]);
                }
                this.closeConfigureSample();
            } else {
                this.notifications.error('Delete', `Unable to delete samples`);
            }
        };
        this._confirmDeletingModalComponent.instance.hideCallback = async () => {
            this.destroyConfirmDeletingModalComponent();
        };
    }

    public isConfigureNewSampleNameValid(): boolean {
        if (!SampleItem.isNameValid(this.settings.name)) {
            return false;
        }
        const duplicate = this.annotationsService.getSamples()
            .filter((s) => s !== this.settings.sample)
            .findIndex((s) => s.name === this.settings.name);
        if (duplicate !== -1) {
            return false;
        }
        return true;
    }

    public isSampleConfiguring(sample: SampleItem): boolean {
        return this.settings !== undefined && this.settings.sample === sample;
    }

    public configureSample(sample: SampleItem, event: MouseEvent): void {
        if (!this.annotationsService.getUserPermissions().isDeleteAllowed) {
            this.notifications.error('Sample update', 'Updating is not allowed for this account');
            return;
        }

        if (this.settings && this.settings.saving) {
            this.notifications.warn('Sample update', 'Wait until previous updating will be completed');
            return;
        }

        this.openConfigureSample();
        this.settings = {
            top:         `${event.clientY + AnnotationsSidebarComponent._settingsTopShift}px`,
            isNameValid: true,
            name:        sample.name,
            software:    sample.software,
            saving:      false,
            sample
        };
    }

    public handleConfigureNewName(newName: string): void {
        this.settings.name = newName;
        this.settings.isNameValid = this.isConfigureNewSampleNameValid();
    }

    public closeConfigureSample(): void {
        if (this.settings) {
            this.settings.sample = undefined;
        }
        this.renderer.setStyle(this.sidebarSettings.nativeElement, 'opacity', 0.0);
        window.setTimeout(() => {
            this.renderer.setStyle(this.sidebarSettings.nativeElement, 'display', 'none');
        }, AnnotationsSidebarComponent._settingsHideDelay);
    }

    public openConfigureSample(): void {
        this.renderer.setStyle(this.sidebarSettings.nativeElement, 'display', 'block');
        window.setImmediate(() => {
            this.renderer.setStyle(this.sidebarSettings.nativeElement, 'opacity', 1.0);
        });
    }

    public async saveConfigureSample(): Promise<void> {
        if (!this.settings.isNameValid) {
            this.notifications.error('Sample update', 'New sample name is not valid');
            return;
        }

        this.settings.saving = true;
        this.changeDetector.detectChanges();

        const success = await this.annotationsService.updateSampleProps(this.settings.sample, this.settings.name, this.settings.software);
        if (!success) {
            this.notifications.error('Sample update', 'An error occured during sample updating');
        } else {
            this.notifications.success('Sample update', 'Sample successfully updated');
            window.setTimeout(() => {
                this.closeConfigureSample();
                this.changeDetector.detectChanges();
            }, AnnotationsSidebarComponent._settingsHideDelay);
        }

        this.settings.saving = false;
        this.changeDetector.detectChanges();
    }

    public ngOnDestroy(): void {
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
