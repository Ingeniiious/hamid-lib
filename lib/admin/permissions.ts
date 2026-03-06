export const PERMISSIONS = {
  // Users
  "users.view": "View users",
  "users.edit": "Edit users",
  "users.ban": "Ban/unban users",
  // Courses
  "courses.view": "View courses",
  "courses.create": "Create courses",
  "courses.edit": "Edit courses",
  "courses.delete": "Delete courses",
  // Faculties
  "faculties.view": "View faculties",
  "faculties.manage": "Manage faculties & programs",
  // Contributions
  "contributions.view": "View contributions",
  "contributions.moderate": "Moderate contributions",
  // Presentations
  "presentations.view": "View presentations",
  "presentations.manage": "Manage presentations",
  // Calendar
  "calendar.view": "View all calendar events",
  // Analytics
  "analytics.view": "View analytics",
  // Team
  "team.view": "View admin team",
  "team.manage": "Manage admin team & roles",
  // Audit
  "audit.view": "View audit log",
  // Email
  "email.view": "View email inbox",
  "email.send": "Send emails",
  "email.delete": "Delete emails",
  // Settings
  "settings.view": "View settings",
  "settings.manage": "Manage settings",
} as const;

export type Permission = keyof typeof PERMISSIONS;

const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_PRESETS = {
  "super-admin": {
    name: "Super Admin",
    description: "Full access to everything",
    permissions: ALL_PERMISSIONS,
  },
  admin: {
    name: "Admin",
    description: "Full access except team management",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "team.manage"),
  },
  moderator: {
    name: "Moderator",
    description: "User management, contributions, presentations, calendar",
    permissions: [
      "users.view",
      "users.edit",
      "contributions.view",
      "contributions.moderate",
      "presentations.view",
      "presentations.manage",
      "calendar.view",
    ] as Permission[],
  },
  editor: {
    name: "Editor",
    description: "Course and faculty management, analytics",
    permissions: [
      "courses.view",
      "courses.create",
      "courses.edit",
      "courses.delete",
      "faculties.view",
      "faculties.manage",
      "analytics.view",
    ] as Permission[],
  },
  viewer: {
    name: "Viewer",
    description: "Read-only access to everything",
    permissions: ALL_PERMISSIONS.filter((p) => p.endsWith(".view")),
  },
} as const;
