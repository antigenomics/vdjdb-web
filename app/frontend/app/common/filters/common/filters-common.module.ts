import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { ModalsModule } from '../../modals/modals.module';
import { FiltersHeaderComponent } from './header/filters-header.component';
import { AutocompletePipe } from './set/autocomplete.pipe';
import { SetComponent } from './set/set.component';
import { SliderComponent } from './slider/slider.component';

@NgModule({
    imports:         [ BrowserModule, FormsModule, ModalsModule ],
    declarations:    [ SliderComponent, SetComponent, AutocompletePipe, FiltersHeaderComponent ],
    exports:         [ SliderComponent, SetComponent, AutocompletePipe, FiltersHeaderComponent ]
})
export class FiltersCommonModule {}
