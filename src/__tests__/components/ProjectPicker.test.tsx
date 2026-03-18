import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ProjectPicker } from '../../components/ProjectPicker.tsx';

afterEach(cleanup);

const defaultProps = () => ({
  onConnect: vi.fn(),
  onReconnect: vi.fn(),
  lastProjectName: '',
  status: 'disconnected',
});

describe('ProjectPicker', () => {
  it('renders "Dev Manager" heading when disconnected', () => {
    render(<ProjectPicker {...defaultProps()} />);
    expect(screen.getByText('Dev Manager')).toBeDefined();
  });

  it('renders "Open project" button when disconnected', () => {
    render(<ProjectPicker {...defaultProps()} />);
    expect(screen.getByRole('button', { name: 'Open project' })).toBeDefined();
  });

  it('shows "Last opened: {name}" button when lastProjectName is set', () => {
    render(<ProjectPicker {...defaultProps()} lastProjectName="my-app" />);
    expect(screen.getByText('Last opened: my-app')).toBeDefined();
  });

  it('does NOT show last project button when lastProjectName is empty', () => {
    render(<ProjectPicker {...defaultProps()} lastProjectName="" />);
    expect(screen.queryByText(/Last opened/)).toBeNull();
  });

  it('shows error message when status is "error"', () => {
    render(<ProjectPicker {...defaultProps()} status="error" />);
    expect(screen.getByText(/Could not connect/)).toBeDefined();
  });

  it('shows loading skeleton when status is "connecting"', () => {
    const { container } = render(<ProjectPicker {...defaultProps()} status="connecting" />);
    const skeletonBars = container.querySelectorAll('.skeleton-bar');
    expect(skeletonBars.length).toBeGreaterThan(0);
  });

  describe('interactions', () => {
    it('clicking "Open project" button calls onConnect', () => {
      const props = defaultProps();
      render(<ProjectPicker {...props} />);
      const openBtn = screen.getByRole('button', { name: 'Open project' });
      fireEvent.click(openBtn);
      expect(props.onConnect).toHaveBeenCalledTimes(1);
    });

    it('clicking "Last opened: {name}" button calls onReconnect', () => {
      const props = defaultProps();
      render(<ProjectPicker {...props} lastProjectName="my-app" />);
      const reconnectBtn = screen.getByText('Last opened: my-app');
      fireEvent.click(reconnectBtn);
      expect(props.onReconnect).toHaveBeenCalledTimes(1);
    });
  });
});
