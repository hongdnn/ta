import { apiClient } from './client';

export type CourseItem = {
  id: string;
  institution_id: string;
  institution_timezone?: string | null;
  code: string;
  title: string;
};

type CourseListResponse = {
  items: CourseItem[];
};

export async function fetchMyCourses(): Promise<CourseItem[]> {
  const response = await apiClient.get<CourseListResponse>('/api/catalog/me/courses');
  return response.data.items ?? [];
}
