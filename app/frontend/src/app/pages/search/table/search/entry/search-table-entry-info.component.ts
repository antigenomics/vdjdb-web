import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, ViewContainerRef } from '@angular/core';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { SearchTableRow } from '../row/search-table-row';
import { SearchAvailabilityService } from '../search-availability.service';

interface BadgeInfo {
  letter: string;
  subscript: string;
  color: string;
  borderColor: string;
  active: boolean;
  popupLines: string[];
  popupHeader: string;
  link: string;
}

@Component({
  selector: 'td[search-table-entry-info]',
  template: `
    <div class="info-badges">
      <ng-container *ngFor="let badge of badges">
        <a *ngIf="badge.link && badge.active; else nolinkBadge"
           class="info-badge" [class.info-badge--inactive]="!badge.active"
           [style.background]="badge.color"
           [style.border-color]="badge.borderColor"
           [attr.href]="badge.link" target="_blank" rel="noopener"
           [popup]="badge.popupLines" [header]="badge.popupHeader"
           topShift="-25" shiftStrategy="per-item" width="250" display="list">
          <span class="info-badge__letter">{{ badge.letter }}</span><span
            *ngIf="badge.subscript" class="info-badge__sub">{{ badge.subscript }}</span>
        </a>
        <ng-template #nolinkBadge>
          <span class="info-badge" [class.info-badge--inactive]="!badge.active"
                [style.background]="badge.color"
                [style.border-color]="badge.borderColor"
                [popup]="badge.popupLines" [header]="badge.popupHeader"
                topShift="-25" shiftStrategy="per-item" width="250" display="list">
            <span class="info-badge__letter">{{ badge.letter }}</span><span
              *ngIf="badge.subscript" class="info-badge__sub">{{ badge.subscript }}</span>
          </span>
        </ng-template>
      </ng-container>
    </div>
  `,
  styles: [`
    :host { padding: 2px 4px !important; }
    .info-badges {
      display: inline-block;
      white-space: nowrap;
      font-size: 0;
      line-height: 1;
      vertical-align: middle;
    }
    .info-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 2px;
      border-radius: 3px;
      border: 1.5px solid;
      font-size: 11px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      vertical-align: middle;
      box-sizing: border-box;
      margin-right: 3px;
    }
    .info-badge:hover { filter: brightness(0.88); }
    .info-badge--inactive { opacity: 0.35; }
    .info-badge__letter {
      font-size: 11px;
      line-height: 1;
    }
    .info-badge__sub {
      font-size: 8px;
      font-weight: 600;
      line-height: 1;
      position: relative;
      top: 2px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryInfoComponent extends TableEntry {
  public badges: BadgeInfo[] = [];

  constructor(private availability: SearchAvailabilityService, private changeDetector: ChangeDetectorRef) {
    super();
  }

  public create(entry: string, _column: TableColumn, columns: TableColumn[], row: SearchTableRow,
                _hostViewContainer: ViewContainerRef, _resolver: ComponentFactoryResolver): void {
    const score = parseInt(entry, 10);
    const scoreValue = isNaN(score) ? 0 : score;

    this.badges = [
      this.buildScoreBadge(scoreValue),
      this.buildValidationBadge(),
      this.buildMotifBadge(false, null),
      this.buildStructureBadge(false, null)
    ];

    this.resolveMotif(row, columns);
    this.resolveStructure(row, columns);
  }

  private buildScoreBadge(score: number): BadgeInfo {
    return {
      letter: 'C',
      subscript: String(score),
      color: 'rgba(123, 94, 167, 0.15)',
      borderColor: 'rgba(123, 94, 167, 0.8)',
      active: true,
      popupLines: [`vdjdb_confidence_score : ${score}`],
      popupHeader: 'Confidence',
      link: ''
    };
  }

  private buildValidationBadge(): BadgeInfo {
    return {
      letter: 'V',
      subscript: '',
      color: 'rgba(76, 175, 80, 0.15)',
      borderColor: 'rgba(76, 175, 80, 0.8)',
      active: false,
      popupLines: ['is_validated : \u2013'],
      popupHeader: 'Validation',
      link: ''
    };
  }

  private buildMotifBadge(available: boolean, link: string | null, cid?: string): BadgeInfo {
    if (available) {
      return {
        letter: 'M',
        subscript: '',
        color: 'rgba(255, 193, 7, 0.2)',
        borderColor: 'rgba(255, 193, 7, 0.85)',
        active: true,
        popupLines: ['has_motif : +', 'method : TCRNET', `cid : ${cid || '?'}`],
        popupHeader: 'Motif',
        link: link || ''
      };
    }
    return {
      letter: 'M',
      subscript: '',
      color: 'rgba(255, 193, 7, 0.2)',
      borderColor: 'rgba(255, 193, 7, 0.85)',
      active: false,
      popupLines: ['has_motif : \u2013'],
      popupHeader: 'Motif',
      link: ''
    };
  }

  private buildStructureBadge(available: boolean, link: string | null, popupLines?: string[]): BadgeInfo {
    if (available) {
      return {
        letter: 'S',
        subscript: '',
        color: 'rgba(55, 126, 184, 0.15)',
        borderColor: 'rgba(55, 126, 184, 0.8)',
        active: true,
        popupLines: popupLines || ['has_structure : +'],
        popupHeader: 'Structure',
        link: link || ''
      };
    }
    return {
      letter: 'S',
      subscript: '',
      color: 'rgba(55, 126, 184, 0.15)',
      borderColor: 'rgba(55, 126, 184, 0.8)',
      active: false,
      popupLines: ['has_structure : \u2013'],
      popupHeader: 'Structure',
      link: ''
    };
  }

  private getCellValue(row: SearchTableRow, columns: TableColumn[], columnName: string): string | undefined {
    const columnIndex = columns.findIndex((c) => c.name === columnName);
    if (columnIndex === -1) {
      return undefined;
    }
    return row.getEntries()[columnIndex];
  }

  private extractMotifLinkData(row: SearchTableRow, columns: TableColumn[]):
    { species: string; tcrChain: string; mhcClass: string; mhcAllele: string; epitopeSeq: string } | null {
    const species = this.getCellValue(row, columns, 'species');
    const tcrChain = this.getCellValue(row, columns, 'gene');
    const mhcClass = this.getCellValue(row, columns, 'mhc.class');
    const mhcValue = this.getCellValue(row, columns, 'mhc.a');
    const epitopeSeq = this.getCellValue(row, columns, 'antigen.epitope');

    if (!species || !tcrChain || !mhcClass || !mhcValue || !epitopeSeq) {
      return null;
    }
    return { species, tcrChain, mhcClass, mhcAllele: mhcValue, epitopeSeq };
  }

  private resolveMotif(row: SearchTableRow, columns: TableColumn[]): void {
    const motifData = this.extractMotifLinkData(row, columns);
    if (!motifData) {
      return;
    }

    const { species, tcrChain, mhcClass, mhcAllele, epitopeSeq } = motifData;
    const epitopeGene = this.getCellValue(row, columns, 'antigen.gene') || '';
    const cdr3 = this.getCellValue(row, columns, 'cdr3') || '';
    const vSegm = this.getCellValue(row, columns, 'v.segm') || '';
    const jSegm = this.getCellValue(row, columns, 'j.segm') || '';

    this.availability.hasMotif(species, tcrChain, mhcClass, mhcAllele, epitopeSeq).then(async (available) => {
      if (available) {
        const cid = await this.availability.getMotifCid(species, tcrChain, epitopeSeq, cdr3, vSegm, jSegm).catch(() => undefined);
        if (cid) {
          const params = new URLSearchParams();
          params.set('species', species);
          params.set('tcr_chain', tcrChain);
          params.set('mhc_class', mhcClass);
          params.set('gene', epitopeGene);
          params.set('epitope_seq', epitopeSeq);
          params.set('cid', cid);
          const link = `/motif?${params.toString()}`;
          this.badges[2] = this.buildMotifBadge(true, link, cid);
        } else {
          this.badges[2] = this.buildMotifBadge(false, null);
        }
      } else {
        this.badges[2] = this.buildMotifBadge(false, null);
      }
      this.changeDetector.markForCheck();
    }).catch(() => {});
  }

  private resolveStructure(row: SearchTableRow, columns: TableColumn[]): void {
    const metaValue = this.getCellValue(row, columns, 'meta');

    // PDB priority: extract 4-char PDB ID from meta["structure.id"]
    const pdbId = this.extractPdbId(metaValue);
    if (pdbId) {
      const link = `https://www.rcsb.org/structure/${pdbId.toUpperCase()}`;
      const popupLines = this.buildStructurePopupLines('PDB', pdbId.toUpperCase(), row, columns);
      this.badges[3] = this.buildStructureBadge(true, link, popupLines);
      this.changeDetector.markForCheck();
      return;
    }

    // Model fallback: use TCR_hash of this specific row
    const tcrHash = (this.getCellValue(row, columns, 'TCR_hash') || '').trim();
    if (!tcrHash) {
      return;
    }

    this.availability.hasStructure(tcrHash.toLowerCase()).then((available) => {
      if (available) {
        const link = this.generateStructureLink(row, columns, tcrHash);
        if (link) {
          const popupLines = this.buildStructurePopupLines('model', null, row, columns);
          this.badges[3] = this.buildStructureBadge(true, link, popupLines);
        } else {
          this.badges[3] = this.buildStructureBadge(false, null);
        }
      } else {
        this.badges[3] = this.buildStructureBadge(false, null);
      }
      this.changeDetector.markForCheck();
    }).catch(() => {});
  }

  private extractPdbId(metaValue?: string): string | null {
    if (!metaValue) { return null; }
    try {
      const parsed = JSON.parse(metaValue);
      const raw = parsed['structure.id'];
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (/^[A-Za-z0-9]{4}$/.test(trimmed)) {
          return trimmed;
        }
      }
    } catch { /* not JSON */ }
    return null;
  }


  private buildStructurePopupLines(kind: 'PDB' | 'model', id: string | null, row: SearchTableRow, columns: TableColumn[]): string[] {
    const lines: string[] = [`has_structure : ${kind}`];
    if (id) { lines.push(`id : ${id}`); }
    const cdr3 = this.getCellValue(row, columns, 'cdr3');
    const gene = this.getCellValue(row, columns, 'gene');
    const epitope = this.getCellValue(row, columns, 'antigen.epitope');
    if (gene && cdr3) {
      const chainLabel = (gene === 'TRA') ? 'TRA-peptide' : 'TRB-peptide';
      lines.push(`${chainLabel} : ${cdr3}`);
    }
    if (epitope) { lines.push(`epitope : ${epitope}`); }
    return lines;
  }

  private generateStructureLink(row: SearchTableRow, columns: TableColumn[], cids: string): string | null {
    const species = this.getCellValue(row, columns, 'species');
    const tcrChain = this.getCellValue(row, columns, 'gene');
    const mhcClass = this.getCellValue(row, columns, 'mhc.class');
    const mhcARaw = this.getCellValue(row, columns, 'mhc.a');
    const mhcBRaw = this.getCellValue(row, columns, 'mhc.b');
    const epitopeSeq = this.getCellValue(row, columns, 'antigen.epitope');

    if (!species || !tcrChain || !mhcClass || !mhcARaw || !epitopeSeq || !cids) {
      return null;
    }

    const mhcA = mhcARaw.replace(/:.+/, '');
    const mhcB = mhcBRaw ? mhcBRaw.replace(/:.+/, '') : '';
    const mhcPair = mhcB ? `${mhcA}/${mhcB}` : mhcA;


    const params = new URLSearchParams();
    params.set('species', species);
    params.set('tcr_chain', tcrChain);
    params.set('mhc_class', mhcClass);
    params.set('gene', mhcPair);
    params.set('epitope_seq', epitopeSeq);
    params.set('tcr_hash', cids);
    return `/structure?${params.toString()}`;
  }
}
