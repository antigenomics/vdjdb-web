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

export class SampleTag {
    private static readonly nameRegexp = /^[a-zA-Z0-9_.+-]{1,40}$/;
    private static readonly colorRegexp = /^rgb\([0-9]{1,3},[0-9]{1,3},[0-9]{1,3}\)$/;

    public id: number;
    public name: string;
    public color: string;
    public saved: boolean;
    public editing: boolean = false;
    public loading: boolean = false;

    constructor(id: number, name: string, color: string, saved: boolean = true) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.saved = saved;
    }

    public isSaved(): boolean {
        return this.saved;
    }

    public isEditing(): boolean {
        return this.editing;
    }

    public isLoading(): boolean {
        return this.loading;
    }

    public static isNameValid(name: string): boolean {
        return SampleTag.nameRegexp.test(name);
    }

    public static isColorValid(color: string): boolean {
        return SampleTag.colorRegexp.test(color);
    }

    public static deserialize(o: any): SampleTag {
        return new SampleTag(o[ 'id' ], o[ 'name' ], o[ 'color' ]); // tslint:disable-line:no-string-literal
    }
}