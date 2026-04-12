import { apiClient } from './client';

export type CourseMaterial = {
  id: string;
  course_id: string;
  user_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
};

type CourseMaterialListResponse = {
  items: CourseMaterial[];
};

type CourseMaterialViewUrlResponse = {
  url: string;
};

export async function fetchCourseMaterials(courseId: string): Promise<CourseMaterial[]> {
  const response = await apiClient.get<CourseMaterialListResponse>('/api/course-materials', {
    params: { course_id: courseId },
  });
  return response.data.items ?? [];
}

export async function uploadCourseMaterial(courseId: string, file: File): Promise<CourseMaterial> {
  const form = new FormData();
  form.append('course_id', courseId);
  form.append('file', file);
  const response = await apiClient.post<CourseMaterial>('/api/course-materials', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function fetchCourseMaterialViewUrl(materialId: string): Promise<string> {
  const response = await apiClient.get<CourseMaterialViewUrlResponse>(`/api/course-materials/${materialId}/view-url`);
  return response.data.url;
}
