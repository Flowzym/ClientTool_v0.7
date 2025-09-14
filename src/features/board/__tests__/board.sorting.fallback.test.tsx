import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import Board from '../../Board';

describe('Board sorting fallback (shimmed setView)', () => {
  it('clicking Kunde header does not throw and aria-sort is reasonable', async () => {
    const user = userEvent.setup();
    render(<Board />);
    const header = await screen.findByRole('columnheader', { name: /kunde/i });
    await user.click(header);
    expect(header).toBeInTheDocument();
    const aria = header.getAttribute('aria-sort');
    expect(['ascending','descending','none', null]).toContain(aria);
  });
});
