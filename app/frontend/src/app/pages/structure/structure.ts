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

export interface IStructuresMetadataTreeLevel {
  readonly name: string;
  readonly values: IStructuresMetadataTreeLevelValue[];
}

export interface IStructuresMetadataTreeLevelValue {
  readonly value: string;
  readonly hash?: string;
  readonly next: IStructuresMetadataTreeLevel | null;
  isOpened?: boolean;
  isSelected?: boolean;
}

export interface IStructuresMetadata {
  readonly root: IStructuresMetadataTreeLevel;
}

export interface IStructuresSearchTreeFilterEntry {
  readonly name: string;
  readonly value: string;
}

export interface IStructuresSearchTreeFilter {
  readonly entries: IStructuresSearchTreeFilterEntry[];
}

export interface IStructuresSearchTreeFilterResult {
  readonly epitopes: IStructureEpitope[];
}

export interface IStructureEpitopeViewOptions {
  isNormalized: boolean;
}

// StructuresEpitopes

export interface IStructureClusterEntryAA {
  readonly letter: string;
  readonly length: number;
  readonly count: number;
  readonly freq: number;
  readonly I: number;
  readonly INorm: number;
  readonly H: number;
  readonly HNorm: number;
}

export interface IStructureClusterEntry {
  readonly position: number;
  readonly aa: IStructureClusterEntryAA[];
}

export interface IStructureClusterMeta {
  readonly species: string;
  readonly gene: string;
  readonly mhcclass: string;
  readonly mhca: string;
  readonly mhcb: string;
  readonly antigenGene: string;
  readonly antigenSpecies: string;
  readonly cellSubset: string;
}

export interface IStructureVisualization {
  readonly url: string;
  readonly kind: 'image' | 'html';
}

export interface IStructureCluster {
  readonly clusterId: string;
  readonly size: number;
  readonly length: number;
  readonly vsegm: string;
  readonly jsegm: string;
  readonly entries: IStructureClusterEntry[];
  readonly meta: IStructureClusterMeta;
  readonly visualization?: IStructureVisualization;
}

export interface IStructureEpitope {
  readonly epitope: string;
  readonly hash: string;
  readonly clusters: IStructureCluster[];
}

// -------------------------------------------------------------------------------- //

export interface IStructureCDR3SearchEntry {
  info: number;
  cdr3: string;
  cluster: IStructureCluster;
}

export interface IStructureCDR3SearchResultOptions {
  cdr3: string;
  top: number;
  gene: string;
  substring: boolean;
}

export interface IStructureCDR3SearchResult {
  options: IStructureCDR3SearchResultOptions;
  clusters: IStructureCDR3SearchEntry[];
  clustersNorm: IStructureCDR3SearchEntry[];
}

// -------------------------------------------------------------------------------- //

export interface IStructureClusterMembersExportResponse {
  link: string;
}
