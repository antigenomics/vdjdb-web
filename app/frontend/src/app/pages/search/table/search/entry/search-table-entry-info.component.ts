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
      letter: 'S',
      subscript: String(score),
      color: 'rgba(123, 94, 167, 0.15)',
      borderColor: 'rgba(123, 94, 167, 0.8)',
      active: true,
      popupLines: [`vdjdb_legacy_score : ${score}`],
      popupHeader: 'Score',
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

  private buildMotifBadge(available: boolean, link: string | null): BadgeInfo {
    if (available) {
      return {
        letter: 'M',
        subscript: '',
        color: 'rgba(255, 193, 7, 0.2)',
        borderColor: 'rgba(255, 193, 7, 0.85)',
        active: true,
        popupLines: ['has_motif : +', 'method : TCRNET'],
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

  private buildStructureBadge(available: boolean, link: string | null): BadgeInfo {
    if (available) {
      return {
        letter: 'C',
        subscript: '',
        color: 'rgba(55, 126, 184, 0.15)',
        borderColor: 'rgba(55, 126, 184, 0.8)',
        active: true,
        popupLines: ['has_structure : +'],
        popupHeader: 'Structure',
        link: link || ''
      };
    }
    return {
      letter: 'C',
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
    { species: string; tcrChain: string; mhcClass: string; gene: string; epitopeSeq: string } | null {
    const species = this.getCellValue(row, columns, 'species');
    const tcrChain = this.getCellValue(row, columns, 'gene');
    const mhcClass = this.getCellValue(row, columns, 'mhc.class');
    const mhcValue = this.getCellValue(row, columns, 'mhc.a');
    const gene = mhcValue ? mhcValue.replace(/:.+/, '') : undefined;
    const epitopeSeq = this.getCellValue(row, columns, 'antigen.epitope');

    if (!species || !tcrChain || !mhcClass || !gene || !epitopeSeq) {
      return null;
    }
    return { species, tcrChain, mhcClass, gene, epitopeSeq };
  }

  private resolveMotif(row: SearchTableRow, columns: TableColumn[]): void {
    const motifData = this.extractMotifLinkData(row, columns);
    if (!motifData) {
      return;
    }

    const { species, tcrChain, mhcClass, gene, epitopeSeq } = motifData;
    this.availability.hasMotif(species, tcrChain, mhcClass, gene, epitopeSeq).then((available) => {
      let link: string | null = null;
      if (available) {
        const params = new URLSearchParams();
        params.set('species', species);
        params.set('tcr_chain', tcrChain);
        params.set('mhc_class', mhcClass);
        params.set('gene', gene);
        params.set('epitope_seq', epitopeSeq);
        link = `/motif?${params.toString()}`;
      }
      this.badges[2] = this.buildMotifBadge(available, link);
      this.changeDetector.markForCheck();
    }).catch(() => {});
  }

  private resolveStructure(row: SearchTableRow, columns: TableColumn[]): void {
    const metaValue = this.getCellValue(row, columns, 'meta');
    const contactsValue = this.getCellValue(row, columns, 'contacts');
    const structureId = this.extractStructureId(metaValue, contactsValue);

    if (!structureId) {
      return;
    }

    const normalizedId = structureId.toLowerCase();
    this.availability.hasStructure(normalizedId).then((available) => {
      let link: string | null = null;
      if (available) {
        link = this.generateStructureLink(row, columns, structureId);
        const popupLines = ['has_structure : +', `id : ${structureId}`];
        this.badges[3] = {
          ...this.buildStructureBadge(true, link),
          popupLines
        };
      } else {
        this.badges[3] = this.buildStructureBadge(false, null);
      }
      this.changeDetector.markForCheck();
    }).catch(() => {});
  }

  private extractStructureId(metaValue?: string, contactsValue?: string): string {
    if (contactsValue) {
      const trimmed = contactsValue.trim();
      if (trimmed) {
        try {
          const parsed = JSON.parse(trimmed);
          const id = this.findStructureIdInObject(parsed);
          if (id) { return id; }
        } catch { /* not JSON */ }
        if (/^[A-Za-z0-9_-]{4,}$/.test(trimmed)) {
          return trimmed;
        }
      }
    }
    if (metaValue) {
      try {
        const parsed = JSON.parse(metaValue);
        if (parsed['structure.id'] && String(parsed['structure.id']).trim()) {
          return String(parsed['structure.id']).trim();
        }
      } catch { /* not JSON */ }
    }
    return '';
  }

  private findStructureIdInObject(obj: any): string | undefined {
    if (!obj || typeof obj !== 'object') { return undefined; }
    const keys = ['structure', 'structure_id', 'structureId', 'structure.id', 'hash', 'id', 'TCR_hash'];
    for (const key of keys) {
      const val = obj[key];
      if (typeof val === 'string' && val.trim() && /^[A-Za-z0-9_-]{4,}$/.test(val.trim())) {
        return val.trim();
      }
    }
    return undefined;
  }

  private generateStructureLink(row: SearchTableRow, columns: TableColumn[], structureId: string): string | null {
    const species = this.getCellValue(row, columns, 'species');
    const tcrChain = this.getCellValue(row, columns, 'gene');
    const mhcClass = this.getCellValue(row, columns, 'mhc.class');
    const mhcValue = this.getCellValue(row, columns, 'mhc.a');
    const gene = mhcValue ? mhcValue.replace(/:.+/, '') : undefined;
    const epitopeSeq = this.getCellValue(row, columns, 'antigen.epitope');

    if (!species || !tcrChain || !mhcClass || !gene || !epitopeSeq || !structureId) {
      return null;
    }

    const params = new URLSearchParams();
    params.set('species', species);
    params.set('tcr_chain', tcrChain);
    params.set('mhc_class', mhcClass);
    params.set('gene', gene.replace(/:.+/, ''));
    params.set('epitope_seq', epitopeSeq);
    params.set('structure_id', structureId);
    return `/structure?${params.toString()}`;
  }
}
