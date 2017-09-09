import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { PopupDirective } from "./popup.directive";

@NgModule({
    imports:         [ BrowserModule, FormsModule ],
    declarations:    [ PopupDirective ],
    exports:         [ PopupDirective ]
})
export class ModalsModule {}