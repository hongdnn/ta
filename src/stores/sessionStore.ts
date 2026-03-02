import { create } from 'zustand';

export type SessionStatus = 'idle' | 'source-picking' | 'consenting' | 'active' | 'paused';
export type AssistantState = 'idle' | 'capturing' | 'processing' | 'result';
export type ProcessingStep = 'CAPTURING' | 'PROCESSING' | 'DONE';

export interface SharedSource {
  id: string;
  type: 'screen' | 'window' | 'tab';
  name: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  type: 'capture' | 'question';
  question: string;
  courseName: string;
}

export interface Course {
  id: string;
  name: string;
  materials: string[];
  isActive: boolean;
}

interface SessionStore {
  // Session
  sessionStatus: SessionStatus;
  selectedSource: SharedSource | null;
  includeAudio: boolean;
  audioSource: string;
  sessionStartTime: number | null;
  activeCourse: string | null;

  // Assistant
  assistantState: AssistantState;
  processingStep: ProcessingStep;
  inputText: string;

  // History
  historyItems: HistoryItem[];

  // Courses
  courses: Course[];

  // Settings
  settings: {
    hotkey: string;
    captureDuration: number;
    includeAudio: boolean;
    compactMiniPanel: boolean;
    localOnly: boolean;
    autoSaveCaptures: boolean;
  };

  // Actions
  setSessionStatus: (status: SessionStatus) => void;
  setSelectedSource: (source: SharedSource | null) => void;
  setIncludeAudio: (v: boolean) => void;
  setAudioSource: (v: string) => void;
  startSession: () => void;
  stopSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  setAssistantState: (state: AssistantState) => void;
  setProcessingStep: (step: ProcessingStep) => void;
  setInputText: (text: string) => void;
  captureMoment: () => void;
  sendQuestion: (question: string) => void;
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  deleteHistoryItem: (id: string) => void;
  addCourse: (name: string) => void;
  setActiveCourse: (id: string | null) => void;
  addMaterial: (courseId: string, fileName: string) => void;
  updateSettings: (settings: Partial<SessionStore['settings']>) => void;
  setActiveCourseId: (id: string | null) => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionStatus: 'idle',
  selectedSource: null,
  includeAudio: true,
  audioSource: 'system',
  sessionStartTime: null,
  activeCourse: null,

  assistantState: 'idle',
  processingStep: 'CAPTURING',
  inputText: '',

  historyItems: [],
  courses: [],

  settings: {
    hotkey: 'Ctrl+Shift+Space',
    captureDuration: 20,
    includeAudio: true,
    compactMiniPanel: false,
    localOnly: true,
    autoSaveCaptures: false,
  },

  setSessionStatus: (status) => set({ sessionStatus: status }),
  setSelectedSource: (source) => set({ selectedSource: source }),
  setIncludeAudio: (v) => set({ includeAudio: v }),
  setAudioSource: (v) => set({ audioSource: v }),

  startSession: () => set({ sessionStatus: 'active', sessionStartTime: Date.now(), assistantState: 'idle' }),
  stopSession: () => set({ sessionStatus: 'idle', selectedSource: null, sessionStartTime: null, assistantState: 'idle' }),
  pauseSession: () => set({ sessionStatus: 'paused' }),
  resumeSession: () => set({ sessionStatus: 'active' }),

  setAssistantState: (state) => set({ assistantState: state }),
  setProcessingStep: (step) => set({ processingStep: step }),
  setInputText: (text) => set({ inputText: text }),

  captureMoment: () => {
    const { sessionStatus } = get();
    if (sessionStatus !== 'active') return;
    set({ assistantState: 'capturing', processingStep: 'CAPTURING' });
    setTimeout(() => set({ processingStep: 'PROCESSING' }), 800);
    setTimeout(() => set({ processingStep: 'DONE', assistantState: 'result' }), 2000);
  },

  sendQuestion: (question) => {
    const { sessionStatus } = get();
    if (sessionStatus !== 'active') return;
    set({ assistantState: 'capturing', processingStep: 'CAPTURING', inputText: '' });
    setTimeout(() => set({ processingStep: 'PROCESSING' }), 400);
    setTimeout(() => set({ processingStep: 'DONE', assistantState: 'result' }), 1500);
  },

  addHistoryItem: (item) => set((s) => ({
    historyItems: [{ ...item, id: crypto.randomUUID(), timestamp: Date.now() }, ...s.historyItems],
  })),

  deleteHistoryItem: (id) => set((s) => ({
    historyItems: s.historyItems.filter((i) => i.id !== id),
  })),

  addCourse: (name) => set((s) => ({
    courses: [...s.courses, { id: crypto.randomUUID(), name, materials: [], isActive: false }],
  })),

  setActiveCourse: (id) => set((s) => ({
    courses: s.courses.map((c) => ({ ...c, isActive: c.id === id })),
    activeCourse: id,
  })),

  addMaterial: (courseId, fileName) => set((s) => ({
    courses: s.courses.map((c) =>
      c.id === courseId ? { ...c, materials: [...c.materials, fileName] } : c
    ),
  })),

  updateSettings: (newSettings) => set((s) => ({
    settings: { ...s.settings, ...newSettings },
  })),

  setActiveCourseId: (id) => set({ activeCourse: id }),
}));
