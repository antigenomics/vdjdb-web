/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { Injectable } from '@angular/core';
import { LoggerService } from '../logger/logger.service';

@Injectable({
    providedIn: 'root'
})
export class ClipboardService {

    constructor(private logger: LoggerService) {}

    // noinspection JSMethodCanBeStatic
    public isSupported(): boolean {
        return document.queryCommandSupported && document.queryCommandSupported('copy');
    }

    public copyFromContent(content: string): boolean {
        if (!this.isSupported()) {
            return false;
        }
        const temporaryTextArea = ClipboardService.createTemporaryTextArea();
        document.body.appendChild(temporaryTextArea);
        temporaryTextArea.value = content;
        try {
            ClipboardService.selectTarget(temporaryTextArea);
            const result = document.execCommand('copy');
            ClipboardService.clearSelection(temporaryTextArea);
            ClipboardService.destroy(temporaryTextArea);
            this.logger.debug('Clipboard copy success', content);
            return result;
        } catch (error) {
            ClipboardService.destroy(temporaryTextArea);
            this.logger.debug('Clipboard copy error', error);
            return false;
        }
    }

    private static createTemporaryTextArea(): HTMLTextAreaElement {
        const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
        let textAreaElement: HTMLTextAreaElement;
        textAreaElement = document.createElement('textarea');
        // Prevent zooming on iOS
        textAreaElement.style.fontSize = '12pt';
        // Reset box model
        textAreaElement.style.border = '0';
        textAreaElement.style.padding = '0';
        textAreaElement.style.margin = '0';
        // Move element out of screen horizontally
        textAreaElement.style.position = 'absolute';
        textAreaElement.style[ isRTL ? 'right' : 'left' ] = '-9999px';
        // Move element to the same position vertically
        const yPosition = window.pageYOffset || document.documentElement.scrollTop;
        textAreaElement.style.top = yPosition + 'px';
        textAreaElement.setAttribute('readonly', '');
        return textAreaElement;
    }

    private static selectTarget(inputElement: HTMLInputElement | HTMLTextAreaElement): number | undefined {
        if (inputElement) {
            inputElement.focus();
            inputElement.select();
        }
        return inputElement.value.length;
    }

    private static clearSelection(inputElement: HTMLInputElement | HTMLTextAreaElement) {
        if (inputElement) {
            inputElement.blur();
        }
        window.getSelection().removeAllRanges();
    }

    private static destroy(inputElement: HTMLInputElement | HTMLTextAreaElement) {
        if (inputElement) {
            document.body.removeChild(inputElement);
        }
    }
}
