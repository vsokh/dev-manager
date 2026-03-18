import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { TaskBoard } from '../../components/TaskBoard.tsx';
import type { Task, QueueItem, Epic } from '../../types';

afterEach(cleanup);

function makeTask(id: number, overrides: Partial<Task> = {}): Task {
  return { id, name: `Task ${id}`, status: 'pending', ...overrides };
}

const defaultProps = () => ({
  tasks: [] as Task[],
  selectedTask: null,
  onSelectTask: vi.fn(),
  onAddTask: vi.fn(),
  onQueueAll: vi.fn(),
  onQueueGroup: vi.fn(),
  onArrange: vi.fn(),
  queue: [] as QueueItem[],
  onPauseTask: vi.fn(),
  onCancelTask: vi.fn(),
  onRenameGroup: vi.fn(),
  epics: [] as Epic[],
  onUpdateEpics: vi.fn(),
  glowTaskId: null,
});

describe('TaskBoard', () => {
  it('renders empty state when tasks=[]', () => {
    render(<TaskBoard {...defaultProps()} />);
    expect(screen.getByText('No tasks yet')).toBeDefined();
  });

  it('renders "Up next" label', () => {
    render(<TaskBoard {...defaultProps()} />);
    expect(screen.getByText('Up next')).toBeDefined();
  });

  it('renders "+ Add task" button', () => {
    render(<TaskBoard {...defaultProps()} />);
    expect(screen.getByText('+ Add task')).toBeDefined();
  });

  it('renders tasks grouped by epic with task names visible', () => {
    const tasks = [
      makeTask(1, { name: 'Auth login', group: 'Auth' }),
      makeTask(2, { name: 'Auth signup', group: 'Auth' }),
      makeTask(3, { name: 'Dashboard chart', group: 'Dashboard' }),
    ];
    const epics: Epic[] = [
      { name: 'Auth', color: 0 },
      { name: 'Dashboard', color: 1 },
    ];
    render(<TaskBoard {...defaultProps()} tasks={tasks} epics={epics} />);
    expect(screen.getByText('Auth login')).toBeDefined();
    expect(screen.getByText('Auth signup')).toBeDefined();
    expect(screen.getByText('Dashboard chart')).toBeDefined();
  });

  it('renders "Arrange tasks" button when tasks exist', () => {
    const tasks = [makeTask(1)];
    render(<TaskBoard {...defaultProps()} tasks={tasks} />);
    expect(screen.getByText('Arrange tasks')).toBeDefined();
  });

  it('renders "Queue all" button when there are unqueued pending tasks', () => {
    const tasks = [makeTask(1), makeTask(2)];
    render(<TaskBoard {...defaultProps()} tasks={tasks} />);
    expect(screen.getByText(/Queue all/)).toBeDefined();
  });

  it('does NOT show status filter when fewer than 2 pending tasks', () => {
    const tasks = [makeTask(1)];
    render(<TaskBoard {...defaultProps()} tasks={tasks} />);
    expect(screen.queryByPlaceholderText('Search tasks...')).toBeNull();
  });

  describe('interactions', () => {
    it('clicking "+ Add task" shows the CardForm', () => {
      render(<TaskBoard {...defaultProps()} />);
      const addBtn = screen.getByText('+ Add task');
      fireEvent.click(addBtn);
      // CardForm renders a title input with placeholder "Task title..."
      expect(screen.getByPlaceholderText('Task title...')).toBeDefined();
    });

    it('clicking "Arrange tasks" button calls onArrange', () => {
      const props = defaultProps();
      const tasks = [makeTask(1)];
      render(<TaskBoard {...props} tasks={tasks} />);
      const arrangeBtn = screen.getByText('Arrange tasks');
      fireEvent.click(arrangeBtn);
      expect(props.onArrange).toHaveBeenCalledTimes(1);
    });

    it('clicking "Queue all" button calls onQueueAll', () => {
      const props = defaultProps();
      const tasks = [makeTask(1), makeTask(2)];
      render(<TaskBoard {...props} tasks={tasks} />);
      const queueAllBtn = screen.getByText(/Queue all/);
      fireEvent.click(queueAllBtn);
      expect(props.onQueueAll).toHaveBeenCalledTimes(1);
    });
  });
});
