/*
 *     Copyright 2017-2018 Bagaev Dmitry
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

export interface MotifClusterEntryAA {
  readonly aa: string;
  readonly len: number;
  readonly count: number;
  readonly F: number;
  readonly I: number;
  readonly H: number;
}

export interface MotifClusterEntry {
  readonly pos: number;
  readonly aa: MotifClusterEntryAA[];
}

export interface MotifCluster {
  readonly cid: string;
  readonly size: number;
  readonly entries: MotifClusterEntry[];
}

export interface MotifEpitope {
  isSelected?: boolean;
  readonly epitope: string;
  readonly clusters: MotifCluster[];
}


export interface MotifsMetadataEntry {
  readonly species: string;
  readonly gene: string;
  readonly mhcclass: string;
  readonly mhcgroup: string;
  readonly epitopes: MotifEpitope[];
}

export interface MotifsMetadata {
  readonly entries: MotifsMetadataEntry[];
}






