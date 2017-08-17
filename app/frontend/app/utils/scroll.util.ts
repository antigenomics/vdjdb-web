export function documentScroll(element: HTMLElement, to: number, duration: number): void {
    if (duration <= 0) {
        return;
    }
    const difference = to - element.scrollTop;
    const perTick = difference / duration * 10;

    setTimeout(function () {
        element.scrollTop = element.scrollTop + perTick;
        if (element.scrollTop == to) {
            return;
        }
        documentScroll(element, to, duration - 1);
    }, 10);
}