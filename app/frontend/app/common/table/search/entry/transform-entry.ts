export class TransformEntry {

    static transform(value: string, column: string) {
        switch (column) {
            case 'method':
            case 'meta':
            case 'cdr3fix':
                return TransformEntry.jsonTransform(value);
            default:
                return value;
        }
    }

    static jsonTransform(_: string) {
        return '<i class="info circle icon"></i>';
    }

}