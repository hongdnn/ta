import { apiClient } from './apiClient';

export type InstitutionItem = {
  id: string;
  name: string;
  type: string;
};

export type CourseItem = {
  id: string;
  institution_id: string;
  code: string;
  title: string;
};

type InstitutionListResponse = {
  items: InstitutionItem[];
};

type CourseListResponse = {
  items: CourseItem[];
};

export async function fetchInstitutions() {
  const response = await apiClient.get<InstitutionListResponse>('/api/catalog/institutions');
  return response.data.items ?? [];
}

export async function fetchCoursesByInstitution(institutionId: string) {
  const response = await apiClient.get<CourseListResponse>('/api/catalog/courses', {
    params: { institution_id: institutionId },
  });
  return response.data.items ?? [];
}
