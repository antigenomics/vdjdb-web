import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { SetComponent } from "./set/set.component";
import { AutocompletePipe } from "./set/autocomplete.pipe";
import { FiltersHeaderComponent } from "./header/filters-header.component";
import { ModalsModule } from "../../modals/modals.module";


@NgModule({
    imports:         [ BrowserModule, FormsModule, ModalsModule ],
    declarations:    [ SetComponent, AutocompletePipe, FiltersHeaderComponent ],
    exports:         [ SetComponent, AutocompletePipe, FiltersHeaderComponent ]
})
export class FiltersCommonModule {}
