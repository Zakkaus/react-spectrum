/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {Button} from '../src/Button';
import {expect, it, vi} from 'vitest';
import {FocusWithinProps, useFocusWithin} from 'react-aria/useFocusWithin';
import {Group} from '../src/Group';
import {Link} from '../src/Link';
import React from 'react';
import {render} from 'vitest-browser-react';
import {userEvent} from 'vitest/browser';

function Example({
  isDisabled = false,
  onBlur,
  onBlurWithin,
  onFocusWithinChange
}: FocusWithinProps & {
  onBlur?: (e: React.FocusEvent) => void;
}) {
  let {focusWithinProps} = useFocusWithin({onBlurWithin, onFocusWithinChange});
  return (
    <>
      <Group aria-label="Actions" {...focusWithinProps} role="group">
        <Link isDisabled={isDisabled} onBlur={onBlur}>
          First
        </Link>
        <Button>Second</Button>
      </Group>
      <Button>Outside</Button>
    </>
  );
}

it.each(['unfocusable during a render', 'unfocusable outside React'])(
  'reports blur once and updates group focus when a child is %s',
  async change => {
    let onBlur = vi.fn();
    let onBlurWithin = vi.fn(e => e.currentTarget);
    let onFocusWithinChange = vi.fn();
    let props = {onBlur, onBlurWithin, onFocusWithinChange};
    let {getByRole, getByText, rerender, unmount} = await render(<Example {...props} />);
    let group = getByRole('group');
    let first = getByText('First');
    let second = getByRole('button', {name: 'Second'});
    let outside = getByRole('button', {name: 'Outside'});
    await userEvent.click(first);
    await userEvent.click(second);
    await expect.element(group).toHaveAttribute('data-focus-within', 'true');
    expect(onBlurWithin).not.toHaveBeenCalled();
    expect(onFocusWithinChange.mock.calls).toEqual([[true]]);
    await userEvent.click(outside);
    expect(onBlurWithin).toHaveReturnedWith(group.element());
    vi.clearAllMocks();

    await userEvent.click(first);
    await userEvent.keyboard('{Escape}');
    await expect.element(group).toHaveAttribute('data-focus-visible', 'true');
    if (change === 'unfocusable during a render') {
      await rerender(<Example {...props} isDisabled />);
    } else {
      first.element().removeAttribute('tabindex');
    }
    if (document.activeElement !== first.element()) {
      await expect.element(group).not.toHaveAttribute('data-focus-within');
    }
    await userEvent.click(outside);
    await expect.poll(() => onBlur.mock.calls.length).toBe(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(onBlurWithin).toHaveBeenCalledTimes(1);
    expect(onBlurWithin).toHaveReturnedWith(group.element());
    expect(onFocusWithinChange.mock.calls).toEqual([[true], [false]]);
    await expect.element(first).not.toHaveAttribute('data-focused');
    await expect.element(first).not.toHaveAttribute('data-focus-visible');
    await expect.element(group).not.toHaveAttribute('data-focus-within');
    await expect.element(group).not.toHaveAttribute('data-focus-visible');

    await rerender(<Example {...props} />);
    first.element().setAttribute('tabindex', '0');
    await userEvent.click(first);
    let target = first.element();
    expect(document.activeElement).toBe(target);
    await unmount();
    vi.clearAllMocks();
    target.removeAttribute('tabindex');
    target.dispatchEvent(new FocusEvent('focusout', {bubbles: true}));
    expect(onBlur).not.toHaveBeenCalled();
    expect(onBlurWithin).not.toHaveBeenCalled();
    expect(onFocusWithinChange).not.toHaveBeenCalled();
  }
);
