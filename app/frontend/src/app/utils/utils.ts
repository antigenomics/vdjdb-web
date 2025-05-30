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

export namespace Utils {

  export namespace String {
    export function hashCode(s: string): number {
      const l = s.length;
      let h = 0;
      let i = 0;
      if (l > 0) {
        while (i < l) {
          h = (h << 5) - h + s.charCodeAt(i++) | 0; // tslint:disable-line:no-magic-numbers no-bitwise
        }
      }
      return h;
    }
  }

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

    export function flattened<T>(array: T[][]): T[] {
      return array.reduce((a, b) => {
        return a.concat(b);
      }, []);
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

    export class ColorizedPatternRegion {
      public readonly part: string;
      public readonly color: string;
    }

    export function colorizePattern(input: string, vEnd: number, jStart: number): ColorizedPatternRegion[] {
      this.otherRegionColor = 'black';
      if (vEnd > 0 && jStart <= 0) {
        return [
          { part: input.substring(0, vEnd), color: '#4daf4a' },
          { part: input.substring(vEnd, input.length), color: 'black' }
        ];
      } else if (vEnd <= 0 && jStart > 0) {
        return [
          { part: input.substring(0, jStart - 1), color: 'black' },
          { part: input.substring(jStart - 1, input.length), color: '#377eb8' }
        ];
      } else if (vEnd > 0 && jStart > 0 && jStart > vEnd) {
        return [
          { part: input.substring(0, vEnd), color: '#4daf4a' },
          { part: input.substring(vEnd, jStart - 1), color: 'black' },
          { part: input.substring(jStart - 1, input.length), color: '#377eb8' }
        ];
      } else if (vEnd > 0 && jStart > 0 && jStart <= vEnd) {
        return [
          { part: input.substring(0, jStart - 1), color: '#4daf4a' },
          { part: input.substring(jStart - 1, vEnd), color: '#ff5050' },
          { part: input.substring(vEnd, input.length), color: '#377eb8' }
        ];
      } else if (vEnd < 0 && jStart < 0) {
        return [
          { part: input, color: 'black' }
        ];
      }
      return [
        { part: input, color: 'black' }
      ];
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

    export const SUCCESS_STATUS: number = 200;
    export const FAIL_STATUSES: number[] = [ 400, 401, 402, 403, 404, 405 ]; // tslint:disable-line:no-magic-numbers

    export function get(url: string): Promise<XMLHttpRequest> {
      return new Promise<XMLHttpRequest>((resolve, reject) => {
        try {
          const xhttp = new XMLHttpRequest();
          const lastReadyState = 4;

          xhttp.onreadystatechange = function() {
            if (this.readyState === lastReadyState && this.status === HTTP.SUCCESS_STATUS) {
              resolve(this);
            } else if (this.readyState === lastReadyState && HTTP.FAIL_STATUSES.indexOf(this.status) !== -1) {
              reject(this);
            }
          };

          xhttp.onerror = function() {
            reject(this);
          };

          xhttp.onabort = function() {
            reject(this);
          };

          xhttp.open('GET', url, true);
          xhttp.send();
        } catch (e) {
          reject(e);
        }
      });
    }

    export function post(url: string, body: any): Promise<XMLHttpRequest> {
      return new Promise<XMLHttpRequest>((resolve, reject) => {
        try {
          const xhttp = new XMLHttpRequest();
          const lastReadyState = 4;

          xhttp.onreadystatechange = function() {
            if (this.readyState === lastReadyState && this.status === HTTP.SUCCESS_STATUS) {
              resolve(this);
            } else if (this.readyState === lastReadyState && HTTP.FAIL_STATUSES.indexOf(this.status) !== -1) {
              reject(this);
            }
          };

          xhttp.onerror = function() {
            reject(this);
          };

          xhttp.onabort = function() {
            reject(this);
          };

          xhttp.open('POST', url);
          xhttp.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
          xhttp.send(JSON.stringify(body));
        } catch (e) {
          reject(this);
        }
      });
    }

  }

  export namespace Cookies {

    export function getCookie(name: string): string {
      const matches = document.cookie.match(new RegExp(
        `(?:^|; )${name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1')}=([^;]*)`
      ));
      return matches ? decodeURIComponent(matches[ 1 ]) : undefined;
    }

  }

  export namespace Memory {
    export const numberSizeInBytes: number = 8;
    export const stringCharacterSizeInBytes: number = 2;
    export const booleanSizeInBytes: number = 4;

    export const bytesInKiB: number = 1024;
    export const bytesInMiB: number = 1048576;
    export const bytesInGiB: number = 1073741824;

    export function formattedMemorySizeOf(object: any) {
      return formatByteSize(memorySizeOf(object));
    }

    export function memorySizeOf(object: any) {
      let bytes = 0;
      if (object !== null && object !== undefined) {
        switch (typeof object) {
          case 'number':
            bytes += Memory.numberSizeInBytes;
            break;
          case 'string':
            bytes += object.length * Memory.stringCharacterSizeInBytes;
            break;
          case 'boolean':
            bytes += Memory.booleanSizeInBytes;
            break;
          case 'object':
            const objClass = Object.prototype.toString.call(object).slice(8, -1); // tslint:disable-line:no-magic-numbers
            if (objClass === 'Object' || objClass === 'Array') {
              for (const key in object) {
                if (!object.hasOwnProperty(key)) {
                  continue;
                }
                memorySizeOf(object[ key ]);
              }
            } else {
              bytes += object.toString().length * 2;
            }
            break;
          default:
            break;
        }
      }
      return bytes;
    }

    export function formatByteSize(bytes: number) {
      if (bytes < Memory.bytesInKiB) {
        return bytes + ' bytes';
      } else if (bytes < Memory.bytesInMiB) {
        return (bytes / Memory.bytesInKiB).toFixed(3) + ' KiB';
      } else if (bytes < Memory.bytesInGiB) {
        return (bytes / Memory.bytesInMiB).toFixed(3) + ' MiB';
      } else {
        return (bytes / Memory.bytesInGiB).toFixed(3) + ' GiB';
      }
    }
  }

  export namespace Time {
    export function debounce(f: (...args: any[]) => void, ms: number = 100): any {
      let timer: number;
      return function(...args: any[]) {
        const onComplete = () => {
          f.apply(this, args);
          timer = undefined;
        };

        if (timer) {
          window.clearTimeout(timer);
        }

        timer = window.setTimeout(onComplete, ms);
      };
    }
  }

  export namespace Color {
    export function extractRGB(rgb: string): { r?: number, g?: number, b?: number } {
      const match = rgb.match(/rgba?\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)?(?:, ?(\d(?:\.\d?))\))?/);
      return match ? { r: Number(match[ 1 ]), g: Number(match[ 2 ]), b: Number(match[ 3 ]) } : { r: 0, g: 0, b: 0 };
    }

    export function convertRGBtoHSL(r: number, g: number, b: number): { h?: number, s?: number, l?: number } {
      // tslint:disable:no-magic-numbers
      r /= 255, g /= 255, b /= 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      let h = 0;
      let s = 0;

      if (max === min) {
        h = s = 0; // achromatic
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
          default:
            break;
        }

        h /= 6;
      }

      return { h, s, l };
      // tslint:enable:no-magic-numbers
    }
  }

}
