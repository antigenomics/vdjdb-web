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

export interface IMotifsMetadataTreeLevel {
  readonly name: string;
  readonly values: IMotifsMetadataTreeLevelValue[];
}

export interface IMotifsMetadataTreeLevelValue {
  readonly value: string;
  readonly description?: string;
  readonly next: IMotifsMetadataTreeLevel | null;
  isOpened?: boolean;
  isSelected?: boolean;
}

export interface IMotifsMetadata {
  readonly root: IMotifsMetadataTreeLevel;
}

export interface IMotifsSearchTreeFilterEntry {
  readonly name: string;
  readonly value: string;
}

export interface IMotifsSearchTreeFilter {
  readonly entries: IMotifsSearchTreeFilterEntry[];
}

export interface IMotifsSearchTreeFilterResult {
  readonly epitopes: IMotifEpitope[];
}

export interface IMotifEpitopeViewOptions {
  isNormalized: boolean;
}

// MotifsEpitopes

export interface IMotifClusterEntryAA {
  readonly letter: string;
  readonly length: number;
  readonly count: number;
  readonly freq: number;
  readonly I: number;
  readonly INorm: number;
  readonly H: number;
  readonly HNorm: number;
}

export interface IMotifClusterEntry {
  readonly position: number;
  readonly aa: IMotifClusterEntryAA[];
}

export interface IMotifClusterMeta {
  readonly species: string;
  readonly gene: string;
  readonly mhcclass: string;
  readonly mhca: string;
  readonly mhcb: string;
  readonly antigenGene: string;
  readonly antigenSpecies: string;
}

export interface IMotifCluster {
  readonly clusterId: string;
  readonly size: number;
  readonly length: number;
  readonly vsegm: string;
  readonly jsegm: string;
  readonly entries: IMotifClusterEntry[];
  readonly meta: IMotifClusterMeta;
}

export interface IMotifEpitope {
  readonly epitope: string;
  readonly clusters: IMotifCluster[];
}

// -------------------------------------------------------------------------------- //

export interface IMotifCDR3SearchEntry {
  info: number;
  cdr3: string;
  cluster: IMotifCluster;
}

export interface IMotifCDR3SearchResultOptions {
  cdr3: string;
  top: number;
  gene: string;
  substring: boolean;
}

export interface IMotifCDR3SearchResult {
  options: IMotifCDR3SearchResultOptions;
  clusters: IMotifCDR3SearchEntry[];
  clustersNorm: IMotifCDR3SearchEntry[];
}

// -------------------------------------------------------------------------------- //

export interface IMotifClusterMembersExportResponse {
  link: string;
}
