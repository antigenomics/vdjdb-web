import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AboutPageComponent } from './about.component';

@NgModule({
    imports:      [ BrowserModule, RouterModule.forChild([ { path: 'about', component: AboutPageComponent } ]) ],
    declarations: [ AboutPageComponent ],
    exports:      [ AboutPageComponent ]
})
export class AboutPageModule {}
