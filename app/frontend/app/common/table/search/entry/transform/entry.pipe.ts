import { Pipe, PipeTransform } from '@angular/core';
import { EntryJsonPipe } from "./json.pipe";
import { DomSanitizer } from "@angular/platform-browser";

@Pipe({
    name: 'entryPipe'
})
export class EntryPipe implements PipeTransform {
    constructor(private sanitizer: DomSanitizer) {

    }

    transform(value: string, column: string): any {
        switch (column) {
            case 'method':
            case 'meta':
            case 'cdr3fix':
                return this.sanitizer.bypassSecurityTrustHtml(EntryJsonPipe.transform(value));
            default:
                return value;
        }
    }
}