import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import EvaluationView from '../EvaluationView';

const mockUseAuth = vi.fn();
const mockFetchEvaluationData = vi.fn();
const mockSubmitGrades = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'submission-1' }),
  };
});

vi.mock('../evaluationApi', () => ({
  fetchEvaluationData: (...args) => mockFetchEvaluationData(...args),
  submitGrades: (...args) => mockSubmitGrades(...args),
  computeTotalScore: () => 10,
}));

vi.mock('../../components/Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock('../QuestionPanel', () => ({
  default: () => <div data-testid="question-panel">QuestionPanel</div>,
}));

vi.mock('../GradingPanel', () => ({
  default: ({ onSubmit }) => (
    <div data-testid="grading-panel">
      <button type="button" onClick={onSubmit}>Submit Grades</button>
    </div>
  ),
}));

describe('EvaluationView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders access denied message for non-teacher users', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'student' }, initializing: false });

    render(
      <MemoryRouter>
        <EvaluationView />
      </MemoryRouter>,
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it('does not use window.alert on save', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    mockUseAuth.mockReturnValue({ user: { role: 'teacher' }, initializing: false });
    mockFetchEvaluationData.mockResolvedValue({
      submission: {
        exam_id: 'exam-1',
        answers: {},
        audio_files: {},
        grades: {},
        feedback: '',
      },
      exam: {
        questions: [{ _id: 'q1', text: 'Q1', marks: 5 }],
      },
      grades: {},
      feedback: '',
    });
    mockSubmitGrades.mockResolvedValue({});

    render(
      <MemoryRouter>
        <EvaluationView />
      </MemoryRouter>,
    );

    const submitBtn = await screen.findByRole('button', { name: /submit grades/i });
    await user.click(submitBtn);

    await waitFor(() => expect(mockSubmitGrades).toHaveBeenCalledTimes(1));
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
