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

import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';

export namespace Utils {

    export namespace Array {
        export function clear<T>(array: T[]): void {
            array.splice(0, array.length);
        }

        export function deleteElement<T>(array: T[], element: T): boolean {
            const index = array.indexOf(element);
            if (index !== -1) {
                array.splice(index, 1);
                return true;
            } else {
                return false;
            }
        }

    }

    export namespace SequencePattern {
        export function isPatternValid(pattern: string): boolean {
            const maxPatternLength: number = 100;

            if (pattern.length === 0) {
                return true;
            }
            if (pattern.length > maxPatternLength) {
                return false;
            }

            let leftBracketStart = false;
            let error = false;

            const allowedCharacters = 'ARNDCQEGHILKMFPSTWYV';

            for (let i = 0; i < pattern.length; i++) {
                const char = pattern[ i ];
                if (char === '[') {
                    if (leftBracketStart === true) {
                        error = true;
                        break;
                    }
                    leftBracketStart = true;
                } else if (char === ']') {
                    if (leftBracketStart === false) {
                        error = true;
                        break;
                    } else if (pattern[ i - 1 ] === '[') {
                        error = true;
                        break;
                    }
                    leftBracketStart = false;
                } else {
                    if (char !== 'X' && allowedCharacters.indexOf(char) === -1 || char === ' ') {
                        error = true;
                        break;
                    }
                }
            }
            return !(leftBracketStart || error);
        }

        export function isPatternValidStrict(pattern: string): boolean {
            const maxPatternLength: number = 100;

            if (pattern.length === 0) {
                return true;
            }

            if (pattern.length > maxPatternLength) {
                return false;
            }

            const allowedCharacters = 'ARNDCQEGHILKMFPSTWYV';

            for (const character of pattern) {
                if (allowedCharacters.indexOf(character) === -1 || character === ' ') {
                    return false;
                }
            }
            return true;
        }
    }

    export namespace Window {

        export function scroll(element: HTMLElement): void {
            if (window.scroll) {
                window.scroll({
                    behavior: 'smooth',
                    top:      element.offsetTop
                });
            }
        }

        export class WindowViewport {
            public width: number;
            public height: number;
        }

        export function getViewport(): WindowViewport {
            const w = window;
            const d = document;
            const e = d.documentElement;
            const g = d.getElementsByTagName('body')[ 0 ];
            const width = w.innerWidth || e.clientWidth || g.clientWidth;
            const height = w.innerHeight || e.clientHeight || g.clientHeight;
            return { width, height };
        }
    }

    export namespace Text {

        export function splitParagraphs(text: string): string[] {
            const openParagraphIndices = getIndicesOf('<p>', text);
            const closeParagraphIndices = getIndicesOf('</p>', text);

            if (openParagraphIndices.length === 0 ||
                closeParagraphIndices.length === 0 ||
                openParagraphIndices.length !== closeParagraphIndices.length) {
                return [ text ];
            } else {
                const paragraphsCount = openParagraphIndices.length;
                const result: string[] = [];
                for (let i = 0; i < paragraphsCount; ++i) {
                    result.push(text.substring(openParagraphIndices[ i ] + 3, closeParagraphIndices[ i ]));
                }
                return result;
            }

        }

        export function getIndicesOf(searchStr: string, str: string, caseSensitive: boolean = true) {
            const searchStringLength = searchStr.length;
            if (searchStringLength === 0) {
                return [];
            }
            let startIndex = 0;
            let index;
            const indices = [];

            if (!caseSensitive) {
                str = str.toLowerCase();
                searchStr = searchStr.toLowerCase();
            }

            /* tslint:disable:no-conditional-assignment */
            while ((index = str.indexOf(searchStr, startIndex)) > -1) {
                indices.push(index);
                startIndex = index + searchStringLength;
            }
            /* tslint:enable:no-conditional-assignment */

            return indices;
        }

    }

    export namespace File {

        export function download(url: string): void {
            const link = document.createElement('a');
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        export function baseName(name: string) {
            let base = name.substring(name.lastIndexOf('/') + 1);
            if (base.lastIndexOf('.') !== -1) {
                base = base.substring(0, base.lastIndexOf('.'));
            }
            return base;
        }

        export function extension(name: string) {
            return name.split('.').pop();
        }

    }

    export namespace HTTP {

        export function get(url: string): Observable<XMLHttpRequest> {
            return Observable.create((observer: Observer<XMLHttpRequest>) => {
                const xhttp = new XMLHttpRequest();
                const lastReadyState = 4;
                const successStatus = 200;
                xhttp.onreadystatechange = function() {
                    if (this.readyState === lastReadyState && this.status === successStatus) {
                        observer.next(this);
                        observer.complete();
                    }
                };
                xhttp.open('GET', url, true);
                xhttp.send();
            });
        }

    }

    export namespace Cookies {

        export function getCookie(name: string): string {
            const matches = document.cookie.match(new RegExp(
                `(?:^|; )${name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1')}=([^;]*)`
            ));
            return matches ? decodeURIComponent(matches[1]) : undefined;
        }

    }

}