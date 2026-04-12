import { create } from 'zustand';
import { audioRingBuffer } from '@/lib/audioRingBuffer';
import { ASSIST_STREAM_PATH, uploadCaptureStream } from '@/api/captures';
import { ApiClientError, getApiBaseUrl } from '@/api/apiClient';
import { createSession, endSession } from '@/api/sessions';
import { captureSourceFrame } from '@/lib/frameCapture';

export type SessionStatus = 'idle' | 'source-picking' | 'consenting' | 'active';
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
}

function logToTerminal(level: 'info' | 'warn' | 'error', message: string, meta?: unknown) {
  window.taAPI?.log(level, message, meta);
}

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
const CONTEXT_RETRY_COUNT = 4;
const CONTEXT_RETRY_DELAY_MS = 600;
const USE_NATIVE_AUDIO = isMac;

interface SessionStore {
  // Session
  sessionStatus: SessionStatus;
  selectedSource: SharedSource | null;
  includeAudio: boolean;
  audioSource: string;
  sessionStartTime: number | null;
  activeInstitutionId: string | null;
  activeInstitutionName: string | null;
  activeCourse: string | null;
  activeCourseName: string | null;
  backendSessionId: string | null;

  // Assistant
  assistantState: AssistantState;
  processingStep: ProcessingStep;
  inputText: string;
  lastAssistantAnswer: string;
  messages: ChatMessage[];

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
  bufferStatus: 'idle' | 'starting' | 'running' | 'error';
  lastCaptureUpload: 'idle' | 'uploading' | 'success' | 'error';
  lastCaptureReason: string | null;

  // Actions
  setSessionStatus: (status: SessionStatus) => void;
  setSelectedSource: (source: SharedSource | null) => void;
  setIncludeAudio: (v: boolean) => void;
  setAudioSource: (v: string) => void;
  startSession: () => Promise<void>;
  stopSession: () => Promise<void>;
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
  setSessionContext: (payload: {
    institutionId: string | null;
    institutionName: string | null;
    courseId: string | null;
    courseName: string | null;
  }) => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionStatus: 'idle',
  selectedSource: null,
  includeAudio: true,
  audioSource: 'system',
  sessionStartTime: null,
  activeInstitutionId: null,
  activeInstitutionName: null,
  activeCourse: null,
  activeCourseName: null,
  backendSessionId: null,

  assistantState: 'idle',
  processingStep: 'CAPTURING',
  inputText: '',
  lastAssistantAnswer: '',
  messages: [],

  historyItems: [],
  courses: [],

  settings: {
    hotkey: 'Ctrl+Shift+Space',
    captureDuration: 30,
    includeAudio: true,
    compactMiniPanel: false,
    localOnly: true,
    autoSaveCaptures: false,
  },
  bufferStatus: 'idle',
  lastCaptureUpload: 'idle',
  lastCaptureReason: null,

  setSessionStatus: (status) => set({ sessionStatus: status }),
  setSelectedSource: (source) => set({ selectedSource: source }),
  setIncludeAudio: (v) => set({ includeAudio: v }),
  setAudioSource: (v) => set({ audioSource: v }),

  startSession: async () => {
    const { selectedSource, settings, activeCourse } = get();
    if (!selectedSource) {
      set({ bufferStatus: 'error', lastCaptureReason: 'No source selected.' });
      logToTerminal('error', 'Session start failed: no source selected');
      return;
    }
    if (!activeCourse) {
      set({ bufferStatus: 'error', lastCaptureReason: 'No course selected.' });
      logToTerminal('error', 'Session start failed: no course selected');
      return;
    }
    try {
      const session = await createSession(activeCourse);
      set({
        backendSessionId: session.session_id,
        sessionStatus: 'active',
        sessionStartTime: Date.now(),
        assistantState: 'idle',
        bufferStatus: 'starting',
        lastAssistantAnswer: '',
        messages: [],
      });

      // Always keep renderer audio ring buffer running so we have a stable recent-audio fallback.
      if (window.taAPI?.setDisplayMediaSource) {
        await window.taAPI.setDisplayMediaSource(selectedSource.id);
      }
      await audioRingBuffer.startDesktopAudio(selectedSource.id);
      set({ bufferStatus: 'running', lastCaptureReason: null });

      if (USE_NATIVE_AUDIO && window.taAPI?.nativeAudioStart) {
        try {
          await window.taAPI.nativeAudioStart(selectedSource);
        } catch (nativeError) {
          logToTerminal('warn', 'Native audio start failed. Using renderer audio ring buffer only.', nativeError);
        }
      }
    } catch (error) {
      set({ bufferStatus: 'error', lastCaptureReason: 'Failed to start audio buffer.' });
      console.error('[TA] Failed to start audio buffer', error);
      logToTerminal('error', 'Failed to start audio buffer', error);
    }
  },
  stopSession: async () => {
    const { backendSessionId } = get();
    if (backendSessionId) {
      try {
        await endSession(backendSessionId);
      } catch (error) {
        logToTerminal('warn', 'Failed to persist session end on backend', error);
      }
    }
    if (window.taAPI?.nativeAudioStop) {
      void window.taAPI.nativeAudioStop();
    }
    audioRingBuffer.stop();
    set({
      sessionStatus: 'idle',
      selectedSource: null,
      sessionStartTime: null,
      backendSessionId: null,
      assistantState: 'idle',
      bufferStatus: 'idle',
      lastCaptureUpload: 'idle',
      lastCaptureReason: null,
      lastAssistantAnswer: '',
      messages: [],
    });
  },
  setAssistantState: (state) => set({ assistantState: state }),
  setProcessingStep: (step) => set({ processingStep: step }),
  setInputText: (text) => set({ inputText: text }),

  captureMoment: () => {
    const { sessionStatus, selectedSource } = get();
    if (sessionStatus !== 'active') return;
    const captureQuestion = 'Explain this';
    pushMessage('user', captureQuestion);
    set({ assistantState: 'capturing', processingStep: 'CAPTURING' });

    if (!selectedSource) {
      set({ lastCaptureUpload: 'error', lastCaptureReason: 'No source selected for capture.' });
      pushMessage('assistant', 'No source selected for capture.');
      logToTerminal('error', 'Capture failed: no source selected');
      return;
    }
    void uploadQuestionWithContext(captureQuestion, true);
  },

  sendQuestion: (question) => {
    const { sessionStatus } = get();
    if (sessionStatus !== 'active') return;
    const trimmed = question.trim();
    if (!trimmed) return;
    pushMessage('user', trimmed);
    set({
      assistantState: 'processing',
      processingStep: 'PROCESSING',
      inputText: '',
      lastCaptureUpload: 'uploading',
      lastCaptureReason: null,
    });
    void uploadQuestionWithContext(trimmed);
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
  setSessionContext: ({ institutionId, institutionName, courseId, courseName }) => set({
    activeInstitutionId: institutionId,
    activeInstitutionName: institutionName,
    activeCourse: courseId,
    activeCourseName: courseName,
  }),
}));

function pushMessage(role: 'user' | 'assistant', text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const id = crypto.randomUUID();
  useSessionStore.setState((s) => ({
    messages: [...s.messages, { id, role, text: trimmed, createdAt: Date.now() }],
  }));
  return id;
}

function startAssistantMessage() {
  const id = crypto.randomUUID();
  useSessionStore.setState((s) => ({
    messages: [...s.messages, { id, role: 'assistant', text: '', createdAt: Date.now() }],
  }));
  return id;
}

function appendToMessage(id: string, text: string) {
  if (!text) return;
  useSessionStore.setState((s) => ({
    messages: s.messages.map((message) =>
      message.id === id ? { ...message, text: `${message.text}${text}` } : message
    ),
  }));
}

function replaceMessage(id: string, text: string) {
  useSessionStore.setState((s) => ({
    messages: s.messages.map((message) =>
      message.id === id ? { ...message, text } : message
    ),
  }));
}

function createSmoothMessageAppender(messageId: string) {
  let queuedText = '';
  let intervalId: number | null = null;
  let hasStartedOutput = false;
  const charactersPerTick = 1;
  const tickMs = 18;

  const stop = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };

  const tick = () => {
    if (!queuedText) {
      stop();
      return;
    }
    const next = queuedText.slice(0, charactersPerTick);
    queuedText = queuedText.slice(charactersPerTick);
    appendToMessage(messageId, next);
  };

  return {
    add(text: string) {
      if (!text) return;
      queuedText += text;
      if (!hasStartedOutput) {
        hasStartedOutput = true;
        useSessionStore.setState({ assistantState: 'result', processingStep: 'DONE' });
      }
      if (intervalId === null) {
        intervalId = window.setInterval(tick, tickMs);
      }
    },
    flush() {
      stop();
      if (queuedText) {
        appendToMessage(messageId, queuedText);
        queuedText = '';
      }
    },
    stop,
  };
}

async function uploadFromContext(
  audioClip: Blob | null,
  frameImage: Blob,
  userText: string,
  captureTriggered: boolean
) {
  const { selectedSource, settings, backendSessionId } = useSessionStore.getState();
  if (!selectedSource) return;
  if (!backendSessionId) {
    throw new Error('Missing backend session id');
  }

  useSessionStore.setState({ lastCaptureUpload: 'uploading', lastCaptureReason: null });
  logToTerminal('info', 'Uploading capture audio', {
    bytes: audioClip?.size ?? 0,
    frameBytes: frameImage.size,
    sourceId: selectedSource.id,
    captureDuration: settings.captureDuration,
  });

  let assistantMessageId: string | null = null;
  let smoothAppender: ReturnType<typeof createSmoothMessageAppender> | null = null;
  try {
    assistantMessageId = startAssistantMessage();
    const activeAssistantMessageId = assistantMessageId;
    smoothAppender = createSmoothMessageAppender(activeAssistantMessageId);
    let streamedText = '';
    const response = await uploadCaptureStream(
      {
        audioClip,
        frameImage,
        sourceId: selectedSource.id,
        sourceType: selectedSource.type,
        captureDurationSeconds: settings.captureDuration,
        courseName: useSessionStore.getState().activeCourseName ?? '',
        capturedAt: new Date().toISOString(),
        userText,
        captureTriggered,
        sessionId: backendSessionId,
      },
      {
        onAnswerDelta: (text) => {
          streamedText += text;
          smoothAppender.add(text);
        },
        onFinal: (finalResponse) => {
          smoothAppender.flush();
          if (!streamedText.trim()) {
            replaceMessage(activeAssistantMessageId, finalResponse.answer ?? '');
          }
        },
      }
    );
    smoothAppender.flush();
    useSessionStore.setState({
      lastCaptureUpload: 'success',
      lastCaptureReason: null,
      lastAssistantAnswer: response.answer ?? '',
      assistantState: 'result',
      processingStep: 'DONE',
    });
    logToTerminal('info', 'Capture upload success');
  } catch (error) {
    let message = 'Capture upload failed.';
    if (error instanceof ApiClientError) {
      if (error.status === 404) {
        message = `Backend route not found: ${error.method ?? 'POST'} ${error.url ?? `${getApiBaseUrl()}${ASSIST_STREAM_PATH}`}`;
      } else if (error.code === 'ECONNABORTED') {
        message = `Backend request timed out after 60s: ${error.url ?? `${getApiBaseUrl()}${ASSIST_STREAM_PATH}`}`;
      } else if (error.status === null) {
        message = `Cannot reach backend: ${getApiBaseUrl()}`;
      } else {
        message = `${error.message}${error.url ? ` (${error.url})` : ''}`;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }
    smoothAppender?.stop();
    useSessionStore.setState({
      lastCaptureUpload: 'error',
      lastCaptureReason: message,
      assistantState: 'result',
      processingStep: 'DONE',
      lastAssistantAnswer: message,
    });
    if (assistantMessageId) {
      replaceMessage(assistantMessageId, message);
    } else {
      pushMessage('assistant', message);
    }
    logToTerminal('error', message, error);
  }
}

async function uploadQuestionWithContext(userText: string, captureTriggered = false) {
  const { selectedSource, settings } = useSessionStore.getState();
  if (!selectedSource) {
    const message = 'No source selected. Start sharing first.';
    useSessionStore.setState({
      lastCaptureUpload: 'error',
      lastCaptureReason: message,
      assistantState: 'result',
      processingStep: 'DONE',
      lastAssistantAnswer: message,
    });
    pushMessage('assistant', message);
    logToTerminal('error', message);
    return;
  }

  const audioClip = await waitForAudioClip(settings.captureDuration, selectedSource.id);
  const frameImage = await waitForFrame(selectedSource.id);
  if (!audioClip || !frameImage) {
    const message = 'Context not ready yet. Please wait 1-2 seconds and try again.';
    useSessionStore.setState({
      lastCaptureUpload: 'error',
      lastCaptureReason: message,
      assistantState: 'result',
      processingStep: 'DONE',
      lastAssistantAnswer: message,
    });
    pushMessage('assistant', message);
    logToTerminal('warn', 'Question blocked: missing required context payload', {
      hasAudio: !!audioClip,
      hasFrame: !!frameImage,
      sourceId: selectedSource.id,
    });
    return;
  }

  logToTerminal('info', 'Uploading question with context', {
    bytes: audioClip.size,
    frameBytes: frameImage.size,
    sourceId: selectedSource.id,
    captureDuration: settings.captureDuration,
  });

  useSessionStore.setState({ processingStep: 'PROCESSING' });
  await uploadFromContext(audioClip, frameImage, userText, captureTriggered);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAudioClip(seconds: number, sourceId: string): Promise<Blob | null> {
  for (let i = 0; i < CONTEXT_RETRY_COUNT; i += 1) {
    if (USE_NATIVE_AUDIO && window.taAPI?.nativeAudioGetSlice) {
      try {
        const debug = (await window.taAPI.nativeAudioDebug(seconds)) as {
          recentChunks?: number;
          recentBytes?: number;
          avgWindowDbfs?: number | null;
          lastChunkDbfs?: number | null;
        };
        logToTerminal('info', 'Native audio debug snapshot', debug);
        const hasNativeData = (debug.recentChunks ?? 0) > 0 && (debug.recentBytes ?? 0) > 44;
        const nativeLooksAudible = (debug.avgWindowDbfs ?? -120) > -95 || (debug.lastChunkDbfs ?? -120) > -95;
        if (hasNativeData && nativeLooksAudible) {
          const wavBytes = await window.taAPI.nativeAudioGetSlice(seconds);
          if (wavBytes && wavBytes.length > 44) {
            return new Blob([wavBytes], { type: 'audio/wav' });
          }
        }
      } catch {
        // continue retries
      }
    }
    const fallback = audioRingBuffer.getLastSeconds(seconds);
    if (fallback) return fallback;
    await delay(CONTEXT_RETRY_DELAY_MS);
  }

  // Native is running but produced no chunks: switch to renderer audio buffer and retry once.
  if (!audioRingBuffer.isRunning()) {
    try {
      await audioRingBuffer.startDesktopAudio(sourceId);
      logToTerminal('warn', 'Native audio produced no chunks; switched to renderer audio fallback.');
      await delay(CONTEXT_RETRY_DELAY_MS);
      const fallback = audioRingBuffer.getLastSeconds(seconds);
      if (fallback) return fallback;
    } catch (error) {
      logToTerminal('error', 'Renderer audio fallback start failed', error);
    }
  }

  return null;
}

async function waitForFrame(sourceId: string): Promise<Blob | null> {
  for (let i = 0; i < CONTEXT_RETRY_COUNT; i += 1) {
    const frame = await captureSourceFrame(sourceId).catch(() => null);
    if (frame && frame.size > 0) return frame;
    await delay(CONTEXT_RETRY_DELAY_MS);
  }
  return null;
}
