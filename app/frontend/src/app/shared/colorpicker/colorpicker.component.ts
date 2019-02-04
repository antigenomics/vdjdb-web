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

import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, Renderer2, ViewChild } from '@angular/core';

@Component({
  selector:        'color-picker',
  templateUrl:     './colorpicker.component.html',
  styleUrls:       [ './colorpicker.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColorpickerComponent implements AfterViewInit {
  private static readonly hidingDelay: number = 300;
  private static readonly imageSizes: number = 150;
  private outsideClickListener: () => void;
  private context: CanvasRenderingContext2D;
  private visible: boolean = false;
  private disabled: boolean = false;

  @ViewChild('picker')
  public picker: ElementRef;

  @ViewChild('canvas')
  public canvas: ElementRef;

  @ViewChild('inner')
  public inner: ElementRef;

  @Input('disable')
  public set disable(disabled: boolean) {
    this.disabled = disabled;
    if (!this.disabled && this.context === undefined) {
      this.initializeContext();
    }
  }

  @Input('initial')
  public initial: string;

  @Output('color')
  public color = new EventEmitter<string>();

  constructor(private renderer: Renderer2) {}

  public ngAfterViewInit(): void {
    if (!this.disabled) {
      this.initializeContext();
    }
    this.renderer.setStyle(this.inner.nativeElement, 'background-color', this.initial);
  }

  public toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public pickColor(event: MouseEvent): void {
    const offset = event.srcElement.getBoundingClientRect();
    const color = this.context.getImageData(event.clientX - offset.left, event.clientY - offset.top, 1, 1).data;

    if (color[ 3 ] !== 0) {
      const rgb = `rgb(${color[ 0 ]},${color[ 1 ]},${color[ 2 ]})`;
      this.renderer.setStyle(this.inner.nativeElement, 'background-color', rgb);
      this.color.emit(rgb);
      this.hide();
    }
  }

  private show(): void {
    if (!this.disabled) {
      this.renderer.setStyle(this.picker.nativeElement, 'display', 'block');
      this.renderer.setStyle(this.inner.nativeElement, 'z-index', '12');
      setImmediate(() => {
        this.renderer.setStyle(this.picker.nativeElement, 'opacity', 1.0);
      });
      this.visible = true;
      setImmediate(() => {
        if (this.outsideClickListener === undefined) {
          this.outsideClickListener = this.renderer.listen('window', 'click', () => {
            this.hide();
          });
        }
      });
    }
  }

  private hide(): void {
    this.renderer.setStyle(this.picker.nativeElement, 'opacity', 0.0);
    setTimeout(() => {
      this.renderer.setStyle(this.picker.nativeElement, 'display', 'none');
      this.renderer.setStyle(this.inner.nativeElement, 'z-index', '10');
    }, ColorpickerComponent.hidingDelay);
    this.visible = false;
    if (this.outsideClickListener) {
      this.outsideClickListener();
      this.outsideClickListener = undefined;
    }
  }

  private initializeContext(): void {
    this.context = this.canvas.nativeElement.getContext('2d');

    const image = new Image();
    const styles = this.picker.nativeElement.currentStyle || window.getComputedStyle(this.picker.nativeElement, false as any);

    image.crossOrigin = 'Anonymous';
    image.src = styles.backgroundImage.replace(/"/g, '').replace(/url\(|\)$/ig, '');
    image.onload = () => {
      this.renderer.setProperty(this.canvas.nativeElement, 'width', ColorpickerComponent.imageSizes);
      this.renderer.setProperty(this.canvas.nativeElement, 'height', ColorpickerComponent.imageSizes);
      this.context.drawImage(image, 0, 0, ColorpickerComponent.imageSizes, ColorpickerComponent.imageSizes);
    };
    this.renderer.setStyle(this.picker.nativeElement, 'backgroundImage', 'none');
  }
}
