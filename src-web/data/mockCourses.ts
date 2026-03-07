export interface Course {
  id: string;
  code: string;
  name: string;
  semester: string;
  students: number;
}

export const mockCourses: Course[] = [
  { id: "cs201", code: "CS 201", name: "Data Structures & Algorithms", semester: "Spring 2025", students: 47 },
  { id: "cs301", code: "CS 301", name: "Operating Systems", semester: "Spring 2025", students: 35 },
  { id: "cs401", code: "CS 401", name: "Machine Learning", semester: "Spring 2025", students: 28 },
];
