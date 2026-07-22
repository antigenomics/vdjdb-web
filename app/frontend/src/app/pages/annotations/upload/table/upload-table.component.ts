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

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild
} from '@angular/core';
import { AnnotationsService } from 'pages/annotations/annotations.service';
import { FileItem } from 'pages/annotations/upload/item/file-item';
import { Subscription } from 'rxjs';
import { UploadService } from '../upload.service';

@Component({
  selector:        'upload-table',
  templateUrl:     './upload-table.component.html',
  styleUrls:       [ './upload-table.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadTableComponent implements OnInit, OnDestroy {
  private _stateSubscription: Subscription;

  /** Listed by the server rather than named here. The one link this replaced was a hardcoded
   * `B35+.txt.gz`, so the second shipped sample was undiscoverable and a renamed file would have left
   * a dead link with nothing to notice it. */
  public demoSamples: Array<{ name: string, size: number }> = [];

  @ViewChild('dragArea')
  public dragArea: ElementRef;

  constructor(public uploadService: UploadService, public annotationsService: AnnotationsService,
              private changeDetector: ChangeDetectorRef, private renderer: Renderer2) {
  }

  public ngOnInit(): void {
    this._stateSubscription = this.uploadService.getEvents().subscribe(() => {
      this.changeDetector.detectChanges();
    });
    this.uploadService.checkTagsAvailability();
    this.loadDemoSamples();
  }

  /** Plain `fetch`: this app has never wired up HttpClient, and one unauthenticated GET does not
   * justify pulling in HttpClientModule. Failure is swallowed on purpose — the sample links are a
   * hint on an empty upload table, so the page is still usable without them, and an error banner for
   * a missing hint would be louder than the hint itself. */
  private loadDemoSamples(): void {
    fetch('/api/annotations/demo')
      .then((response) => response.ok ? response.json() : [])
      .then((samples: Array<{ name: string, size: number }>) => {
        this.demoSamples = samples;
        this.changeDetector.detectChanges();
      })
      .catch(() => undefined);
  }

  /** The shipped names contain `+`, which is a space in a URL path if it is not escaped. */
  public demoSampleUrl(sample: { name: string }): string {
    return `/api/annotations/demo/${encodeURIComponent(sample.name)}`;
  }

  public showValidNameTooltip(): boolean {
    return this.uploadService.getItems().some((item) => !item.status.isNameValid());
  }

  @HostBinding('draggable')
  get getDraggable(): string {
    return 'true';
  }

  @HostListener('dragover', [ '$event' ])
  public onDragOver(event: Event) {
    this.enableDragStyle(event);
  }

  @HostListener('dragenter', [ '$event' ])
  public onDragEnter(event: Event) {
    this.enableDragStyle(event);
  }

  @HostListener('dragend', [ '$event' ])
  public onDragEnd(event: Event) {
    this.disableDragStyle(event);
  }

  @HostListener('dragleave', [ '$event' ])
  public onDragLeave(event: Event) {
    this.disableDragStyle(event);
  }

  @HostListener('drop', [ '$event' ])
  public onDrop(event: Event) {
    this.disableDragStyle(event);
    event.stopPropagation();
    this.uploadService.addItems((event as any).dataTransfer.files);
  }

  public isTagsExist(): boolean {
    return this.annotationsService.getTags().length !== 0;
  }

  public getAvailableSpecies(): string[] {
    return FileItem.AVAILABLE_SPECIES;
  }

  public getAvailableChains(): string[] {
    return FileItem.AVAILABLE_CHAINS;
  }

  public ngOnDestroy(): void {
    if (this._stateSubscription !== undefined) {
      this._stateSubscription.unsubscribe();
    }
  }

  private enableDragStyle(event: Event): void {
    event.preventDefault();
    this.renderer.setStyle(this.dragArea.nativeElement, 'border', '1px dashed #bbb');
  }

  private disableDragStyle(event: Event): void {
    event.preventDefault();
    this.renderer.setStyle(this.dragArea.nativeElement, 'border', '1px dashed #fff');
  }
}
