/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

export interface IBarChartConfiguration {
    readonly gap?: number;
    readonly type?: string;
}

export class BarChartConfiguration {
    private static readonly gapDefault: number = 0.1;
    private static readonly typeDefault: string = 'bar';

    public readonly gap: number;
    public readonly type: string;

    constructor(config: IBarChartConfiguration) {
        this.gap = (config.gap !== undefined) ? config.gap : BarChartConfiguration.gapDefault;
        this.type = (config.type !== undefined) ? config.type : BarChartConfiguration.typeDefault;
    }
}