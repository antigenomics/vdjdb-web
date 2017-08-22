import { Component, OnInit } from '@angular/core';
import { DatabaseService } from "./database/database.service";

@Component({
    selector: 'application',
    template: `<navbar></navbar>
               <div class="content_wrapper">     
                    <router-outlet></router-outlet>
               </div>`
})
export class AppComponent {
    constructor(private database: DatabaseService) {}
}