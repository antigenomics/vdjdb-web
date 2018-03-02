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

export class TableColumn {
    public readonly name: string;
    public readonly title: string;
    public readonly sortable: boolean;
    public readonly skip: boolean;
    public readonly noEntry: boolean;

    public readonly popup: boolean = false;
    public readonly popupContent: string = '';
    public readonly popupFooter: string = '';

    constructor(name: string, title: string, sortable: boolean = true, skip: boolean = false, noEntry: boolean = false,
                popup?: boolean, popupContent?: string, popupFooter?: string) {
        this.name = name;
        this.title = title;
        this.sortable = sortable;
        this.skip = skip;
        this.noEntry = noEntry;
        if (popup !== undefined) {
            this.popup = popup;
            this.popupContent = popupContent;
            this.popupFooter = popupFooter;
        }
    }
}
