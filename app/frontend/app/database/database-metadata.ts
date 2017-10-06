export interface IDatabaseColumnInfo {
    name: string;
    columnType: string;
    visible: boolean;
    dataType: string;
    title: string;
    comment: string;
    values: string[];
}

export class DatabaseColumnInfo {

    private _name: string;
    private _columnType: string;
    private _visible: boolean;
    private _dataType: string;
    private _title: string;
    private _comment: string;
    private _values: string[];

    constructor(name: string, columnType: string, visible: boolean, dataType: string, title: string, comment: string, values: string[]) {
        this._name = name;
        this._columnType = columnType;
        this._visible = visible;
        this._dataType = dataType;
        this._title = title;
        this._comment = comment;
        this._values = values;
    }

    get name(): string {
        return this._name;
    }

    get columnType(): string {
        return this._columnType;
    }

    get visible(): boolean {
        return this._visible;
    }

    get dataType(): string {
        return this._dataType;
    }

    get title(): string {
        return this._title;
    }

    get comment(): string {
        return this._comment;
    }

    get values(): string[] {
        return this._values;
    }

    public static deserialize(input: IDatabaseColumnInfo): DatabaseColumnInfo {
        return new DatabaseColumnInfo(input['name'], input['columnType'], input['visible'],
            input['dataType'], input['title'], input['comment'], input['values']);
    }
}

export interface IDatabaseMetadata {
    numberOfRecords: number;
    numberOfColumns: number;
    columns: any[];
}

export class DatabaseMetadata {
    private _numberOfRecords: number;
    private _numberOfColumns: number;
    private _columns: DatabaseColumnInfo[];

    constructor(numberOfRecords: number, numberOfColumns: number, columns: DatabaseColumnInfo[]) {
        this._numberOfRecords = numberOfRecords;
        this._numberOfColumns = numberOfColumns;
        this._columns = columns;
    }

    get numberOfRecords(): number {
        return this._numberOfRecords;
    }

    get numberOfColumns(): number {
        return this._numberOfColumns;
    }

    get columns(): DatabaseColumnInfo[] {
        return this._columns;
    }

    public getColumnInfo(columnName: string): DatabaseColumnInfo {
        return this._columns.find((i: DatabaseColumnInfo) => i.name === columnName);
    }

    public static deserialize(input: IDatabaseMetadata): DatabaseMetadata {
        return new DatabaseMetadata(input['numberOfRecords'], input['numberOfColumns'], input['columns'].map((c: any) => DatabaseColumnInfo.deserialize(c)));
    }

}
