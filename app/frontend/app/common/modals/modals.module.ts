import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { TooltipDirective } from "./tooltip.component";
import { TooltipContentComponent } from "./tooltip-content.component";
import { PopupDirective } from "./popup.directive";

@NgModule({
    imports:         [ BrowserModule, FormsModule ],
    declarations:    [ TooltipDirective, TooltipContentComponent, PopupDirective ],
    exports:         [ TooltipDirective, TooltipContentComponent, PopupDirective ],
    entryComponents: [ TooltipContentComponent ]
})
export class ModalsModule {}