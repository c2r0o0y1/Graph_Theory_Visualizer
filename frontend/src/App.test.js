import { render, screen } from '@testing-library/react';
import App from './App';

test('renders primary navigation links', () => {
  render(<App />);
  expect(screen.getAllByText(/graph visualizer/i).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('link', { name: /bfs algorithm/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('link', { name: /graph coloring/i }).length).toBeGreaterThan(0);
});
