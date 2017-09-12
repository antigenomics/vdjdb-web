import { ComponentFactoryResolver, Directive, Input, OnInit, ViewContainerRef, ComponentRef, OnDestroy, ViewRef } from "@angular/core";
import { SearchTableEntryOriginalComponent } from "./original/search-table-entry-original.component";
import { SearchTableEntry } from "./search-table-entry";
import { SearchTableEntryJsonComponent } from "./json/search-table-entry-json.component";
import { DatabaseColumnInfo } from "../../../../database/database-metadata";
import { LoggerService } from "../../../../utils/logger/logger.service";
import { LoggerErrorMessage } from "../../../../utils/logger/logger-messages";
import { SearchTableRow } from "../row/search-table-row";
import { SearchTableEntryUrlComponent } from "./url/search-table-entry-url.component";
import { SearchTableEntryCdrComponent } from "./cdr/search-table-entry-cdr.component";


@Directive({
    selector: '[search-table-entry]'
})
export class SearchTableEntryDirective implements OnInit, OnDestroy {
    private component: ComponentRef<any>;

    @Input('search-table-entry')
    entry: SearchTableEntry;

    @Input('column-meta')
    column: DatabaseColumnInfo;

    @Input('parent-row')
    row: SearchTableRow;

    ngOnInit() {
        if (this.entry.column === this.column.name) {
            this.viewContainerRef.clear();
            switch (this.column.name) {
                case "cdr3":
                    const cdr = this.resolver.resolveComponentFactory<SearchTableEntryCdrComponent>(SearchTableEntryCdrComponent);
                    this.component = this.viewContainerRef.createComponent<SearchTableEntryCdrComponent>(cdr);
                    this.component.instance.generate(this.entry.value, this.row);
                    break;
                case "reference.id":
                    const url = this.resolver.resolveComponentFactory<SearchTableEntryUrlComponent>(SearchTableEntryUrlComponent);
                    this.component = this.viewContainerRef.createComponent<SearchTableEntryUrlComponent>(url);
                    this.component.instance.generate(this.entry.value);
                    break;
                case "method":
                case "meta":
                case "cdr3fix":
                    const json = this.resolver.resolveComponentFactory<SearchTableEntryJsonComponent>(SearchTableEntryJsonComponent);
                    this.component = this.viewContainerRef.createComponent<SearchTableEntryJsonComponent>(json);
                    this.component.instance.generate(this.column.title, this.entry.value, this.column);
                    break;
                default:
                    const original = this.resolver.resolveComponentFactory<SearchTableEntryOriginalComponent>(SearchTableEntryOriginalComponent);
                    this.component = this.viewContainerRef.createComponent<SearchTableEntryOriginalComponent>(original);
                    this.component.instance.generate(this.entry.value);
            }
        } else {
            this.logger.log(new LoggerErrorMessage('Assert ' + this.entry.column + ' === ' + this.column.name + ' failed.', 'Data corrupted'));
        }
    }

    constructor(private viewContainerRef: ViewContainerRef, private resolver: ComponentFactoryResolver, private logger: LoggerService) {

    }

    ngOnDestroy() {
        if (this.component) {
            this.component.destroy();
        }
    }
}