/**
 * Shared constants for the notification system.
 * Safe to import from both client and server code.
 */

export const TEMPLATE_VARIABLES = [
  { key: "{{name}}", desc: "User's display name" },
  { key: "{{email}}", desc: "User's email address" },
  { key: "{{days}}", desc: "Days since signup" },
  { key: "{{university}}", desc: "User's university" },
  { key: "{{faculty}}", desc: "Faculty name" },
  { key: "{{program}}", desc: "Program name" },
  { key: "{{events_today}}", desc: "Calendar events today" },
  { key: "{{events_week}}", desc: "Calendar events this week" },
  { key: "{{birthday}}", desc: "User's birthday" },
  { key: "{{exam_title}}", desc: "Exam title (exam_done trigger)" },
  { key: "{{exam_time}}", desc: "Exam time (exam_done trigger)" },
];

export const TRIGGER_TYPES = [
  { value: "welcome", label: "Welcome Series", desc: "X days after signup", needsDays: true },
  { value: "birthday", label: "Birthday", desc: "On user's birthday each year", needsDays: false },
  { value: "inactivity", label: "Inactivity", desc: "After X days of no activity", needsDays: true },
  { value: "milestone", label: "Milestone", desc: "When user reaches X days on platform", needsDays: true },
  { value: "anniversary", label: "Anniversary", desc: "Signup anniversary each year", needsDays: false },
  { value: "exam_done", label: "Post-Exam", desc: "After user's exam event ends", needsDays: false },
];
