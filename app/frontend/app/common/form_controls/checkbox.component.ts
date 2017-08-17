import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'checkbox',
    template: `<div class="checkbox">
                   <label style="width: 100%">
                       <input type="checkbox" [ngModel]="model" (ngModelChange)="change($event)">
                       <span class="cr"><i class="cr-icon glyphicon glyphicon-ok"></i></span> {{ title }}
                   </label>
               </div>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckboxComponent {
    @Input() title: string;
    @Input() model: boolean;
    @Output() modelChange = new EventEmitter();

    change(newValue: boolean) {
        this.model = newValue;
        this.modelChange.emit(newValue);
    }
}