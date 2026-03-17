import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BrowserGuard from '../BrowserGuard';

describe('BrowserGuard', () => {
  const originalSpeechRecognition = window.SpeechRecognition;
  const originalWebkitSpeechRecognition = window.webkitSpeechRecognition;
  const originalSpeechSynthesisUtterance = window.SpeechSynthesisUtterance;

  beforeEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
      speak: vi.fn(),
      cancel: vi.fn(),
      speaking: false,
      pending: false,
      },
    });

    window.SpeechSynthesisUtterance = function MockSpeechSynthesisUtterance(text) {
      this.text = text;
      this.rate = 1;
      this.volume = 1;
    };
  });

  afterEach(() => {
    window.SpeechRecognition = originalSpeechRecognition;
    window.webkitSpeechRecognition = originalWebkitSpeechRecognition;
    window.SpeechSynthesisUtterance = originalSpeechSynthesisUtterance;
    vi.restoreAllMocks();
  });

  it('renders children when browser is supported', () => {
    window.SpeechRecognition = function MockSpeechRecognition() {};

    render(
      <BrowserGuard>
        <div>Protected Content</div>
      </BrowserGuard>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText(/Browser Not Supported/i)).not.toBeInTheDocument();
  });

  it('shows warning screen when browser is not supported', () => {
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;

    render(
      <BrowserGuard>
        <div>Protected Content</div>
      </BrowserGuard>,
    );

    expect(screen.getByText(/Browser Not Supported/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue in Keyboard Mode/i })).toBeInTheDocument();
  });

  it('warning screen contains aria-describedby on Continue button', () => {
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;

    render(
      <BrowserGuard>
        <div>Protected Content</div>
      </BrowserGuard>,
    );

    const button = screen.getByRole('button', { name: /Continue in Keyboard Mode/i });
    expect(button).toHaveAttribute('aria-describedby', 'browser-warning-desc');
    expect(document.getElementById('browser-warning-desc')).toBeInTheDocument();
  });
});
