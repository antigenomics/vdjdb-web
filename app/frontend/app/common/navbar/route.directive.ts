import { Directive, HostListener, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Utils } from '../../utils/utils';
import { BooleanConverter, InputConverter } from '../../utils/input-converter.decorator';

@Directive({
    selector: '[route]'
})
export class RouteDirective {
    @Input('route')
    public routeURL: string;

    @InputConverter(BooleanConverter)
    @Input('external')
    public external: boolean = false;

    constructor(private router: Router) {}

    @HostListener('click')
    public onRouteChange(): void {
        console.log(this.external);
        if (this.external) {
            document.location.href = this.routeURL;
        } else {
            this.router.navigate([ this.routeURL ]).then(() =>  Utils.Window.scroll(document.body));
        }
    }
}
