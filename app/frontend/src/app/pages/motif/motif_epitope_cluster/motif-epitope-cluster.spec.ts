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

import { findScrollableAncestor } from './motif-epitope-cluster.component';

/** Arriving at /motif from a structure card carries a cid, and the linked cluster is centred by
 * scrolling. Picking the wrong element to scroll fails silently — the page simply never moves —
 * so the choice is what these assert.
 */
describe('findScrollableAncestor', () => {
  let root: HTMLElement;

  const box = (parent: HTMLElement, style: string): HTMLElement => {
    const el = document.createElement('div');
    el.setAttribute('style', style);
    parent.appendChild(el);
    return el;
  };

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => document.body.removeChild(root));

  it('finds an overflowing ancestor that scrolls', () => {
    const scroller = box(root, 'overflow-y: auto; height: 50px;');
    const target = box(scroller, 'height: 500px;');
    expect(findScrollableAncestor(target)).toBe(scroller);
  });

  it('ignores an auto ancestor whose content fits, since it cannot scroll', () => {
    const roomy = box(root, 'overflow-y: auto; height: 500px;');
    const target = box(roomy, 'height: 10px;');
    expect(findScrollableAncestor(target)).toBeNull();
  });

  it('ignores a visible ancestor even when its content overflows', () => {
    const spilling = box(root, 'overflow-y: visible; height: 50px;');
    const target = box(spilling, 'height: 500px;');
    expect(findScrollableAncestor(target)).toBeNull();
  });

  // The bug this exists for: body reports overflow-y:auto and an overflowing scrollHeight in a
  // document-scrolling layout, but document.scrollingElement is <html>, so body.scrollTo() moves
  // nothing. Returning body here is why the linked cluster stayed 847px below the fold.
  it('never returns body, even when body itself overflows', () => {
    const filler = box(root, 'height: 4000px;');
    document.body.style.overflowY = 'auto';
    try {
      expect(document.body.scrollHeight).toBeGreaterThan(document.body.clientHeight);
      expect(findScrollableAncestor(filler)).toBeNull();
    } finally {
      document.body.style.overflowY = '';
    }
  });

  it('returns the nearest scroller, not the outermost', () => {
    const outer = box(root, 'overflow-y: scroll; height: 50px;');
    const inner = box(outer, 'overflow-y: auto; height: 40px;');
    const target = box(inner, 'height: 400px;');
    expect(findScrollableAncestor(target)).toBe(inner);
  });
});
