/**
 * @fileoverview Smoke test for the landing join form.
 * React Router 7 cannot be loaded inside CRA 5 Jest, so `useNavigate` is mocked.
 * `uuid` is ESM-only; mock it so Jest does not try to parse the package.
 */

import { render, screen } from '@testing-library/react';
import Home from './components/Home';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: () => 'test-room-id',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

/**
 * Asserts the home page heading and both action buttons are present.
 *
 * @returns {void}
 */
test('renders the home join form', () => {
  render(<Home />);

  expect(screen.getByRole('heading', { name: /enter the coding group/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /join the group/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /create a new group/i })).toBeInTheDocument();
});
