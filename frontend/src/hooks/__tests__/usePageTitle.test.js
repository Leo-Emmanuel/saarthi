import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import usePageTitle from '../usePageTitle';

function HookHost({ title }) {
  usePageTitle(title);
  return null;
}

describe('usePageTitle', () => {
  it('usePageTitle("Login") sets document.title to "Login — Saarthi"', () => {
    document.title = 'Initial';
    render(React.createElement(HookHost, { title: 'Login' }));
    expect(document.title).toBe('Login — Saarthi');
  });

  it('usePageTitle("") sets document.title to "Saarthi — Accessible Exam System"', () => {
    document.title = 'Initial';
    render(React.createElement(HookHost, { title: '' }));
    expect(document.title).toBe('Saarthi — Accessible Exam System');
  });

  it('unmounting restores the previous title', () => {
    document.title = 'Previous Title';
    const { unmount } = render(React.createElement(HookHost, { title: 'Login' }));
    expect(document.title).toBe('Login — Saarthi');
    unmount();
    expect(document.title).toBe('Previous Title');
  });
});
