import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HomePageComponent } from './home.component';
import { SummaryComponent } from './summary/summary.component';
import { SummaryService } from './summary/summary.service';

@NgModule({
    imports:      [ RouterModule.forChild([ { path: '', component: HomePageComponent } ]) ],
    declarations: [ HomePageComponent, SummaryComponent ],
    exports:      [ HomePageComponent, SummaryComponent ],
    providers:    [ SummaryService ]
})
export class HomePageModule {}
