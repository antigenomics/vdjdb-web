import { Component } from '@angular/core';

@Component({
    selector: 'application',
    template: `<navbar></navbar>
               <div class="content_wrapper">
                    <router-outlet></router-outlet>
               </div>`
})
export class ApplicationComponent {}
