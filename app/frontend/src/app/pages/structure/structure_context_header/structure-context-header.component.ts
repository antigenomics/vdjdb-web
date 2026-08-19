/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { IStructuresMetadata, IStructuresMetadataTreeLevelValue } from 'pages/structure/structure';
import { StructureMetadataTree } from 'pages/structure/structure-metadata-tree';
import { StructureEpitopeComboController } from 'pages/structure/structure_context_header/structure-epitope-combo.controller';
import { Subscription } from 'rxjs';

interface IStructureQueryParams {
  species?: string | null;
  tcr_chain?: string | null;
  mhc_class?: string | null;
  gene?: string | null;
  epitope_seq?: string | null;
  structure_id?: string | null;
  query?: string | null;
  substring?: string | null;
  cdr3_chain?: string | null;
}

@Component({
  selector:        'structure-context-header',
  templateUrl:     './structure-context-header.component.html',
  styleUrls:       [ './structure-context-header.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StructureContextHeaderComponent implements OnInit, OnDestroy {
  private static readonly cdr3ChainValues: string[] = [ 'a', 'b', 'ab' ];
  private static readonly cdr3ChainLabels: { [chain: string]: string } = {
    a: 'CDR3α',
    b: 'CDR3β',
    ab: 'CDR3α/β'
  };

  @ViewChild('epitopeInputElement')
  public set epitopeInputElement(element: ElementRef<HTMLInputElement>) {
    this.epitopeCombo.bindInput(element);
    this._epitopeInputElement = element;
  }

  public get epitopeInputElement(): ElementRef<HTMLInputElement> {
    return this._epitopeInputElement;
  }

  private _epitopeInputElement: ElementRef<HTMLInputElement>;

  @Input()
  public set metadata(value: IStructuresMetadata | null) {
    this._metadata = value;
    this.syncSelectionFromParams();
  }

  public get metadata(): IStructuresMetadata | null {
    return this._metadata;
  }

  public mhcClassValue: string | null = null;
  public mhcGeneValue: string | null = null;
  public epitopeValue: string | null = null;
  public epitopeCombo: StructureEpitopeComboController = new StructureEpitopeComboController();
  public cdr3Query: string = '';
  public cdr3Substring: boolean = false;
  public cdr3Chain: string = 'a';

  private routeSubscription: Subscription;
  private currentParams: IStructureQueryParams = {};
  private _metadata: IStructuresMetadata | null = null;

  constructor(private route: ActivatedRoute, private router: Router) {}

  public ngOnInit(): void {
    this.routeSubscription = this.route.queryParamMap.subscribe((params) => {
      this.currentParams = this.toQueryParams(params);
      this.syncSelectionFromParams();
    });
  }

  public ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  public get mhcClassValues(): IStructuresMetadataTreeLevelValue[] {
    return this.metadata && this.metadata.root ? this.metadata.root.values : [];
  }

  public get mhcGeneValues(): IStructuresMetadataTreeLevelValue[] {
    const node = StructureMetadataTree.findMhcClass(this.metadata, this.mhcClassValue);
    return node && node.next ? node.next.values : [];
  }

  public get epitopeValues(): IStructuresMetadataTreeLevelValue[] {
    const node = StructureMetadataTree.findMhcGene(
      StructureMetadataTree.findMhcClass(this.metadata, this.mhcClassValue), this.mhcGeneValue);
    return node && node.next ? node.next.values : [];
  }

  public get filteredEpitopeValues(): IStructuresMetadataTreeLevelValue[] {
    return this.epitopeCombo.filter(this.epitopeValues);
  }

  public get epitopeInputValue(): string {
    return this.epitopeCombo.value(this.epitopeValue);
  }

  public get epitopeInputPlaceholder(): string {
    return this.epitopeCombo.placeholder(this.epitopeValue);
  }

  public onMhcClassSelect(value: IStructuresMetadataTreeLevelValue): void {
    this.mhcClassValue = value.value;
    this.mhcGeneValue = null;
    this.epitopeValue = null;
    this.epitopeCombo.query = '';
    this.epitopeCombo.close();
    this.updateQueryParams({
      mhc_class: this.mhcClassValue,
      gene: null,
      epitope_seq: null,
      query: null,
      substring: null
    });
  }

  public onMhcGeneSelect(value: IStructuresMetadataTreeLevelValue): void {
    this.mhcGeneValue = value.value;
    this.epitopeValue = null;
    this.epitopeCombo.query = '';
    this.epitopeCombo.close();
    this.updateQueryParams({
      mhc_class: this.mhcClassValue,
      gene: StructureMetadataTree.normalizeMhcPair(this.mhcGeneValue),
      epitope_seq: null,
      query: null,
      substring: null
    });
  }

  public onEpitopeSelect(value: IStructuresMetadataTreeLevelValue): void {
    this.epitopeValue = value.value;
    this.epitopeCombo.commit();
    this.updateQueryParams({
      mhc_class: this.mhcClassValue,
      gene: StructureMetadataTree.normalizeMhcPair(this.mhcGeneValue),
      epitope_seq: this.epitopeValue,
      structure_id: null,
      query: null,
      substring: null
    });
  }

  public onEpitopeDropdownClick(event: MouseEvent): void {
    if (!this.mhcGeneValue) {
      return;
    }
    const target = event.target as any;
    if (target && typeof target.closest === 'function' && target.closest('.menu')) {
      return;
    }
    event.stopPropagation();
    this.epitopeCombo.isOpen = true;
    if (this.epitopeInputElement && this.epitopeInputElement.nativeElement) {
      this.epitopeInputElement.nativeElement.focus();
    }
  }

  public onEpitopeInputFocus(): void {
    this.epitopeCombo.onFocus(!!this.mhcGeneValue);
  }

  public onEpitopeInputBlur(): void {
    this.epitopeCombo.onBlur();
  }

  public onEpitopeInputChange(value: string): void {
    this.epitopeCombo.onInput(value, !!this.mhcGeneValue);
  }

  public onEpitopeOptionMouseDown(event: MouseEvent, value: IStructuresMetadataTreeLevelValue): void {
    event.preventDefault();
    event.stopPropagation();
    this.onEpitopeSelect(value);
  }

  public isNoEpitopeMatchesVisible(): boolean {
    return this.epitopeCombo.isEmptyResult(this.epitopeValues);
  }

  public get cdr3ChainOptions(): string[] {
    const selected = this.normalizeCdr3Chain(this.cdr3Chain);
    return StructureContextHeaderComponent.cdr3ChainValues.filter((value) => value !== selected);
  }

  public get cdr3ChainLabel(): string {
    return this.getCdr3ChainLabel(this.cdr3Chain);
  }

  public getCdr3ChainLabel(value: string): string {
    const normalized = this.normalizeCdr3Chain(value);
    return StructureContextHeaderComponent.cdr3ChainLabels[normalized] || StructureContextHeaderComponent.cdr3ChainLabels.a;
  }

  public setCdr3Chain(value: string): void {
    this.cdr3Chain = this.normalizeCdr3Chain(value);
  }

  public onCdr3ChainTriggerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    if (target && typeof target.click === 'function') {
      target.click();
    }
  }

  public onCdr3Search(): void {
    const query = this.cdr3Query ? this.cdr3Query.trim() : '';
    if (!query) {
      return;
    }
    this.updateQueryParams({
      query,
      substring: this.cdr3Substring ? '1' : null,
      cdr3_chain: this.normalizeCdr3Chain(this.cdr3Chain),
      mhc_class: null,
      gene: null,
      epitope_seq: null,
      structure_id: null,
      species: null,
      tcr_chain: null
    });
  }

  private updateQueryParams(changes: IStructureQueryParams): void {
    const params: IStructureQueryParams = {
      species: this.currentParams.species || null,
      tcr_chain: this.currentParams.tcr_chain || null,
      mhc_class: this.currentParams.mhc_class || null,
      gene: this.currentParams.gene || null,
      epitope_seq: this.currentParams.epitope_seq || null,
      structure_id: this.currentParams.structure_id || null,
      query: this.currentParams.query || null,
      substring: this.currentParams.substring || null,
      cdr3_chain: this.currentParams.cdr3_chain || null,
      ...changes
    };

    if (params.query) {
      params.mhc_class = null;
      params.gene = null;
      params.epitope_seq = null;
      params.structure_id = null;
    } else {
      params.substring = null;
      params.cdr3_chain = null;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params
    });
  }

  private syncSelectionFromParams(): void {
    const previousMhcClassValue = this.mhcClassValue;
    const previousMhcGeneValue = this.mhcGeneValue;
    const query = this.currentParams.query || '';
    this.cdr3Query = query;
    this.cdr3Substring = this.currentParams.substring === '1' || this.currentParams.substring === 'true';
    this.cdr3Chain = this.normalizeCdr3Chain(this.currentParams.cdr3_chain);
    this.epitopeCombo.close();

    if (!this.metadata || !this.metadata.root) {
      this.mhcClassValue = null;
      this.mhcGeneValue = null;
      this.epitopeValue = null;
      this.epitopeCombo.query = '';
      return;
    }

    const mhcClassNode = StructureMetadataTree.findMhcClass(this.metadata, this.currentParams.mhc_class || null);
    if (!mhcClassNode) {
      this.mhcClassValue = null;
      this.mhcGeneValue = null;
      this.epitopeValue = null;
      this.epitopeCombo.query = '';
      return;
    }
    this.mhcClassValue = mhcClassNode.value;

    const mhcGeneNode = StructureMetadataTree.findMhcGene(mhcClassNode, this.currentParams.gene || null);
    if (!mhcGeneNode) {
      this.mhcGeneValue = null;
      this.epitopeValue = null;
      this.epitopeCombo.query = '';
      return;
    }
    this.mhcGeneValue = mhcGeneNode.value;
    if (previousMhcClassValue !== this.mhcClassValue || previousMhcGeneValue !== this.mhcGeneValue) {
      this.epitopeCombo.query = '';
    }

    const epitopeNode = StructureMetadataTree.findEpitope(mhcGeneNode, this.currentParams.epitope_seq || null);
    this.epitopeValue = epitopeNode ? epitopeNode.value : null;
    if (this.epitopeValue) {
      this.epitopeCombo.query = '';
    }
  }

  private toQueryParams(params: ParamMap): IStructureQueryParams {
    return {
      species: params.get('species'),
      tcr_chain: params.get('tcr_chain'),
      mhc_class: params.get('mhc_class'),
      gene: params.get('gene'),
      epitope_seq: params.get('epitope_seq'),
      structure_id: params.get('structure_id'),
      query: params.get('query'),
      substring: params.get('substring'),
      cdr3_chain: params.get('cdr3_chain')
    };
  }

  private normalizeCdr3Chain(value: string | null | undefined): string {
    const normalized = (value || '').trim().toLowerCase();
    return StructureContextHeaderComponent.cdr3ChainValues.indexOf(normalized) !== -1 ? normalized : 'a';
  }

}
