// How big to show the game on screen. Pure (no DOM, no Phaser), so it's unit-tested in tests/display.test.ts.
//
// The game always draws 800x600 pixels; the browser enlarges the canvas to fill the space. With pixel art, the
// crispest result is a whole number of *device* pixels per game pixel (on a 2x "Retina" screen, CSS scales of
// 1, 1.5, 2…): every game pixel is then the same size. Any other factor makes some game pixels one device pixel
// wider than others, which shimmers while the level scrolls. So we prefer the largest whole-pixel scale, unless
// that would leave the game much smaller than the space allows; then we simply fill the space.

export interface Size {
    width: number;
    height: number;
}

/** Keep the whole-pixel scale if it's at least this fraction of the largest scale that fits */
export const MIN_FILL = 0.85;

/** CSS pixels per game pixel for a game of size `view` in an `available` area (CSS px) on a `devicePixelRatio` screen. */
export function displayScale(available: Size, view: Size, devicePixelRatio: number, minFill = MIN_FILL): number {
    const fit = Math.min(available.width / view.width, available.height / view.height);
    if (!(fit > 0)) return 1;
    const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
    const devicePixels = fit * dpr;
    const whole = Math.floor(devicePixels + 1e-9);
    if (whole >= 1 && whole / devicePixels >= minFill) return whole / dpr;
    return fit;
}
