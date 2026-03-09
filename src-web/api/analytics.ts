import { apiClient } from './client';

export type TopQuestionItem = {
  cluster_id: string;
  question: string;
  asks_this_week: number;
};

export type PastQuestionItem = {
  cluster_id: string;
  question: string;
  asks_before_week: number;
  asks_this_week: number;
  asks_total_until_now: number;
};

export type CourseQuestionsAnalyticsResponse = {
  course_id: string;
  timezone: string;
  range_start_utc: string;
  range_end_utc: string;
  top_questions_this_week: TopQuestionItem[];
  past_questions: PastQuestionItem[];
};

export async function fetchCourseQuestionsAnalytics(
  courseId: string,
  rangeStartUtc: string,
  rangeEndUtc: string,
  timezone: string,
) {
  const response = await apiClient.get<CourseQuestionsAnalyticsResponse>('/api/analytics/course-questions', {
    params: {
      course_id: courseId,
      range_start_utc: rangeStartUtc,
      range_end_utc: rangeEndUtc,
      timezone,
    },
  });
  return response.data;
}
