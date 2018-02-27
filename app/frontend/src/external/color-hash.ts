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

/* Code from 'color-hash' npm package (https://github.com/zenozeng/color-hash) */

/* tslint:disable */
var BKDRHash = function(str: any) {
    var seed = 131;
    var seed2 = 137;
    var hash = 0;
    // make hash more sensitive for short string like 'a', 'b', 'c'
    str += 'x';
    // Note: Number.MAX_SAFE_INTEGER equals 9007199254740991
    var MAX_SAFE_INTEGER = parseInt((9007199254740991 / seed2) as any);
    for (var i = 0; i < str.length; i++) {
        if (hash > MAX_SAFE_INTEGER) {
            hash = parseInt((hash / seed2) as any);
        }
        hash = hash * seed + str.charCodeAt(i);
    }
    return hash;
};

/**
 * Convert RGB Array to HEX
 *
 * @param {Array} RGBArray - [R, G, B]
 * @returns {String} 6 digits hex starting with #
 */
var RGB2HEX = function(RGBArray: any) {
    var hex = '#';
    RGBArray.forEach(function(value: any) {
        if (value < 16) {
            hex += 0;
        }
        hex += value.toString(16);
    });
    return hex;
};

/**
 * Convert HSL to RGB
 *
 * @see {@link http://zh.wikipedia.org/wiki/HSL和HSV色彩空间} for further information.
 * @param {Number} H Hue ∈ [0, 360)
 * @param {Number} S Saturation ∈ [0, 1]
 * @param {Number} L Lightness ∈ [0, 1]
 * @returns {Array} R, G, B ∈ [0, 255]
 */
var HSL2RGB = function(H: any, S: any, L: any) {
    H /= 360;

    var q = L < 0.5 ? L * (1 + S) : L + S - L * S;
    var p = 2 * L - q;

    return [ H + 1 / 3, H, H - 1 / 3 ].map(function(color) {
        if (color < 0) {
            color++;
        }
        if (color > 1) {
            color--;
        }
        if (color < 1 / 6) {
            color = p + (q - p) * 6 * color;
        } else if (color < 0.5) {
            color = q;
        } else if (color < 2 / 3) {
            color = p + (q - p) * 6 * (2 / 3 - color);
        } else {
            color = p;
        }
        return Math.round(color * 255);
    });
};

/**
 * Color Hash Class
 *
 * @class
 */
export class ColorHash {
    options: any = {};
    hash: any = BKDRHash;
    L: any;
    S: any;

    constructor(options?: any) {
        if (options) {
            this.options = options;
        }

        var LS = [ this.options.lightness, this.options.saturation ].map(function(param) {
            param = param || [ 0.35, 0.5, 0.65 ]; // note that 3 is a prime
            return Object.prototype.toString.call(param) === '[object Array]' ? param.concat() : [ param ];
        });

        this.L = LS[ 0 ];
        this.S = LS[ 1 ];

        if (options !== undefined && options.hash) {
            this.hash = options.hash;
        }
    }

    /**
     * Returns the hash in [h, s, l].
     * Note that H ∈ [0, 360); S ∈ [0, 1]; L ∈ [0, 1];
     *
     * @param {String} str string to hash
     * @returns {Array} [h, s, l]
     */
    public hsl(str: any) {
        var H, S, L;
        var hash = this.hash(str);

        H = hash % 359; // note that 359 is a prime
        hash = parseInt((hash / 360) as any);
        S = this.S[ hash % this.S.length ];
        hash = parseInt((hash / this.S.length) as any);
        L = this.L[ hash % this.L.length ];

        return [ H, S, L ];
    }

    /**
     * Returns the hash in [r, g, b].
     * Note that R, G, B ∈ [0, 255]
     *
     * @param {String} str string to hash
     * @returns {Array} [r, g, b]
     */
    public rgb(str: any) {
        var hsl = this.hsl(str);
        return HSL2RGB.apply(this, hsl);
    }

    /**
     * Returns the hash in hex
     *
     * @param {String} str string to hash
     * @returns {String} hex with #
     */
    public hex(str: any) {
        var rgb = this.rgb(str);
        return RGB2HEX(rgb);
    }
}
/* tslint:enable */
