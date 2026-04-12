import { getAccessToken, getApiBaseUrl, postFormData } from './apiClient';

export const ASSIST_PATH = '/api/assist';
export const ASSIST_STREAM_PATH = '/api/assist/stream';

export type CaptureApiResponse = {
  ok: boolean;
  answer: string;
  intent?: string;
  route?: string;
  transcript?: string;
  frame_analysis?: string;
};

export type CaptureUploadPayload = {
  audioClip?: Blob | null;
  frameImage?: Blob | null;
  sourceId: string;
  sourceType: 'screen' | 'window' | 'tab';
  captureDurationSeconds: number;
  courseName: string;
  capturedAt: string;
  userText?: string;
  captureTriggered?: boolean;
  sessionId?: string;
};

function buildCaptureFormData(payload: CaptureUploadPayload) {
  const formData = new FormData();
  if (payload.audioClip) {
    formData.append('audio', payload.audioClip, 'capture-audio.wav');
  }
  if (payload.frameImage) {
    formData.append('frame', payload.frameImage, 'capture-frame.png');
  }
  formData.append('sourceId', payload.sourceId);
  formData.append('sourceType', payload.sourceType);
  formData.append('captureDurationSeconds', String(payload.captureDurationSeconds));
  formData.append('courseName', payload.courseName);
  formData.append('capturedAt', payload.capturedAt);
  if (typeof payload.userText === 'string') {
    formData.append('userText', payload.userText);
  }
  formData.append('captureTriggered', payload.captureTriggered === false ? 'false' : 'true');
  formData.append('sessionId', payload.sessionId ?? 'default');
  return formData;
}

export async function uploadCapture(payload: CaptureUploadPayload) {
  const formData = buildCaptureFormData(payload);
  return postFormData(ASSIST_PATH, formData) as Promise<CaptureApiResponse>;
}

export async function uploadCaptureStream(
  payload: CaptureUploadPayload,
  handlers: {
    onAnswerDelta?: (text: string) => void;
    onFinal?: (response: CaptureApiResponse) => void;
  }
): Promise<CaptureApiResponse> {
  const formData = buildCaptureFormData(payload);
  const token = getAccessToken();
  const response = await fetch(`${getApiBaseUrl()}${ASSIST_STREAM_PATH}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming assist failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = 'message';
  let finalResponse: CaptureApiResponse | null = null;

  const processBlock = (block: string) => {
    const lines = block.split(/\r?\n/);
    const dataLines: string[] = [];
    currentEvent = 'message';
    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trimStart());
      }
    }
    if (dataLines.length === 0) return;
    const rawData = dataLines.join('\n');
    let data: unknown;
    try {
      data = JSON.parse(rawData);
    } catch {
      return;
    }
    if (currentEvent === 'answer_delta' && data && typeof data === 'object' && 'text' in data) {
      handlers.onAnswerDelta?.(String((data as { text?: unknown }).text ?? ''));
    }
    if (currentEvent === 'final') {
      finalResponse = data as CaptureApiResponse;
      handlers.onFinal?.(finalResponse);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separatorIndex = buffer.indexOf('\n\n');
    while (separatorIndex >= 0) {
      const block = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      processBlock(block);
      separatorIndex = buffer.indexOf('\n\n');
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) {
    processBlock(buffer);
  }

  if (!finalResponse) {
    throw new Error('Streaming assist finished without final response.');
  }
  return finalResponse;
}
