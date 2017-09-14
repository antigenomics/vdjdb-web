export namespace Utils {

    export namespace Array {
        export function clear<T>(array: T[]): void {
            array.splice(0, array.length);
        }

        export function deleteElement<T>(array: T[], element: T): boolean {
            let index = array.indexOf(element);
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
            if (pattern.length === 0) {
                return true;
            }
            if (pattern.length > 100) {
                return false;
            }

            let leftBracketStart = false;
            let error = false;

            let allowed_chars = 'ARNDCQEGHILKMFPSTWYV';

            for (let i = 0; i < pattern.length; i++) {
                let char = pattern[ i ];
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
                    if (char !== 'X' && allowed_chars.indexOf(char) === -1 || char === ' ') {
                        error = true;
                        break;
                    }
                }
            }
            return !(leftBracketStart || error);
        }
    }

    export namespace Window {
        export function scroll(element: HTMLElement): void {
            window.scroll({
                top:      element.offsetTop,
                behavior: 'smooth'
            })
        }
    }

}