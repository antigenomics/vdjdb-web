
export namespace Utils {
    export function scroll(element: HTMLElement): void {
        window.scroll({
            top:      element.offsetTop,
            behavior: 'smooth'
        })
    }
}