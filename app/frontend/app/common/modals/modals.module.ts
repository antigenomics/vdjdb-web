import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { PopupDirective } from "./popup/popup.directive";
import { PopupContentComponent } from "./popup/popup-content.component";

@NgModule({
    imports:         [ BrowserModule, FormsModule ],
    declarations:    [ PopupDirective, PopupContentComponent ],
    exports:         [ PopupDirective, PopupContentComponent ],
    entryComponents: [ PopupContentComponent ]
})
export class ModalsModule {}