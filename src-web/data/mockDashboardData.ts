export const topQuestions = [
  { rank: 1, question: "How do we derive recurrence relations?", count: 47 },
  { rank: 2, question: "What is the base case in recursion?", count: 38 },
  { rank: 3, question: "How do we define dynamic programming state?", count: 31 },
  { rank: 4, question: "Why does memoization reduce time complexity?", count: 26 },
  { rank: 5, question: "How to convert recursive to iterative?", count: 19 },
];

export const pastQuestions = [
  { rank: 1, question: "How does merge sort achieve O(n log n)?", count: 62, week: "Feb 24 – Mar 2" },
  { rank: 2, question: "What is the difference between BFS and DFS?", count: 55, week: "Feb 24 – Mar 2" },
  { rank: 3, question: "How to identify overlapping subproblems?", count: 44, week: "Feb 17 – Feb 23" },
  { rank: 4, question: "Why is quicksort O(n²) in the worst case?", count: 39, week: "Feb 17 – Feb 23" },
  { rank: 5, question: "How do hash tables handle collisions?", count: 35, week: "Feb 10 – Feb 16" },
  { rank: 6, question: "When should we use a stack vs a queue?", count: 28, week: "Feb 10 – Feb 16" },
  { rank: 7, question: "How to trace through a linked list reversal?", count: 22, week: "Feb 3 – Feb 9" },
];

export const sessionEngagement = [
  { session: "Lecture 1", label: "Introduction", questions: 12 },
  { session: "Lecture 2", label: "Recursion", questions: 34 },
  { session: "Lecture 3", label: "Dynamic Programming", questions: 51 },
  { session: "Lecture 4", label: "Greedy Algorithms", questions: 27 },
  { session: "Lecture 5", label: "Graph Basics", questions: 18 },
];

export interface AssignmentProblem {
  id: string;
  title: string;
  questionsAsked: number;
}

export interface Assignment {
  id: string;
  name: string;
  totalQuestions: number;
  problems: AssignmentProblem[];
  themes: string[];
}

export const assignments: Assignment[] = [
  {
    id: "hw1",
    name: "Homework 1",
    totalQuestions: 18,
    problems: [
      { id: "hw1-p1", title: "Array reversal", questionsAsked: 6 },
      { id: "hw1-p2", title: "Two-pointer search", questionsAsked: 7 },
      { id: "hw1-p3", title: "Sliding window max", questionsAsked: 5 },
    ],
    themes: ["Understanding loop invariants", "Edge cases with empty arrays"],
  },
  {
    id: "hw2",
    name: "Homework 2",
    totalQuestions: 72,
    problems: [
      { id: "hw2-p1", title: "Fibonacci recursion", questionsAsked: 8 },
      { id: "hw2-p2", title: "Binary tree traversal", questionsAsked: 11 },
      { id: "hw2-p3", title: "Tower of Hanoi", questionsAsked: 53 },
    ],
    themes: [
      "Understanding the base case",
      "Writing the recursive function",
      "Visualizing the recursion tree",
    ],
  },
  {
    id: "hw3",
    name: "Homework 3",
    totalQuestions: 41,
    problems: [
      { id: "hw3-p1", title: "Knapsack problem", questionsAsked: 18 },
      { id: "hw3-p2", title: "Longest common subsequence", questionsAsked: 14 },
      { id: "hw3-p3", title: "Coin change", questionsAsked: 9 },
    ],
    themes: [
      "Defining the DP state",
      "Understanding overlapping subproblems",
      "Tabulation vs memoization",
    ],
  },
];

export const improvementSuggestions = [
  {
    id: "s1",
    title: "Add more recursion tree visuals",
    description:
      "53 students struggled with Tower of Hanoi. Consider adding step-by-step recursion tree diagrams to the lecture slides.",
    priority: "high" as const,
    source: "Homework 2 – Problem 3",
  },
  {
    id: "s2",
    title: "Clarify base case definition earlier",
    description:
      "38 questions about base cases this week. Introduce base case identification as a dedicated 5-minute exercise before diving into recursive problems.",
    priority: "high" as const,
    source: "Lecture 2 – Recursion",
  },
  {
    id: "s3",
    title: "Provide memoization comparison examples",
    description:
      "Students frequently asked why memoization helps. Show a side-by-side runtime comparison of naive recursion vs memoized solution.",
    priority: "medium" as const,
    source: "Lecture 3 – Dynamic Programming",
  },
  {
    id: "s4",
    title: "Create a recursion-to-iteration cheat sheet",
    description:
      "19 students asked about converting recursive solutions to iterative ones. A one-page reference guide would reduce confusion.",
    priority: "medium" as const,
    source: "General – Multiple sessions",
  },
  {
    id: "s5",
    title: "Add warm-up problems for graph basics",
    description:
      "Lecture 5 had relatively low engagement. Add a short warm-up exercise to get students thinking about graph representations.",
    priority: "low" as const,
    source: "Lecture 5 – Graph Basics",
  },
];
