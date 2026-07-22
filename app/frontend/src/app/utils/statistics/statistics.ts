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

/** Enrichment statistics for the annotation summaries.
 *
 * The question each p-value answers: `n` of a repertoire's clonotypes matched a VDJdb subset of `N`
 * distinct CDR3s, of which `K` carry this epitope. If those matches fell across the subset in
 * proportion to how much of it each epitope occupies, a match lands on this one with probability
 * `p = K / N`. Seeing `k` of them on it is then Binomial(n, p), and the p-value is the upper tail
 * P(X >= k) — how surprising this many would be with no particular affinity for this donor.
 *
 * `n` is the clonotypes that matched, not the size of the repertoire: conditioning on the repertoire
 * would assume every clonotype in it is a draw from the database, which no real sample is.
 *
 * `K` and `N` are both counted over the *same* database restriction the search ran under (species,
 * chain, MHC class, confidence), so the ratio never mixes populations.
 *
 * Deliberately independent of how the chart is drawn: the counts are clonotypes, so neither the
 * read-count weighting nor the 10^5 axis scaling enters. Those change the height of a bar, not how
 * unlikely it is.
 */
export namespace Statistics {

  /** Lanczos approximation, g = 7, n = 9. Accurate to ~15 significant digits over the range used here,
    * which is what lets the incomplete beta below stay stable for repertoires of 10^5 clonotypes. */
  const LANCZOS: number[] = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  export function logGamma(x: number): number {
    if (x < 0.5) {
      // Reflection, so the series is only ever evaluated where it converges.
      return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    }
    const z = x - 1;
    let a = LANCZOS[ 0 ];
    const t = z + 7.5;
    for (let i = 1; i < LANCZOS.length; i = i + 1) {
      a = a + LANCZOS[ i ] / (z + i);
    }
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
  }

  /** Continued fraction for the incomplete beta, evaluated by the modified Lentz method. */
  function betaContinuedFraction(a: number, b: number, x: number): number {
    const tiny = 1e-30;
    const epsilon = 3e-16;
    const maxIterations = 500;

    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;

    let c = 1;
    let d = 1 - qab * x / qap;
    if (Math.abs(d) < tiny) { d = tiny; }
    d = 1 / d;
    let h = d;

    for (let m = 1; m <= maxIterations; m = m + 1) {
      const m2 = 2 * m;

      // Even step.
      let numerator = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + numerator * d;
      if (Math.abs(d) < tiny) { d = tiny; }
      c = 1 + numerator / c;
      if (Math.abs(c) < tiny) { c = tiny; }
      d = 1 / d;
      h = h * d * c;

      // Odd step.
      numerator = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + numerator * d;
      if (Math.abs(d) < tiny) { d = tiny; }
      c = 1 + numerator / c;
      if (Math.abs(c) < tiny) { c = tiny; }
      d = 1 / d;
      const delta = d * c;
      h = h * delta;

      if (Math.abs(delta - 1) < epsilon) {
        return h;
      }
    }
    return h;
  }

  /** Regularized incomplete beta, I_x(a, b). */
  export function incompleteBeta(a: number, b: number, x: number): number {
    if (x <= 0) { return 0; }
    if (x >= 1) { return 1; }
    const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    // Swapping the arguments where the continued fraction converges slowly is what keeps this exact in
    // the far tail, which is the half of the range that matters for an enrichment test.
    return (x < (a + 1) / (a + b + 2))
      ? front * betaContinuedFraction(a, b, x) / a
      : 1 - front * betaContinuedFraction(b, a, 1 - x) / b;
  }

  /**
   * P(X >= k) for X ~ Binomial(n, p).
   *
   * Via the identity P(X >= k) = I_p(k, n - k + 1) rather than by summing the pmf: a repertoire runs
   * to 10^5 clonotypes, so the sum would be up to 10^5 terms per bar and would lose the far tail to
   * rounding, which is exactly the region a p-value is read in.
   *
   * @returns a probability in [0, 1], or NaN if the inputs cannot describe a trial
   */
  export function binomialUpperTail(k: number, n: number, p: number): number {
    if (!isFinite(k) || !isFinite(n) || !isFinite(p) || n <= 0 || p < 0 || p > 1) {
      return NaN;
    }
    if (k <= 0) { return 1; }      // P(X >= 0) is certain
    if (k > n) { return 0; }       // more successes than trials
    if (p === 0) { return 0; }
    if (p === 1) { return 1; }
    const tail = incompleteBeta(k, n - k + 1, p);
    return Math.min(1, Math.max(0, tail));
  }

  /**
   * Benjamini-Hochberg adjusted p-values, returned in the order given.
   *
   * The step-up enforcement matters and is easy to leave out: adjusted values have to be monotone in
   * the original ranking, so each is capped by every less significant one above it. Without that pass
   * a q-value can come out larger than one belonging to a weaker result.
   *
   * NaN entries are carried through untouched and excluded from the count `m`, so a value that could
   * not be tested neither receives a q-value nor inflates everyone else's.
   */
  export function benjaminiHochberg(pValues: number[]): number[] {
    const testable: number[] = [];
    pValues.forEach((p, index) => {
      if (!isNaN(p)) { testable.push(index); }
    });

    const m = testable.length;
    const adjusted: number[] = pValues.map((p) => isNaN(p) ? NaN : p);
    if (m === 0) {
      return adjusted;
    }

    // Ascending by p, so rank i (1-based) gives the p * m / i step.
    testable.sort((left, right) => pValues[ left ] - pValues[ right ]);

    let running = 1;
    for (let rank = m; rank >= 1; rank = rank - 1) {
      const index = testable[ rank - 1 ];
      const step = pValues[ index ] * m / rank;
      running = Math.min(running, step);
      adjusted[ index ] = Math.min(1, Math.max(0, running));
    }
    return adjusted;
  }

  /** Compact rendering for a tooltip: exponential in the tail, plain decimals where they read better. */
  export function formatPValue(p: number): string {
    if (isNaN(p)) { return 'n/a'; }
    if (p === 0) { return '< 1e-300'; }
    if (p < 1e-4) { return p.toExponential(2); }
    return p.toPrecision(3);
  }
}
