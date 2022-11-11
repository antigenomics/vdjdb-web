export class RefSearchTableRow {
    public readonly pmid: string;
    public readonly tf_idf: string;
  
    constructor(response: any) {
      /* tslint:disable:no-string-literal */
      this.pmid = response[ 'pmid' ];
      this.tf_idf = response[ 'tf_idf' ];
      /* tslint:enable:no-string-literal */
    }
  }