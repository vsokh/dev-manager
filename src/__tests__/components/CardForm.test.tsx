import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CardForm } from '../../components/CardForm.tsx';
import type { Task } from '../../types';

afterEach(cleanup);

function makeTask(id: number, overrides: Partial<Task> = {}): Task {
  return { id, name: `Task ${id}`, status: 'pending', ...overrides };
}

const defaultProps = () => ({
  card: null as Partial<Task> | null,
  onSave: vi.fn(),
});

describe('CardForm', () => {
  it('renders with title input placeholder "Task title..."', () => {
    render(<CardForm {...defaultProps()} />);
    expect(screen.getByPlaceholderText('Task title...')).toBeDefined();
  });

  it('renders "Add task" submit button for new task (card=null)', () => {
    render(<CardForm {...defaultProps()} />);
    const btn = screen.getByRole('button', { name: 'Add task' });
    expect(btn).toBeDefined();
  });

  it('renders "Save" submit button when editing (card provided)', () => {
    const card = makeTask(1, { name: 'Existing task' });
    render(<CardForm {...defaultProps()} card={card} />);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeDefined();
  });

  it('renders Cancel button when onCancel provided', () => {
    render(<CardForm {...defaultProps()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
  });

  it('does NOT render Cancel button when onCancel omitted', () => {
    render(<CardForm {...defaultProps()} />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('renders manual task checkbox', () => {
    render(<CardForm {...defaultProps()} />);
    expect(screen.getByText(/Manual task/)).toBeDefined();
  });

  it('renders Skills section', () => {
    render(<CardForm {...defaultProps()} />);
    expect(screen.getByText('Skills')).toBeDefined();
  });

  it('renders Epic input with placeholder', () => {
    render(<CardForm {...defaultProps()} />);
    expect(screen.getByPlaceholderText(/Epic/)).toBeDefined();
  });
});
