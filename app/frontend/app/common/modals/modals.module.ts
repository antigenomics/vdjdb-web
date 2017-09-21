import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { PopupContentComponent } from './popup/popup-content.component';
import { PopupDirective } from './popup/popup.directive';
import { Popup2ContentComponent } from './popup2/popup2-content.component';
import { Popup2Directive } from './popup2/popup2.directive';

@NgModule({
    imports:         [ BrowserModule, FormsModule ],
    declarations:    [ PopupDirective, PopupContentComponent, Popup2Directive, Popup2ContentComponent ],
    exports:         [ PopupDirective, PopupContentComponent, Popup2Directive, Popup2ContentComponent ],
    entryComponents: [ PopupContentComponent, Popup2ContentComponent ]
})
export class ModalsModule {}
