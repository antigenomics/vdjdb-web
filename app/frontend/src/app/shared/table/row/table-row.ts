/*
 *     Copyright 2017 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

import { ComponentFactoryResolver, ComponentRef, ViewContainerRef } from '@angular/core';
import { TableColumn } from '../column/table-column';

export abstract class TableRow {
    public readonly entries: string[];

    constructor(entries: string[]) {
        this.entries = entries;
    }

    public abstract create(entry: string, column: TableColumn, hostViewContainer: ViewContainerRef,
                           rowViewContainer: ViewContainerRef, resolver: ComponentFactoryResolver): ComponentRef<any>;
}
