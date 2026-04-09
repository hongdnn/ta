import { postFormData } from './apiClient';

export const ASSIST_PATH = '/api/assist';

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

export async function uploadCapture(payload: CaptureUploadPayload) {
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

  return postFormData(ASSIST_PATH, formData) as Promise<CaptureApiResponse>;
}
