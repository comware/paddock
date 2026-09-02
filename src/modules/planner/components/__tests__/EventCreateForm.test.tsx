/**
 * EventCreateForm Component Tests
 *
 * Tests rendering, form validation, and submission behavior
 * of the event creation form.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EventCreateForm } from '../EventCreateForm';

// Mock usePlannerStore
const mockCreateEvent = vi.fn().mockResolvedValue('event-123');
vi.mock('../../stores/usePlannerStore', () => ({
  usePlannerStore: () => ({
    createEvent: mockCreateEvent,
  }),
}));

// Mock useSites
const mockLoadSites = vi.fn();
vi.mock('@/platform', () => ({
  useSites: () => ({
    sites: [
      { id: 'site-1', name: 'Main Garden' },
      { id: 'site-2', name: 'Greenhouse' },
    ],
    loadSites: mockLoadSites,
  }),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

function renderForm() {
  return render(
    <MemoryRouter>
      <EventCreateForm />
    </MemoryRouter>
  );
}

describe('EventCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the form heading', () => {
      renderForm();
      expect(screen.getByText('New Event')).toBeInTheDocument();
    });

    it('renders all required form fields', () => {
      renderForm();
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/event type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/scheduled date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/site/i)).toBeInTheDocument();
    });

    it('renders optional fields', () => {
      renderForm();
      expect(screen.getByLabelText(/species/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tray id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/batch id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders submit and cancel buttons', () => {
      renderForm();
      expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders event types grouped by module', () => {
      renderForm();
      const select = screen.getByLabelText(/event type/i);
      expect(select).toBeInTheDocument();
      // Check optgroups exist via their labels in the rendered output
      expect(screen.getByText('Sow')).toBeInTheDocument();
      expect(screen.getByText('Take Cuttings')).toBeInTheDocument();
      expect(screen.getByText('Maintenance')).toBeInTheDocument();
    });

    it('renders site dropdown with loaded sites', () => {
      renderForm();
      expect(screen.getByText('Main Garden')).toBeInTheDocument();
      expect(screen.getByText('Greenhouse')).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows error when title is empty on submit', async () => {
      renderForm();

      // Clear title and submit
      fireEvent.click(screen.getByRole('button', { name: /create event/i }));

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
    });

    it('does not call createEvent when validation fails', async () => {
      renderForm();

      fireEvent.click(screen.getByRole('button', { name: /create event/i }));

      await waitFor(() => {
        expect(mockCreateEvent).not.toHaveBeenCalled();
      });
    });
  });

  describe('form interaction', () => {
    it('allows entering a title', () => {
      renderForm();
      const input = screen.getByLabelText(/title/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Sow sunflowers' } });
      expect(input.value).toBe('Sow sunflowers');
    });

    it('allows changing event type', () => {
      renderForm();
      const select = screen.getByLabelText(/event type/i) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'harvest' } });
      expect(select.value).toBe('harvest');
    });

    it('allows entering notes', () => {
      renderForm();
      const textarea = screen.getByLabelText(/notes/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Remember to water' } });
      expect(textarea.value).toBe('Remember to water');
    });

    it('navigates to calendar on cancel', () => {
      renderForm();
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/planner');
    });
  });

  describe('site loading', () => {
    it('calls loadSites on mount', () => {
      renderForm();
      expect(mockLoadSites).toHaveBeenCalled();
    });
  });
});
