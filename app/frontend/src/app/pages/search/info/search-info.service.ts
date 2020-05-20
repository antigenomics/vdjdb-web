import { Injectable } from "@angular/core";
import {BehaviorSubject, Subject} from "rxjs";

@Injectable()
export class SearchInfoService {
    public state: Subject<string> = new BehaviorSubject<string>('info')


}