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
            window.scroll({
                behavior: 'smooth',
                top:      element.offsetTop
            });
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

}
