/** Typed API client for CampusFlow. Cookie-session auth. */

export interface User {
  id: number;
  email: string;
  display_name: string;
  role: string;
}

export interface Overview {
  role: string;
  students: number;
  courses: number;
  sections: number;
  enrollments: number;
  grades: number;
  attendance: number;
  demo_data: boolean;
}

export interface Student {
  id: number;
  uid: string;
  first_name: string;
  last_name: string;
  enrollment_no: string;
  email: string;
  date_of_birth: string;
  status: string;
  enrolled_sections: number[];
}

export interface Course {
  id: number;
  code: string;
  title: string;
  credit_hours: number;
  description: string;
}

export interface Section {
  id: number;
  course_id: number;
  course_code: string;
  course_title: string;
  teacher_id: number;
  teacher_name: string;
  term: string;
  capacity: number;
  enrolled: number;
}

export interface Enrollment {
  id: number;
  student_id: number;
  student_name: string;
  student_uid: string;
  section_id: number;
  section_label: string;
  teacher_id: number;
  status: string;
}

export interface Grade {
  id: number;
  assessment: string;
  score: number;
  status: string;
}

export interface AttendanceRow {
  id: number;
  date: string;
  status: string;
  note: string;
}

export interface Transcript {
  student_uid: string;
  student_name: string;
  enrollment_no: string;
  gpa: number | null;
  total_credits: number;
  computed_at: string;
  lines: {
    course_code: string;
    title: string;
    term: string;
    credit_hours: number;
    average: number | null;
    letter: string | null;
    grade_points: number | null;
  }[];
}

export interface AuditRow {
  id: number;
  actor_id: number | null;
  action: string;
  target: string;
  detail: string;
  created_at: string | null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', ...init });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

function json(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const api = {
  me: () => request<User>('/api/auth/me'),
  login: (email: string, password: string) => request<User>('/api/auth/login', json({ email, password })),
  register: (email: string, password: string, display_name: string, role: string) =>
    request<User>('/api/auth/register', json({ email, password, display_name, role })),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  overview: () => request<Overview>('/api/overview'),

  students: () => request<Student[]>('/api/students'),
  createStudent: (body: Record<string, string>) => request<Student>('/api/students', json(body)),
  updateStudent: (id: number, body: Record<string, string>) =>
    request<Student>(`/api/students/${id}`, { method: 'PATCH', ...json(body) }),
  deleteStudent: (id: number) => request<{ ok: boolean }>(`/api/students/${id}`, { method: 'DELETE' }),

  courses: () => request<Course[]>('/api/courses'),
  createCourse: (body: { code: string; title: string; credit_hours: number; description: string }) =>
    request<Course>('/api/courses', json(body)),
  sections: () => request<Section[]>('/api/sections'),
  createSection: (body: { course_id: number; teacher_id: number; term: string; capacity: number }) =>
    request<{ id: number }>('/api/sections', json(body)),

  enrollments: (sectionId?: number) =>
    request<Enrollment[]>(sectionId ? `/api/enrollments?section_id=${sectionId}` : '/api/enrollments'),
  enroll: (student_id: number, section_id: number) =>
    request<{ id: number }>('/api/enrollments', json({ student_id, section_id })),
  dropEnrollment: (id: number) => request<{ id: number }>(`/api/enrollments/${id}/drop`, { method: 'POST' }),

  grades: (enrollmentId: number) => request<Grade[]>(`/api/enrollments/${enrollmentId}/grades`),
  addGrade: (enrollmentId: number, assessment: string, score: number, status: string) =>
    request<{ id: number }>(`/api/enrollments/${enrollmentId}/grades`, json({ assessment, score, status })),
  attendance: (enrollmentId: number) => request<AttendanceRow[]>(`/api/enrollments/${enrollmentId}/attendance`),
  recordAttendance: (enrollmentId: number, date: string, status: string, note: string) =>
    request<{ id: number }>(`/api/enrollments/${enrollmentId}/attendance`, json({ date, status, note })),

  transcript: (studentId: number) => request<Transcript>(`/api/students/${studentId}/transcript`),
  audit: () => request<AuditRow[]>('/api/audit'),
};
