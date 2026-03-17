import { describe, it, expect } from 'vitest';
import mathExamReducer, {
  addStep,
  undo,
  redo,
  resetWorkspace,
  setVerbosityMode
} from '../mathExamSlice';

describe('mathExamSlice', () => {
  it('undo with empty steps array does not set currentStepIndex to -1', () => {
    const initialState = {
      steps: [],
      currentStepIndex: 0,
      verbosityMode: 'normal',
      history: { past: [], future: [] }
    };
    
    const state = mathExamReducer(initialState, undo());
    expect(state.currentStepIndex).toBe(0);
  });

  it('redo with empty future stack is a no-op', () => {
    const initialState = {
      steps: [{ latex: 'x=1' }],
      currentStepIndex: 0,
      verbosityMode: 'normal',
      history: { past: [], future: [] }
    };
    
    // Attempt redo when already at the latest step
    const state = mathExamReducer(initialState, redo());
    expect(state.currentStepIndex).toBe(0);
    expect(state.steps).toEqual(initialState.steps);
  });

  it('resetWorkspace preserves verbosityMode but resets everything else', () => {
    const initialState = {
      steps: [{ latex: 'x=1' }, { latex: 'x=2' }],
      currentStepIndex: 1,
      verbosityMode: 'verbose',
      history: { past: [], future: [] }
    };
    
    const state = mathExamReducer(initialState, resetWorkspace());
    expect(state.steps).toEqual([]);
    expect(state.currentStepIndex).toBe(0);
    expect(state.verbosityMode).toBe('verbose'); // Preserved
  });

  it('addStep then undo restores prior state correctly', () => {
    const initialState = {
      steps: [{ latex: 'x=1' }],
      currentStepIndex: 0,
      verbosityMode: 'normal',
      history: { past: [], future: [] }
    };
    
    // Add step
    let state = mathExamReducer(initialState, addStep({ latex: 'x=2' }));
    expect(state.steps).toHaveLength(2);
    expect(state.currentStepIndex).toBe(1);
    
    // Undo
    state = mathExamReducer(state, undo());
    expect(state.currentStepIndex).toBe(0);
    // Note: The mathExamSlice doesn't necessarily pop the steps on undo (it just moves the index pointer),
    // but moving the index pointer correctly restores the "active" state.
    // If addStep after undo truncates the future stack, that'd be another test case.
  });

  it('dispatching addStep with a valid payload adds a step with the correct id, latex, and timestamp', () => {
    const initialState = {
      steps: [],
      currentStepIndex: 0,
      verbosityMode: 'normal',
      history: { past: [], future: [] },
    };

    const id = 'test-uuid-1234';
    const latex = 'x^2 + y^2 = z^2';
    const timestamp = '2026-03-07T12:00:00.000Z';

    const state = mathExamReducer(
      initialState,
      addStep({ ast: { type: 'Empty' }, latex, id, timestamp }),
    );

    expect(state.steps).toHaveLength(1);
    expect(state.steps[0].id).toBe(id);
    expect(state.steps[0].latex).toBe(latex);
    expect(state.steps[0].timestamp).toBe(timestamp);
  });
});
