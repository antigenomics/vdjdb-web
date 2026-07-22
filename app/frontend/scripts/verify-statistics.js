/*
 * Checks `Statistics.betaBinomialUpperTail` against exact rational arithmetic.
 *
 *     node scripts/verify-statistics.js
 *
 * Plain node, no dependencies and no test runner - this project has karma and jasmine in
 * `package.json` but no `test` script, no karma.conf and not one `.spec.ts`, so wiring one up for a
 * single pure function would be more machinery than function. It reads the shipped TypeScript and
 * evaluates the function body directly, so it cannot drift from what ships the way a transcribed copy
 * would.
 *
 * The reference values were produced with Python `fractions.Fraction` over the pmf recurrence, exactly
 * - alpha and beta are half-integers, so every term is rational and nothing is approximated. They span
 * k below, at and above the mode, and tails down to 1e-28.
 *
 * Worth keeping because the failure this catches is silent and inverted. Summing the tail forward from
 * k - the obvious implementation - starts at `exp(logPmf(k))`, which underflows to zero whenever k is
 * far below the mode. The sum then never leaves zero and the function returns 0, maximal significance,
 * for exactly those epitopes a sample matched *less* than chance would predict. On real data that put
 * NLVPMVATV and RAKFKQLL - the two most reachable epitopes in VDJdb - at the top of the chart with
 * p = 0, when the truth for both is p = 1.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'app', 'utils', 'statistics', 'statistics.ts'), 'utf8');
const declaration = source.slice(source.indexOf('export function betaBinomialUpperTail'));
const body = declaration
  .slice(declaration.indexOf('{'), declaration.indexOf('\n  }\n') + 4)
  .replace(/: number/g, '');
const betaBinomialUpperTail =
  new Function('k', 'n', 'alpha', 'beta', body.slice(1, body.lastIndexOf('}')));

/* k, n, alpha, beta, exact P(X >= k) */
const REFERENCE = [
  [ 1, 50, 0.5, 100000.5, 2.49905664513874835e-04 ],
  [ 3, 50, 3.5, 20.5, 8.84257161444369388e-01 ],
  [ 10, 50, 3.5, 20.5, 2.71961759335556330e-01 ],
  [ 25, 50, 3.5, 20.5, 1.03043676708955163e-03 ],
  [ 50, 50, 3.5, 20.5, 1.01943969895186212e-15 ],
  [ 5, 200, 42.5, 99958.5, 4.08568343783874580e-08 ],
  [ 1, 200, 42.5, 99958.5, 8.14259163661300994e-02 ],
  [ 52, 200, 25997.5, 74003.5, 5.26588333718279400e-01 ],
  [ 100, 200, 25997.5, 74003.5, 3.83287026220285248e-13 ],
  [ 10, 200, 25997.5, 74003.5, 9.99999999999999223e-01 ],
  [ 150, 200, 500.5, 500.5, 2.72356194243511882e-11 ],
  [ 400, 800, 500.5, 500.5, 5.10510935176857306e-01 ],
  [ 600, 800, 500.5, 500.5, 5.24986358646420426e-28 ],
  [ 2, 800, 0.5, 100000.5, 2.36538020060747806e-05 ]
];

const TOLERANCE = 1e-12;
const failures = [];
let worst = 0;

REFERENCE.forEach(([ k, n, alpha, beta, expected ]) => {
  const actual = betaBinomialUpperTail(k, n, alpha, beta);
  const relative = Math.abs(actual - expected) / expected;
  worst = Math.max(worst, relative);
  if (!(relative < TOLERANCE)) {
    failures.push(`  P(X >= ${k} | n=${n}, a=${alpha}, b=${beta}) = ${actual}, expected ${expected}`);
  }
});

/* The regression above, at the size it was found at: 63,739 clonotypes against an epitope a control
   repertoire reaches 25,997 times per 100,000. Observed 1,300 where chance gives 16,570 - depleted, so
   the upper tail is 1. Anchoring the sum at k returns 0 here. */
const depleted = betaBinomialUpperTail(1300, 63739, 25997.5, 74003.5);
if (!(depleted > 0.99)) {
  failures.push(`  depleted epitope returned ${depleted}, expected ~1 (tail anchored at k underflows)`);
}

/* Monotone non-increasing in k, which the forward-underflow bug also violated. */
for (let k = 1; k < 400; k = k + 7) {
  if (betaBinomialUpperTail(k + 7, 63739, 42.5, 99958.5) > betaBinomialUpperTail(k, 63739, 42.5, 99958.5)) {
    failures.push(`  not monotone in k around ${k}`);
    break;
  }
}

if (failures.length !== 0) {
  console.error(`betaBinomialUpperTail: ${failures.length} failure(s)\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`betaBinomialUpperTail: ${REFERENCE.length} exact cases + 2 invariants pass ` +
  `(worst relative error ${worst.toExponential(2)})`);
