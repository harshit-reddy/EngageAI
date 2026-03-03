import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from '../Home';

// Mock axios to avoid real HTTP calls
vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { ml: true } })),
    post: vi.fn(() => Promise.resolve({ data: { sessionId: 'TEST01' } })),
  },
}));

const defaultProps = {
  onStart: vi.fn(),
  onJoin: vi.fn(),
  preJoinId: '',
  isAdmin: false,
  onAdminLogin: vi.fn(),
  onAdminLogout: vi.fn(),
  onViewDashboard: vi.fn(),
  onViewAnalytics: vi.fn(),
};

describe('Home', () => {
  it('renders the page title', () => {
    render(<Home {...defaultProps} />);
    expect(screen.getByText('EngageAI')).toBeInTheDocument();
  });

  it('renders Join Meeting tab by default', () => {
    render(<Home {...defaultProps} />);
    expect(screen.getByText('Join Meeting')).toBeInTheDocument();
  });

  it('renders Admin Login tab', () => {
    render(<Home {...defaultProps} />);
    expect(screen.getByText('Admin Login')).toBeInTheDocument();
  });

  it('shows name and meeting ID inputs in join tab', () => {
    render(<Home {...defaultProps} />);
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. A3F1C2')).toBeInTheDocument();
  });

  it('switches to admin tab on click', () => {
    render(<Home {...defaultProps} />);
    fireEvent.click(screen.getByText('Admin Login'));
    expect(screen.getByPlaceholderText('admin')).toBeInTheDocument();
  });

  it('shows error when joining without name', () => {
    render(<Home {...defaultProps} />);
    fireEvent.click(screen.getByText('Join Meeting', { selector: 'button.home-btn' }));
    expect(screen.getByText('Please enter your name.')).toBeInTheDocument();
  });

  it('shows admin panel when isAdmin is true', () => {
    render(<Home {...defaultProps} isAdmin={true} />);
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('shows feature cards', () => {
    render(<Home {...defaultProps} />);
    expect(screen.getByText('Advanced ML Engine')).toBeInTheDocument();
    expect(screen.getByText('Real-Time Analytics')).toBeInTheDocument();
    expect(screen.getByText('Meeting Platform')).toBeInTheDocument();
  });
});
