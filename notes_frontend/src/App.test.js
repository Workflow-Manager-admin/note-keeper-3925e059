import { render, screen } from '@testing-library/react';
import App from './App';

test('renders add note button', () => {
  render(<App />);
  const addButton = screen.getByRole('button', { name: /add note/i });
  expect(addButton).toBeInTheDocument();
});
