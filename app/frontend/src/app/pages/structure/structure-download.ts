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

import { IStructureCluster } from 'pages/structure/structure';

/** Which per-structure file to fetch. */
export type StructureDownloadOption = 'structure' | 'contacts' | 'ca_atoms' | 'all';

/**
 * The static files that ship beside each contact map.
 *
 * Nothing generates these on request: `tools/sync_structure_files.py` writes them next to the map,
 * named after the structure hash, and both download controls just build the URL. That is why there
 * is no export endpoint for structures the way there is for motifs.
 */
export class StructureDownload {

    public static readonly directory: string = '/structure-files/structure';

    private static readonly HASH_TOKEN = '{hash}';

    private static readonly patterns: { [option in StructureDownloadOption]: string } = {
        structure: `aligned_aligned_${StructureDownload.HASH_TOKEN}.pdb`,
        contacts:  `${StructureDownload.HASH_TOKEN}_contacts_aa.txt`,
        ca_atoms:  `${StructureDownload.HASH_TOKEN}_aa_coordinates.tsv`,
        all:       `${StructureDownload.HASH_TOKEN}_all.zip`
    };

    public static hashOf(cluster: IStructureCluster | undefined): string {
        return cluster && typeof cluster.clusterId === 'string' ? cluster.clusterId.trim() : '';
    }

    /** One of the four per-structure files. Does nothing when the cluster has no id. */
    public static option(cluster: IStructureCluster | undefined, option: StructureDownloadOption): void {
        const hash = StructureDownload.hashOf(cluster);
        if (!hash) {
            return;
        }
        StructureDownload.start(StructureDownload.patterns[ option ].replace(StructureDownload.HASH_TOKEN, hash));
    }

    /**
     * The overlay card's bundle, which is named for the reader rather than for the file system:
     * `<epitope>_<first six of the hash>.zip`, so a folder of them stays sorted by epitope.
     */
    public static bundle(cluster: IStructureCluster | undefined, epitope: string): void {
        const hash = StructureDownload.hashOf(cluster);
        if (!hash) {
            return;
        }
        StructureDownload.start(`${(epitope || '').trim()}_${hash.slice(0, 6)}.zip`);
    }

    private static start(fileName: string): void {
        const link = document.createElement('a');
        link.href = `${StructureDownload.directory}/${encodeURIComponent(fileName)}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
