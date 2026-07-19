import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, ViewContainerRef } from '@angular/core';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { SearchTableRow } from '../row/search-table-row';
import { IStructureMetrics, SearchAvailabilityService } from '../search-availability.service';

interface BadgeInfo {
  letter: string;
  subscript: string;
  color: string;
  borderColor: string;
  active: boolean;
  popupLines: string[];
  popupHeader: string;
  link: string;
  footer?: string;
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
           [popup]="badge.popupLines" [header]="badge.popupHeader" [footer]="badge.footer"
           topShift="-25" shiftStrategy="per-item" width="250" display="list">
          <span class="info-badge__letter">{{ badge.letter }}</span><span
            *ngIf="badge.subscript" class="info-badge__sub">{{ badge.subscript }}</span>
        </a>
        <ng-template #nolinkBadge>
          <span class="info-badge" [class.info-badge--inactive]="!badge.active"
                [style.background]="badge.color"
                [style.border-color]="badge.borderColor"
                [popup]="badge.popupLines" [header]="badge.popupHeader" [footer]="badge.footer"
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
      this.buildValidationBadge([]),
      this.buildMotifBadge(false, null),
      this.buildStructureBadge(false, null)
    ];

    this.resolveValidation(row, columns);
    this.resolveMotif(row, columns);
    this.resolveStructure(row, columns);
  }

  private columnTrue(row: SearchTableRow, columns: TableColumn[], columnName: string): boolean {
    return (this.getCellValue(row, columns, columnName) || '').trim().toLowerCase() === 'true';
  }

  private buildScoreBadge(score: number): BadgeInfo {
    return {
      letter: 'C',
      subscript: String(score),
      color: 'rgba(123, 94, 167, 0.15)',
      borderColor: 'rgba(123, 94, 167, 0.8)',
      active: true,
      popupLines: [`Assay confidence : ${score}`],
      popupHeader: 'Confidence',
      link: ''
    };
  }

  private buildValidationBadge(sources: string[]): BadgeInfo {
    const active = sources.length > 0;
    return {
      letter: 'V',
      subscript: '',
      color: 'rgba(76, 175, 80, 0.15)',
      borderColor: 'rgba(76, 175, 80, 0.8)',
      active,
      popupLines: active ? sources : ['Not validated'],
      popupHeader: 'Validation',
      link: ''
    };
  }

  private buildMotifBadge(available: boolean, link: string | null, cid?: string, methods?: Array<'tcrnet' | 'tcremp'>): BadgeInfo {
    if (available) {
      const methodLabels = (methods && methods.length > 0 ? methods : [ 'tcrnet' ])
        .map((m) => (m === 'tcremp' ? 'TCREMP' : 'TCRNET'));
      return {
        letter: 'M',
        subscript: '',
        color: 'rgba(255, 193, 7, 0.2)',
        borderColor: 'rgba(255, 193, 7, 0.85)',
        active: true,
        popupLines: [`Algorithm : ${methodLabels.join(', ')}`, `Motif id : ${cid || '?'}`],
        popupHeader: 'Motif',
        link: link || '',
        footer: 'Click on the icon to open the motif page'
      };
    }
    return {
      letter: 'M',
      subscript: '',
      color: 'rgba(255, 193, 7, 0.2)',
      borderColor: 'rgba(255, 193, 7, 0.85)',
      active: false,
      popupLines: ['No motif'],
      popupHeader: 'Motif',
      link: '',
      footer: 'No motif is available for this record'
    };
  }

  private buildStructureBadge(available: boolean, link: string | null, popupLines?: string[], footer?: string): BadgeInfo {
    if (available) {
      return {
        letter: 'S',
        subscript: '',
        color: 'rgba(55, 126, 184, 0.15)',
        borderColor: 'rgba(55, 126, 184, 0.8)',
        active: true,
        popupLines: popupLines || [],
        popupHeader: 'Structure',
        link: link || '',
        footer: footer !== undefined ? footer : (link ? 'Click on the icon to open the structure page' : undefined)
      };
    }
    return {
      letter: 'S',
      subscript: '',
      color: 'rgba(55, 126, 184, 0.15)',
      borderColor: 'rgba(55, 126, 184, 0.8)',
      active: false,
      popupLines: ['No data'],
      popupHeader: 'Structure',
      link: '',
      footer: 'No structure is available for this record'
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

  private resolveValidation(row: SearchTableRow, columns: TableColumn[]): void {
    const sources: string[] = [];
    if (this.columnTrue(row, columns, 'evidence.validation.same.study')) { sources.push('Additional assay (same study) ✔'); }
    if (this.columnTrue(row, columns, 'evidence.validation.independent')) { sources.push('Independent study ✔'); }
    this.badges[1] = this.buildValidationBadge(sources);

    const cdr3 = this.getCellValue(row, columns, 'cdr3') || '';
    const epitope = this.getCellValue(row, columns, 'antigen.epitope') || '';
    if (!cdr3 || !epitope) { return; }

    this.availability.getValidationStatus(cdr3, epitope).then((status) => {
      if (status) {
        const updated = sources.slice();
        updated.push(`TCRvdb : ${status} ✔`);
        this.badges[1] = this.buildValidationBadge(updated);
        this.changeDetector.markForCheck();
      }
    }).catch(() => {});
  }

  private async resolveMotif(row: SearchTableRow, columns: TableColumn[]): Promise<void> {
    const motifData = this.extractMotifLinkData(row, columns);
    if (!motifData) {
      return;
    }

    const { species, tcrChain, mhcClass, mhcAllele, epitopeSeq } = motifData;
    // The motif page matches `gene` against the trimmed MHC allele (mhc.a, e.g. HLA-A*02),
    // NOT antigen.gene. Trim the ":..." suffix to match the motif metadata tree.
    const motifGene = mhcAllele.replace(/:.+/, '');
    const cdr3 = this.getCellValue(row, columns, 'cdr3') || '';
    const vSegm = this.getCellValue(row, columns, 'v.segm') || '';
    const jSegm = this.getCellValue(row, columns, 'j.segm') || '';

    const methods: Array<'tcrnet' | 'tcremp'> = [ 'tcrnet', 'tcremp' ];
    const availableMethods: Array<'tcrnet' | 'tcremp'> = [];
    let link: string | null = null;
    let cid: string | undefined;

    for (const method of methods) {
      try {
        const available = await this.availability.hasMotif(species, tcrChain, mhcClass, mhcAllele, epitopeSeq, method);
        if (!available) { continue; }
        const methodCid = await this.availability.getMotifCid(species, tcrChain, epitopeSeq, cdr3, vSegm, jSegm, method).catch(() => undefined);
        if (!methodCid) { continue; }
        availableMethods.push(method);
        if (link === null) {
          cid = methodCid;
          const params = new URLSearchParams();
          params.set('species', species);
          params.set('tcr_chain', tcrChain);
          params.set('mhc_class', mhcClass);
          params.set('mhc_a', motifGene);
          params.set('epitope_seq', epitopeSeq);
          params.set('cid', methodCid);
          if (method === 'tcremp') { params.set('method', 'tcremp'); }
          link = `/motif?${params.toString()}`;
        }
      } catch { /* try next method */ }
    }

    this.badges[2] = availableMethods.length > 0
      ? this.buildMotifBadge(true, link, cid, availableMethods)
      : this.buildMotifBadge(false, null);
    this.changeDetector.markForCheck();
  }

  private resolveStructure(row: SearchTableRow, columns: TableColumn[]): void {
    const isNative = this.columnTrue(row, columns, 'evidence.structure.native');
    const types: string[] = [];
    if (isNative) { types.push('Native (experimental)'); }
    if (this.columnTrue(row, columns, 'evidence.structure.contacts')) { types.push('Model with contacts'); }
    if (this.columnTrue(row, columns, 'evidence.structure.quality')) { types.push('Good-quality model'); }

    if (types.length === 0) {
      this.badges[3] = this.buildStructureBadge(false, null);
      return;
    }

    const popup = [ ...types ];

    // Native experimental structure => surface the PDB accession (tooltip line + RCSB fallback link).
    // The badge prefers the internal /structure viewer; when the complex isn't visualized in VDJdb yet
    // it falls back to the PDB entry and is flagged with a "!" badge. isPdbId matches a legacy 4-char
    // accession (1ABC) or the extended pdb_XXXXXXXX form (wwpdb.org/documentation/new-format-for-pdb-ids).
    let pdbLink: string | null = null;
    if (isNative) {
      const structId = this.extractStructureId(this.getCellValue(row, columns, 'meta'));
      if (structId && this.isPdbId(structId)) {
        popup.push(`PDB : ${structId}`);
        pdbLink = `https://www.rcsb.org/structure/${structId.toUpperCase()}`;
      }
    }

    const tcrHash = (this.getCellValue(row, columns, 'TCR_hash') || '').trim();

    this.badges[3] = this.buildStructureBadge(true, null, popup);
    this.appendStructureMetrics(tcrHash, popup);

    this.availability.hasStructure(tcrHash.toLowerCase()).then((available) => {
      let link: string | null = null;
      if (tcrHash && available) {
        // Internal complementarity-map viewer exists → open it.
        link = this.generateStructureLink(row, columns, tcrHash);
      } else if (pdbLink) {
        // Native structure not yet in VDJdb → link to the PDB entry and flag it with a "!" badge.
        link = pdbLink;
        this.addNotInVdjdbBadge();
      }
      const currentFooter = this.badges[3] ? this.badges[3].footer : undefined;
      this.badges[3] = this.buildStructureBadge(true, link, popup, currentFooter);
      this.changeDetector.markForCheck();
    }).catch(() => {});
  }

  // Flags a native experimental structure whose complex is not yet visualized in VDJdb; the "S" badge
  // falls back to the PDB entry in that case. Informational only (tooltip, no link).
  private addNotInVdjdbBadge(): void {
    if (this.badges.some((badge) => badge.letter === '!')) {
      return;
    }
    this.badges.push({
      letter: '!',
      subscript: '',
      color: 'rgba(244, 67, 54, 0.15)',
      borderColor: 'rgba(244, 67, 54, 0.85)',
      active: true,
      popupLines: [ 'Structure not yet in VDJdb' ],
      popupHeader: 'Structure',
      link: ''
    });
  }

  // Structure model metrics (contacts / ipTM / confidence / binding-mode) are joined by
  // TCR_hash from the availability index and appended to the "S" badge tooltip.
  private appendStructureMetrics(tcrHash: string, popup: string[]): void {
    if (!tcrHash) {
      return;
    }
    this.availability.getStructureMetrics(tcrHash.toLowerCase()).then((metrics) => {
      if (!metrics) {
        return;
      }
      const lines = this.buildStructureMetricLines(metrics);
      if (lines.length === 0) {
        return;
      }
      lines.forEach((line) => popup.push(line));
      const footer = this.buildStructureFooter(metrics);
      const currentLink = this.badges[3] ? this.badges[3].link : '';
      this.badges[3] = this.buildStructureBadge(true, currentLink || null, popup, footer);
      this.changeDetector.markForCheck();
    }).catch(() => {});
  }

  private buildStructureMetricLines(m: IStructureMetrics): string[] {
    const lines: string[] = [];
    if (m.numContacts !== undefined && m.numContacts !== null) {
      lines.push(m.numContacts === 0 ? 'Contacts : 0 (no CDR3–peptide contacts)' : `Contacts : ${m.numContacts}`);
    }
    if (m.iptm !== undefined && m.iptm !== null) {
      const pct = (m.iptmPct !== undefined && m.iptmPct !== null) ? ` (${m.iptmPct}%)` : '';
      lines.push(`ipTM : ${m.iptm.toFixed(2)}${pct}`);
    }
    if (m.confidence !== undefined && m.confidence !== null) {
      const pct = (m.confidencePct !== undefined && m.confidencePct !== null) ? ` (${m.confidencePct}%)` : '';
      lines.push(`TCRmodel2 conf : ${m.confidence.toFixed(2)}${pct}`);
    }
    if (m.bindingModeOutlier) {
      lines.push('Binding mode : outlier');
    }
    return lines;
  }

  private buildStructureFooter(m: IStructureMetrics): string | undefined {
    const parts: string[] = [];
    if ((m.iptmPct !== undefined && m.iptmPct !== null) || (m.confidencePct !== undefined && m.confidencePct !== null)) {
      parts.push('% = rank across all modelled VDJdb structures');
    }
    if (m.bindingModeOutlier) {
      parts.push('outlier = docking angle outside 95% CI');
    }
    return parts.length > 0 ? parts.join('; ') : undefined;
  }

  private isPdbId(id: string): boolean {
    // Legacy 4-char accession (e.g. 1ABC) or the extended pdb_XXXXXXXX form (e.g. pdb_00001abc).
    return /^[A-Za-z0-9]{4}$/.test(id) || /^pdb_[A-Za-z0-9]{8}$/i.test(id);
  }

  private extractStructureId(metaValue?: string): string | null {
    if (!metaValue) { return null; }
    const parsed = JSON.parse(metaValue);
    const raw = parsed['structure.id'];
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
    return null;
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
