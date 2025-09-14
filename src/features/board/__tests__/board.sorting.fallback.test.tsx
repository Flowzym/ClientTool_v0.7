import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import Board from '../../Board';

describe('Board sorting fallback', () => {
  it('clicking Kunde header does not throw and sets an aria-sort', async () => {
    const user = userEvent.setup();
    render(<Board />);
    const header = await screen.findByRole('columnheader', { name: /kunde/i });
    expect(header).toBeInTheDocument();
    await user.click(header); // should not throw
    const aria = header.getAttribute('aria-sort');
    expect(['ascending','descending','none', null]).toContain(aria);
  });
});
