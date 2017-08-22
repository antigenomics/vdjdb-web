export class DatabaseColumnInfo {
    private _name: string;
    private _columnType: string;
    private _visible: boolean;
    private _dataType: string;
    private _title: string;
    private _comment: string;
    private _autocomplete: string[];

    constructor(name: string, columnType: string, visible: boolean, dataType: string, title: string, comment: string, autocomplete: string[]) {
        this._name = name;
        this._columnType = columnType;
        this._visible = visible;
        this._dataType = dataType;
        this._title = title;
        this._comment = comment;
        this._autocomplete = autocomplete;
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

    get autocomplete(): string[] {
        return this._autocomplete;
    }

    static deserialize(input: any): DatabaseColumnInfo {
        return new DatabaseColumnInfo(input.name, input.columnType, input.visible, input.dataType, input.title, input.comment, input.autocomplete);
    }

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

    getColumnInfo(columnName: string): DatabaseColumnInfo {
        return this._columns.find((i: DatabaseColumnInfo) => i.name == columnName);
    }

    static deserialize(input: any): DatabaseMetadata {
        return new DatabaseMetadata(input.numberOfRecords, input.numberOfColumns, input.columns.map((c: any) => DatabaseColumnInfo.deserialize(c)));
    }
}