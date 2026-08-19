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

import {
  IStructuresMetadata, IStructuresMetadataTreeLevel, IStructuresMetadataTreeLevelValue,
  IStructuresSearchTreeFilterEntry
} from 'pages/structure/structure';
import { Utils } from 'utils/utils';

/**
 * Walking the metadata tree: mhc.class -> mhc.pair -> antigen.epitope.
 *
 * Three files were each walking it their own way - the context header to resolve URL parameters, the
 * service to open a path from a cross-page link, and the response normaliser to find an epitope's
 * hash - and two of them carried their own copy of the MHC-pair normaliser, differing only in
 * whether they lower-cased before or after comparing.
 *
 * Matching is case-insensitive throughout, and an MHC pair is compared at two-field resolution
 * because the tree is keyed that way: a URL naming `HLA-A*02:01/B2M` has to find `HLA-A*02/B2M`.
 */
export class StructureMetadataTree {

  /** `HLA-A*02:01/B2M` -> `hla-a*02/b2m`. Both halves, both dropped to two fields, lower-cased. */
  public static normalizeMhcPair(value: string | undefined | null): string {
    if (!value) {
      return '';
    }
    return value.split('/')
      .map((part) => part.replace(/:.+/, '').trim())
      .filter((part) => part.length > 0)
      .join('/')
      .toLowerCase();
  }

  public static findMhcClass(metadata: IStructuresMetadata | null | undefined,
                             value: string | null): IStructuresMetadataTreeLevelValue | undefined {
    if (!value || !metadata || !metadata.root) {
      return undefined;
    }
    const normalized = value.toLowerCase();
    return metadata.root.values.find((node) => node.value.toLowerCase() === normalized);
  }

  public static findMhcGene(parent: IStructuresMetadataTreeLevelValue | undefined,
                            value: string | null): IStructuresMetadataTreeLevelValue | undefined {
    if (!parent || !parent.next || !value) {
      return undefined;
    }
    const normalized = StructureMetadataTree.normalizeMhcPair(value);
    return parent.next.values.find((node) => StructureMetadataTree.normalizeMhcPair(node.value) === normalized);
  }

  public static findEpitope(parent: IStructuresMetadataTreeLevelValue | undefined,
                            value: string | null): IStructuresMetadataTreeLevelValue | undefined {
    if (!parent || !parent.next || !value) {
      return undefined;
    }
    const normalized = value.toLowerCase();
    return parent.next.values.find((node) => node.value.toLowerCase() === normalized);
  }

  /** The whole path at once, for a caller that has all three values. Empty when any step misses. */
  public static findPath(metadata: IStructuresMetadata | null | undefined,
                         mhcClass: string | null, mhcPair: string | null,
                         epitope: string | null): IStructuresMetadataTreeLevelValue[] {
    const classNode = StructureMetadataTree.findMhcClass(metadata, mhcClass);
    const geneNode = StructureMetadataTree.findMhcGene(classNode, mhcPair);
    const epitopeNode = StructureMetadataTree.findEpitope(geneNode, epitope);
    return classNode && geneNode && epitopeNode ? [ classNode, geneNode, epitopeNode ] : [];
  }

  /**
   * The leaf a search-tree filter names, matching only the entries that are tree levels.
   *
   * A filter can carry entries the tree does not have a level for - `structure.id` when arriving
   * from Browse - so anything that is not one of the three levels is skipped rather than failing
   * the walk.
   */
  public static resolveLeaf(metadata: IStructuresMetadata,
                            entries: IStructuresSearchTreeFilterEntry[]): IStructuresMetadataTreeLevelValue | undefined {
    if (!metadata || !metadata.root || !Array.isArray(entries)) {
      return undefined;
    }
    const relevant = entries.filter((entry) => entry &&
      [ 'mhc.class', 'mhc.pair', 'antigen.epitope' ].indexOf(entry.name) !== -1);
    if (relevant.length === 0) {
      return undefined;
    }

    let level: IStructuresMetadataTreeLevel | null = metadata.root;
    for (let index = 0; index < relevant.length; ++index) {
      if (!level) {
        return undefined;
      }
      const entry = relevant[ index ];
      const value = level.values.find((candidate) => entry.name === 'mhc.pair'
        ? StructureMetadataTree.normalizeMhcPair(candidate.value) === StructureMetadataTree.normalizeMhcPair(entry.value)
        : candidate.value.toLowerCase() === entry.value.toLowerCase());
      if (!value) {
        return undefined;
      }
      if (index === relevant.length - 1) {
        return value;
      }
      level = value.next;
    }
    return undefined;
  }

  /**
   * The hash of the leaf an entry list names, matching by exact value.
   *
   * Deliberately stricter than `resolveLeaf`: this one is used to key an epitope in the page's own
   * state, so a near-match under a different case would merge two entries that are not the same.
   */
  public static resolveHash(metadata: IStructuresMetadata,
                            entries: IStructuresSearchTreeFilterEntry[]): string | undefined {
    if (!metadata || !metadata.root || !Array.isArray(entries) || entries.length === 0) {
      return undefined;
    }
    let level: IStructuresMetadataTreeLevel | null = metadata.root;
    for (let index = 0; index < entries.length; ++index) {
      if (!level) {
        return undefined;
      }
      const value = level.values.find((candidate) => candidate.value === entries[ index ].value);
      if (!value) {
        return undefined;
      }
      if (index === entries.length - 1) {
        return value.hash;
      }
      level = value.next;
    }
    return undefined;
  }

  /** Every leaf, paired with its hash. */
  public static leafValues(tree: IStructuresMetadataTreeLevel): Array<[ string, IStructuresMetadataTreeLevelValue ]> {
    return Utils.Array.flattened(tree.values.map((value) => value.next === null
      ? [ [ value.hash, value ] ] as Array<[ string, IStructuresMetadataTreeLevelValue ]>
      : StructureMetadataTree.leafValues(value.next)));
  }
}
