import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CheckboxComponent } from "./checkbox/checkbox.component";
import { SetComponent } from "./set/set.component";
import { AutocompletePipe } from "./set/autocomplete.pipe";


@NgModule({
    imports:         [ BrowserModule, FormsModule ],
    declarations:    [ CheckboxComponent, SetComponent, AutocompletePipe ],
    exports:         [ CheckboxComponent, SetComponent, AutocompletePipe ]
})
export class FiltersFormsModule {}
