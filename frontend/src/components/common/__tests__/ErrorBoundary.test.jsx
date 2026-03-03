import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

function ThrowingChild({ error }) {
  throw error;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected error boundary logs
  const originalError = console.error;
  beforeEach(() => { console.error = vi.fn(); });
  afterEach(() => { console.error = originalError; });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('shows fallback UI on error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild error={new Error('Test crash')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test crash')).toBeInTheDocument();
  });

  it('shows reload button on error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild error={new Error('Oops')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('handles error without message', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild error={new Error()} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
