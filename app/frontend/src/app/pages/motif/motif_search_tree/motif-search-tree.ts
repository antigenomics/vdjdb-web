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

import { MotifEpitope, MotifsMetadata } from 'pages/motif/motif';

export interface MotifSearchTreeMHCGroup {
  isOpened: boolean;
  isSelected: boolean;
  readonly mhcgroup: string;
  readonly epitopes: MotifEpitope[];
}

export interface MotifSearchTreeMHCClass {
  isOpened: boolean;
  isSelected: boolean;
  readonly mhcclass: string;
  readonly mhcgroups: MotifSearchTreeMHCGroup[];
}

export interface MotifSearchTreeGene {
  isOpened: boolean;
  isSelected: boolean;
  readonly gene: string;
  readonly mhcclasses: MotifSearchTreeMHCClass[];
}

export interface MotifSearchTreeSpecies {
  isOpened: boolean;
  isSelected: boolean;
  readonly species: string;
  readonly genes: MotifSearchTreeGene[];
}

export interface MotifSearchTree {
  readonly species: MotifSearchTreeSpecies[];
}

export function motifSearchTreefromMetadata(metadata: MotifsMetadata): MotifSearchTree {
  return {
    species: Array.from(new Set(metadata.entries.map((e) => e.species))).map((s) => {
      const species = metadata.entries.filter((e) => e.species === s);
      return {
        isOpened:   false,
        isSelected: false,
        species:    s,
        genes:      Array.from(new Set(species.map((e) => e.gene))).map((g) => {
          const genes = species.filter((e) => e.gene === g);
          return {
            isOpened:   false,
            isSelected: false,
            gene:       g,
            mhcclasses: Array.from(new Set(genes.map((e) => e.mhcclass))).map((cl) => {
              const mhcclasses = genes.filter((e) => e.mhcclass === cl);
              return {
                isOpened:   false,
                isSelected: false,
                mhcclass:   cl,
                mhcgroups:  Array.from(new Set(mhcclasses.map((e) => e.mhcgroup))).map((gr) => {
                  const mhcgroups = mhcclasses.filter((e) => e.mhcgroup === gr);
                  return {
                    isOpened:   false,
                    isSelected: false,
                    mhcgroup:   gr,
                    epitopes:   ([] as MotifEpitope[]).concat(...mhcgroups.map((e) => e.epitopes))
                  };
                })
              };
            })
          };
        })
      };
    })
  };
}
