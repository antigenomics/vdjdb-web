import { Injectable } from '@angular/core';
import { LoggerService } from '../logger/logger.service';

@Injectable()
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
