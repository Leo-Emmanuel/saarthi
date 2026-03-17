import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TeacherDashboard from '../TeacherDashboard';

vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../../components/Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

import api from '../../config/axios';

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        items: [
          {
            _id: 'sub-1',
            student: 'Alice',
            student_name: 'Alice Johnson',
            student_id: 'S-1001',
            student_email: 'alice@example.com',
            exam_id: 'exam-123',
            exam_title: 'Mathematics Midterm',
            submitted_at: '2026-03-07T08:00:00.000Z',
            is_graded: false,
            total_marks: null,
          },
        ],
      },
    });
  });

  it('renders without crashing', async () => {
    render(
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Teacher Dashboard')).toBeInTheDocument();
  });

  it('shows "Teacher Dashboard" heading (not "Valuation")', async () => {
    render(
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Teacher Dashboard')).toBeInTheDocument();
    expect(screen.queryByText(/Valuation/i)).not.toBeInTheDocument();
  });

  it('shows Export CSV button', async () => {
    render(
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('shows filter dropdown with All/Pending/Graded options', async () => {
    render(
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>,
    );

    const filter = await screen.findByLabelText(/filter by grading status/i);
    expect(filter).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pending' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Graded' })).toBeInTheDocument();
  });
});
