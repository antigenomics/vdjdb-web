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

export namespace Configuration {

    export function extend<T>(target: T, ...sources: T[]): void {
        for (const source of sources) {
            for (let property in source) {
                const value = source[ property ];
                const isObject = (typeof value === 'object') && !(Array.isArray(value));
                if (isObject) {
                    extend(target[ property ], value);
                } else {
                    target[ property ] = value;
                }
            }
        }
    }

    export function print<T>(target: T, shift: string = '') {

        for (let property in target) {
            const value = target[ property ];
            const isObject = (typeof value === 'object') && !(Array.isArray(value));
            if (isObject) {
                console.log(`${shift}${property}`);
                print(value, shift + '\t');
            } else {
                console.log(`${shift}${property}: `, value);
            }
        }
    }
}