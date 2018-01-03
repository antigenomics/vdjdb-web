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

export interface IChartContainerMarginConfiguration {
    readonly left?: number;
    readonly right?: number;
    readonly top?: number;
    readonly bottom?: number;
}

function createDefaultChartContainerMarginConfiguration() : IChartContainerMarginConfiguration {
    return { left: 0, right: 0, top: 0, bottom: 0 }
}

export interface IChartContainerConfiguration {
    readonly width?: number;
    readonly height?: number;
    readonly margin?: IChartContainerMarginConfiguration;
}

export function createDefaultChartContainerConfiguration(): IChartContainerConfiguration {
    return { margin: createDefaultChartContainerMarginConfiguration() }
}