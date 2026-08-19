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

import { Utils } from './utils';

/**
 * The first spec in this repository. Deliberately pure TypeScript with no TestBed, so that a
 * failure here means the runner itself is wrong rather than Angular's dependency injection.
 *
 * These two validators gate what reaches the CDR3 sequence and Levenshtein filters, so a pattern
 * they wrongly accept becomes a search the server has to refuse.
 */
describe('Utils.SequencePattern', () => {

  describe('isPatternValid', () => {

    it('accepts the twenty amino acids, and X for an unknown one', () => {
      expect(Utils.SequencePattern.isPatternValid('CASSLAPGATNEKLFF')).toBe(true);
      expect(Utils.SequencePattern.isPatternValid('CASSLXPGATNEKLFF')).toBe(true);
      expect(Utils.SequencePattern.isPatternValid('')).toBe(true);
    });

    it('accepts a bracketed group of alternatives', () => {
      expect(Utils.SequencePattern.isPatternValid('CASSL[ASR]PGATNEKLFF')).toBe(true);
    });

    it('rejects brackets that do not pair up', () => {
      expect(Utils.SequencePattern.isPatternValid('CASSL[ASRPGATNEKLFF')).toBe(false);
      expect(Utils.SequencePattern.isPatternValid('CASSLASR]PGATNEKLFF')).toBe(false);
      expect(Utils.SequencePattern.isPatternValid('CASSL[[ASR]PGATNEKLFF')).toBe(false);
      // An empty group would match nothing, so it is an error rather than a no-op.
      expect(Utils.SequencePattern.isPatternValid('CASSL[]PGATNEKLFF')).toBe(false);
    });

    it('rejects characters that are not amino acids', () => {
      expect(Utils.SequencePattern.isPatternValid('CASSL1PGATNEKLFF')).toBe(false);
      expect(Utils.SequencePattern.isPatternValid('CASSL PGATNEKLFF')).toBe(false);
      // B, J, O, U and Z are not among the twenty.
      expect(Utils.SequencePattern.isPatternValid('CASSLBPGATNEKLFF')).toBe(false);
    });

    it('rejects anything longer than a hundred characters', () => {
      expect(Utils.SequencePattern.isPatternValid('C'.repeat(100))).toBe(true);
      expect(Utils.SequencePattern.isPatternValid('C'.repeat(101))).toBe(false);
    });
  });

  describe('isPatternValidStrict', () => {

    it('takes amino acids only, refusing what the loose form allows', () => {
      // The Levenshtein filter needs a complete sequence: a wildcard or a group would make the
      // edit distance meaningless.
      expect(Utils.SequencePattern.isPatternValidStrict('CASSLAPGATNEKLFF')).toBe(true);
      expect(Utils.SequencePattern.isPatternValidStrict('CASSLXPGATNEKLFF')).toBe(false);
      expect(Utils.SequencePattern.isPatternValidStrict('CASSL[ASR]PGATNEKLFF')).toBe(false);
    });

    it('accepts an empty pattern, and rejects an over-long one', () => {
      expect(Utils.SequencePattern.isPatternValidStrict('')).toBe(true);
      expect(Utils.SequencePattern.isPatternValidStrict('C'.repeat(101))).toBe(false);
    });
  });
});
