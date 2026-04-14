import { render, screen } from '@testing-library/react';
import App from './App';

test('renders primary navigation links', () => {
  render(<App />);
  expect(screen.getAllByText(/graph visualizer/i).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('link', { name: /bfs/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('link', { name: /h-s algo/i }).length).toBeGreaterThan(0);
});
