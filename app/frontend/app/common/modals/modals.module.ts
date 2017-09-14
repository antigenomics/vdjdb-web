import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { PopupContentComponent } from './popup/popup-content.component';
import { PopupDirective } from './popup/popup.directive';

@NgModule({
    imports:         [ BrowserModule, FormsModule ],
    declarations:    [ PopupDirective, PopupContentComponent ],
    exports:         [ PopupDirective, PopupContentComponent ],
    entryComponents: [ PopupContentComponent ]
})
export class ModalsModule {}
