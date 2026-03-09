import { apiClient } from './apiClient';

type CreateSessionResponse = {
  session_id: string;
  course_id: string;
  session_status: string;
};

type EndSessionResponse = {
  session_id: string;
  course_id: string;
  session_status: string;
  ended_at?: string | null;
};

export async function createSession(courseId: string) {
  const response = await apiClient.post<CreateSessionResponse>('/api/sessions', {
    course_id: courseId,
  });
  return response.data;
}

export async function endSession(sessionId: string) {
  const response = await apiClient.post<EndSessionResponse>(`/api/sessions/${sessionId}/end`);
  return response.data;
}
