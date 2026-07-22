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
 * The question each p-value answers: does this sample carry more clonotypes against this epitope than
 * a repertoire with no history of it would. The null is measured, not derived — the server annotates a
 * healthy 100k-clonotype control repertoire of the same species and chain and reports the resulting
 * per-clonotype match rate as a Beta, which makes the test Beta-Binomial. A Beta rather than a fixed
 * rate because the rate is an estimate from one finite control, and a half-count on each side because
 * an epitope the control never reached would otherwise have a null of exactly zero, under which one
 * match is infinitely surprising.
 *
 * Every count entering it is of distinct rearrangements, so the read-count weighting cannot reach the
 * result, and the counts are of clonotypes, so neither can the 10^5 axis scaling. Those change the
 * height of a bar, not how unlikely it is.
 */
export namespace Statistics {

  /**
   * P(X >= k) for X ~ BetaBinomial(n, alpha, beta).
   *
   * The overdispersed counterpart of a binomial tail, for a rate that is itself uncertain: instead of
   * one fixed p the per-clonotype rate is a Beta(alpha, beta) draw, which is what a rate estimated from
   * a finite control repertoire actually looks like. A binomial has a closed form through the
   * regularized incomplete beta; this has no such identity, so the tail is summed term by term.
   *
   * Every term is held *relative to the term at the mean* rather than as a probability, and the answer
   * is the ratio of what lies at or above k to everything. That is what makes it usable at these
   * sizes. Anchoring the walk at k instead is the obvious implementation and is wrong in the worst
   * possible direction: the first term is `exp(logPmf(k))`, and for a repertoire of 63,739 clonotypes
   * against an epitope a control reaches 26,000 times per 100,000, `logPmf(1300) = -10141`, which is a
   * double's zero. The running sum then starts at zero and stays there, and the routine returns 0 -
   * maximal significance - for an epitope the sample matched *thirteen times less* than chance would
   * give. The most reachable epitopes in the database would have led every chart.
   *
   * Anchored at the mean the largest term is ~1, so nothing overflows on the way out and terms
   * underflow only where they stop mattering. It also removes the need for a log-gamma at all: each
   * step is the previous term times (n - j)(j + alpha) / ((j + 1)(n - j + beta - 1)), a plain rational
   * factor, so the walk costs one multiply per step. That matters here - a repertoire runs to 2 * 10^5
   * clonotypes and one summary tests ~2 * 10^3 epitopes.
   *
   * Both walks stop once a term is negligible against what has accumulated, but neither may stop
   * before it has crossed k: on the way there the terms are shrinking for a reason that says nothing
   * about the sum being approached.
   *
   * Assumes a single-peaked pmf, which holds whenever alpha >= 1 or beta >= 1 - true of every prior
   * this is used with, since beta counts a control repertoire. A U-shaped pmf (both below 1) puts the
   * anchor in the trough and returns NaN rather than a wrong number.
   *
   * @returns a probability in [0, 1], or NaN if the inputs cannot describe a trial
   */
  export function betaBinomialUpperTail(k: number, n: number, alpha: number, beta: number): number {
    if (!isFinite(k) || !isFinite(n) || !isFinite(alpha) || !isFinite(beta) || n <= 0 || alpha <= 0 || beta <= 0) {
      return NaN;
    }
    if (k <= 0) { return 1; }      // P(X >= 0) is certain
    if (k > n) { return 0; }       // more successes than trials

    // X is a count, so P(X >= k) for a fractional k is P(X >= ceil(k)); the recurrence below steps only
    // between whole j and would otherwise walk a lattice the variable never lands on.
    const from = Math.ceil(k);
    // pmf(j + 1) / pmf(j).
    const step = (j: number) => ((n - j) * (j + alpha)) / ((j + 1) * (n - j + beta - 1));

    const anchor = Math.min(n, Math.max(0, Math.round(n * alpha / (alpha + beta))));
    const negligible = 1e-18;

    let above = 0;
    let below = 0;
    const accumulate = (j: number, term: number) => {
      if (j >= from) { above = above + term; } else { below = below + term; }
    };

    accumulate(anchor, 1);

    // Each walk stops against the accumulator it is still feeding, not against the total. Against the
    // total it would truncate the deep tail by an arbitrary factor - `above` can sit 10^28 below
    // `below`, so terms that are negligible next to the whole distribution are the entire answer. The
    // bound is the remaining geometric series, `weight * r / (1 - r)`, not the next term alone.
    let weight = 1;
    for (let j = anchor; j < n; j = j + 1) {
      const shrink = step(j);
      weight = weight * shrink;
      accumulate(j + 1, weight);
      // Multiplied out rather than divided, so a shrink approaching 1 cannot divide by zero.
      if (j + 1 >= from && shrink < 1 && weight * shrink < negligible * above * (1 - shrink)) { break; }
    }

    weight = 1;
    for (let j = anchor - 1; j >= 0; j = j - 1) {
      const shrink = 1 / step(j);
      weight = weight * shrink;
      accumulate(j, weight);
      if (j < from && shrink < 1 && weight * shrink < negligible * below * (1 - shrink)) { break; }
    }

    const total = above + below;
    // Not finite only if the pmf was not single-peaked and the walk ran away - see the note above.
    return isFinite(total) && total > 0 ? Math.min(1, Math.max(0, above / total)) : NaN;
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
