import { Injectable } from '@angular/core';
import { DatabaseMetadata } from "./DatabaseMetadata";

@Injectable()
export class DatabaseService {
    private metadata: DatabaseMetadata;

    init() : void {
        console.log('Database service initializing')
    }
}