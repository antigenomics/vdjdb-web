/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

/* tslint:disable:variable-name */
export let StringConverter = (value: any) => {
    if (value === null || value === undefined || typeof value === 'string') {
        return value;
    }
    return value.toString();
};

export let BooleanConverter = (value: any) => {
    if (value === null || value === undefined || typeof value === 'boolean') {
        return value;
    }
    return value.toString() === 'true';
};

export let NumberConverter = (value: any) => {
    if (value === null || value === undefined || typeof value === 'number') {
        return value;
    }
    return parseFloat(value.toString());
};
/* tslint:enable:variable-name */

export function InputConverter(converter?: (value: any) => any) {
    return (target: any, key: string) => {
        if (converter === undefined) {
            const metadata = (Reflect as any).getMetadata('design:type', target, key);
            if (metadata === undefined || metadata === null) {
                throw new Error('The reflection metadata could not be found.');
            }

            if (metadata.name === 'String') {
                converter = StringConverter;
            } else if (metadata.name === 'Boolean') {
                converter = BooleanConverter;
            } else if (metadata.name === 'Number') {
                converter = NumberConverter;
            } else {
                throw new Error(`There is no converter for the given property type '${metadata.name}'.`);
            }
        }

        const definition = Object.getOwnPropertyDescriptor(target, key);
        if (definition) {
            Object.defineProperty(target, key, {
                get: definition.get,
                set: (newValue) => {
                    definition.set(converter(newValue));
                },
                enumerable: true,
                configurable: true
            });
        } else {
            Object.defineProperty(target, key, {
                get() {
                    return this['__' + key];
                },
                set(newValue) {
                    this['__' + key] = converter(newValue);
                },
                enumerable: true,
                configurable: true
            });
        }
    };
}
