export class DatabaseColumn {
    name: string;
    type: string;
    visible: boolean;
    searchable: boolean;
    dataType: string;
    title: string;
    comment: string;
    autocomplete: string;
    values: string[];
}

export class DatabaseMetadata {
    columns: DatabaseColumn[];
}