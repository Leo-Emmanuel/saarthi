import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PanicHelp from '../PanicHelp';

// ── Mock the voice hook so tests don't touch SpeechRecognition ───────────────
vi.mock('../../hooks/usePanicHelpVoice', () => ({
  default: vi.fn(),
}));

// ── Mock the STT loop dependency chain ───────────────────────────────────────
vi.mock('../../hooks/useSTTLoop', () => ({
  default: () => ({ start: vi.fn(), stop: vi.fn() }),
}));

const defaultProps = {
  examType: 'mcq-only',
  currentQuestion: { number: 3, type: 'mcq' },
  onDismiss: vi.fn(),
  speak: vi.fn(),
  cancel: vi.fn(),
};

describe('PanicHelp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PanicHelp {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the "Continue Exam" button', () => {
    render(<PanicHelp {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /continue exam/i }),
    ).toBeInTheDocument();
  });

  it('calls onDismiss when the Continue Exam button is clicked', () => {
    const onDismiss = vi.fn();
    render(<PanicHelp {...defaultProps} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /continue exam/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders MCQ-specific commands for examType="mcq-only"', () => {
    render(<PanicHelp {...defaultProps} examType="mcq-only" />);
    // MCQ commands should appear
    expect(screen.getByText(/A \/ B \/ C \/ D/i)).toBeInTheDocument();
    expect(screen.getByText(/Select answer/i)).toBeInTheDocument();
    // Writing-only command should NOT appear
    expect(screen.queryByText(/New step/i)).not.toBeInTheDocument();
  });

  it('renders writing-specific commands for examType="writing-only"', () => {
    render(<PanicHelp {...defaultProps} examType="writing-only" />);
    // Writing commands should appear
    expect(screen.getByText(/New step/i)).toBeInTheDocument();
    expect(screen.getByText(/Start a new line/i)).toBeInTheDocument();
    // MCQ-only command should NOT appear
    expect(screen.queryByText(/A \/ B \/ C \/ D/i)).not.toBeInTheDocument();
  });
});
