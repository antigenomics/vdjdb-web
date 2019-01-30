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

export type ChartEventType = number;

export namespace ChartEventType {
    export const INITIAL_DATA: number = 0;
    export const UPDATE_VALUES: number = 1;
    export const UPDATE_DATA: number = 2;
    export const RESIZE: number = 3;
}

export interface IChartEvent<T> {
    readonly type: ChartEventType;
    readonly data: T[];
}
