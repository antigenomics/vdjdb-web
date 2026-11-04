import { StructureDownload } from './structure-download';

describe('StructureDownload', () => {
    it('requests the prepared hash bundle while retaining the readable download name', () => {
        let requested = '';
        let download = '';
        spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function(this: HTMLAnchorElement) {
            requested = this.getAttribute('href') || '';
            download = this.download;
        });
        const hash = 'a'.repeat(64);
        StructureDownload.bundle({ clusterId: hash } as any, 'NLVPMVATV');
        expect(requested).toBe('/structure-files/structure/' + hash + '_all.zip');
        expect(download).toBe('NLVPMVATV_aaaaaa.zip');
    });
});
