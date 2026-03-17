import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnswerPlayback from '../AnswerPlayback';

const Q1 = { _id: 'q1', text: 'What is the capital of France?' };
const Q2 = { _id: 'q2', text: 'What is 2 plus 2?' };
const Q3 = { _id: 'q3', text: 'Name a primary colour.' };

const QUESTIONS = [Q1, Q2, Q3];
const ANSWERS_FULL = { q1: 'Paris', q2: 'Four', q3: 'Red' };
const ANSWERS_MISSING_Q1 = { q2: 'Four', q3: 'Red' }; // q1 has no entry

function makeProps(overrides = {}) {
  return {
    questions: QUESTIONS,
    answers: ANSWERS_FULL,
    onEdit: vi.fn(),
    onComplete: vi.fn(),
    examType: 'mixed',
    speak: vi.fn(),
    cancel: vi.fn(),
    ...overrides,
  };
}

describe('AnswerPlayback', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── 1. Renders without crashing ────────────────────────────────────────────
  it('renders without crashing with valid props', () => {
    render(<AnswerPlayback {...makeProps()} />);
    expect(screen.getByText('Answer Playback')).toBeInTheDocument();
  });

  // ── 2. Shows correct question text ────────────────────────────────────────
  it('shows the correct question text for the current question', () => {
    render(<AnswerPlayback {...makeProps()} />);
    expect(screen.getByText(Q1.text)).toBeInTheDocument();
  });

  // ── 3. No-answer warning ───────────────────────────────────────────────────
  it('shows ⚠️ No answer recorded when the answer for the current question is missing', () => {
    render(<AnswerPlayback {...makeProps({ answers: ANSWERS_MISSING_Q1 })} />);
    expect(screen.getByText(/No answer recorded/i)).toBeInTheDocument();
  });

  it('does NOT show the warning when the answer is present', () => {
    render(<AnswerPlayback {...makeProps()} />);
    expect(screen.queryByText(/No answer recorded/i)).not.toBeInTheDocument();
  });

  // ── 4. Progress indicator ──────────────────────────────────────────────────
  it('shows progress indicator "Reviewing answer 1 of N"', () => {
    render(<AnswerPlayback {...makeProps()} />);
    expect(
      screen.getByText(`Reviewing answer 1 of ${QUESTIONS.length}`),
    ).toBeInTheDocument();
  });

  // ── 5. Next button advances index ─────────────────────────────────────────
  it('clicking "Keep & Next" on a non-last question advances to the next question', () => {
    render(<AnswerPlayback {...makeProps()} />);
    // Start on Q1, click Next → should show Q2
    fireEvent.click(screen.getByRole('button', { name: /keep and go to next answer/i }));
    expect(screen.getByText(Q2.text)).toBeInTheDocument();
  });

  it('clicking "Keep & Next" on the last question calls onComplete', () => {
    const onComplete = vi.fn();
    // Start directly on the last question by passing a single-element array
    render(
      <AnswerPlayback
        {...makeProps({ questions: [Q3], answers: { q3: 'Red' }, onComplete })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /keep and go to next answer/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('clicking "Change Answer" calls onEdit with the current index', () => {
    const onEdit = vi.fn();
    render(<AnswerPlayback {...makeProps({ onEdit })} />);
    fireEvent.click(screen.getByRole('button', { name: /change answer/i }));
    expect(onEdit).toHaveBeenCalledWith(0);
  });

  // ── 6. Skip All calls onComplete ──────────────────────────────────────────
  it('clicking "Skip All" calls onComplete', () => {
    const onComplete = vi.fn();
    render(<AnswerPlayback {...makeProps({ onComplete })} />);
    fireEvent.click(screen.getByRole('button', { name: /skip all and submit/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  // ── 7. Missing callback props don't crash ─────────────────────────────────
  it('does not crash when onComplete is undefined', () => {
    render(<AnswerPlayback {...makeProps({ onComplete: undefined })} />);
    // Skip All should not throw
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /skip all and submit/i })),
    ).not.toThrow();
  });

  it('does not crash when onEdit is undefined', () => {
    render(<AnswerPlayback {...makeProps({ onEdit: undefined })} />);
    // Change Answer should not throw
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /change answer/i })),
    ).not.toThrow();
  });
});
