import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { TooltipDirective } from "./tooltip.component";
import { TooltipContentComponent } from "./tooltip-content.component";

@NgModule({
    imports:         [ BrowserModule, FormsModule ],
    declarations:    [ TooltipDirective, TooltipContentComponent ],
    exports:         [ TooltipDirective, TooltipContentComponent ],
    entryComponents: [ TooltipContentComponent ]
})
export class ModalsModule {}