/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

export class DatabaseColumnInfo {
    public readonly name: string;
    public readonly columnType: string;
    public readonly visible: boolean;
    public readonly dataType: string;
    public readonly title: string;
    public readonly comment: string;
    public readonly values: string[];

    constructor(name: string, columnType: string, visible: boolean, dataType: string, title: string, comment: string, values: string[]) {
        this.name = name;
        this.columnType = columnType;
        this.visible = visible;
        this.dataType = dataType;
        this.title = title;
        this.comment = comment;
        this.values = values;
    }

    public static deserialize(input: any): DatabaseColumnInfo {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        return new DatabaseColumnInfo(input['name'], input['columnType'], input['visible'],
            input['dataType'], input['title'], input['comment'], input['values']);
        /* tslint:enable:no-string-literal */
    }
}

export class DatabaseMetadata {
    public readonly numberOfRecords: number;
    public readonly numberOfColumns: number;
    public readonly columns: DatabaseColumnInfo[];

    constructor(numberOfRecords: number, numberOfColumns: number, columns: DatabaseColumnInfo[]) {
        this.numberOfRecords = numberOfRecords;
        this.numberOfColumns = numberOfColumns;
        this.columns = columns;
    }

    public getColumnInfo(columnName: string): DatabaseColumnInfo {
        return this.columns.find((i: DatabaseColumnInfo) => i.name === columnName);
    }

    public static deserialize(input: any): DatabaseMetadata {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        return new DatabaseMetadata(input['numberOfRecords'], input['numberOfColumns'], input['columns'].map((c: any) => DatabaseColumnInfo.deserialize(c)));
        /* tslint:enable:no-string-literal */
    }

}
