import { create } from 'zustand';

export interface LastRunResult {
  status: string;
  stderr?: string;
  stdout?: string;
  failingTest?: string;
}

export interface EditorContext {
  problemId: string;
  title: string;
  description: string;
  userCode: string;
  language: string;
  lastRun?: LastRunResult;
}

interface EditorContextState extends EditorContext {
  setProblem: (problemId: string, title: string, description: string) => void;
  setCode: (code: string, language: string) => void;
  setLastRun: (run: LastRunResult) => void;
  clearLastRun: () => void;
  reset: () => void;
  getCompressedContext: () => EditorContext;
}

const INITIAL_STATE: EditorContext = {
  problemId: '',
  title: '',
  description: '',
  userCode: '',
  language: 'javascript',
  lastRun: undefined,
};

/**
 * Centralized editor context store.
 * Tracks the current problem, user code, language, and last execution result.
 * Used by AI endpoints to provide context-aware responses.
 */
export const useEditorContext = create<EditorContextState>((set, get) => ({
  ...INITIAL_STATE,

  setProblem: (problemId, title, description) =>
    set({ problemId, title, description, lastRun: undefined }),

  setCode: (userCode, language) =>
    set({ userCode, language }),

  setLastRun: (run) =>
    set({ lastRun: run }),

  clearLastRun: () =>
    set({ lastRun: undefined }),

  reset: () =>
    set(INITIAL_STATE),

  /**
   * Returns a compressed version of the context for AI payloads.
   * - Code truncated to last ~300 lines
   * - Description summarized if >1500 chars
   * - Only failing test info included
   */
  getCompressedContext: (): EditorContext => {
    const state = get();
    const lines = state.userCode.split('\n');
    const truncatedCode = lines.length > 300
      ? lines.slice(-300).join('\n')
      : state.userCode;

    const truncatedDesc = state.description.length > 1500
      ? state.description.slice(0, 1500) + '...'
      : state.description;

    return {
      problemId: state.problemId,
      title: state.title,
      description: truncatedDesc,
      userCode: truncatedCode,
      language: state.language,
      lastRun: state.lastRun,
    };
  },
}));
