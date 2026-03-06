"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRoles, updateRole } from "./actions";
import { PERMISSIONS, type Permission } from "@/lib/admin/permissions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface Role {
  id: number;
  name: string;
  slug: string;
  permissions: string[];
  description: string | null;
}

const permissionGroups = [
  { label: "Users", keys: ["users.view", "users.edit", "users.ban"] },
  {
    label: "Courses",
    keys: ["courses.view", "courses.create", "courses.edit", "courses.delete"],
  },
  { label: "Faculties", keys: ["faculties.view", "faculties.manage"] },
  {
    label: "Contributions",
    keys: ["contributions.view", "contributions.moderate"],
  },
  {
    label: "Presentations",
    keys: ["presentations.view", "presentations.manage"],
  },
  { label: "Calendar", keys: ["calendar.view"] },
  { label: "Analytics", keys: ["analytics.view"] },
  { label: "Team", keys: ["team.view", "team.manage"] },
  { label: "Audit", keys: ["audit.view"] },
  { label: "Settings", keys: ["settings.view", "settings.manage"] },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getRoles();
      setRoles(data);
      if (data.length > 0) {
        setSelectedRole(data[0]);
        setEditedPermissions(data[0].permissions);
      }
    });
  }, []);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setEditedPermissions(role.permissions);
  };

  const togglePermission = (perm: string) => {
    setEditedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSave = () => {
    if (!selectedRole) return;
    startTransition(async () => {
      await updateRole(selectedRole.id, editedPermissions);
      const data = await getRoles();
      setRoles(data);
      const updated = data.find((r) => r.id === selectedRole.id);
      if (updated) {
        setSelectedRole(updated);
        setEditedPermissions(updated.permissions);
      }
    });
  };

  const hasChanges =
    selectedRole &&
    JSON.stringify([...editedPermissions].sort()) !==
      JSON.stringify([...selectedRole.permissions].sort());

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="font-display text-2xl font-light text-gray-900 dark:text-white"
      >
        Roles & Permissions
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
        className="flex flex-col gap-6 lg:flex-row"
      >
        {/* Role list */}
        <div className="w-full space-y-2 lg:w-64">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleRoleSelect(role)}
              className={`w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                selectedRole?.id === role.id
                  ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white"
                  : "text-gray-900/60 hover:bg-gray-900/5 dark:text-white/60 dark:hover:bg-white/5"
              }`}
            >
              <div className="font-medium">{role.name}</div>
              {role.description && (
                <div className="mt-0.5 text-xs opacity-60">
                  {role.description}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Permission editor */}
        {selectedRole && (
          <div className="flex-1 rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {selectedRole.name}
                </h3>
                <Badge
                  variant="outline"
                  className="border-gray-900/10 dark:border-white/15"
                >
                  {selectedRole.slug}
                </Badge>
              </div>
              {hasChanges && (
                <Button
                  onClick={handleSave}
                  disabled={isPending}
                  size="sm"
                  className="rounded-full"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {permissionGroups.map((group) => (
                <div key={group.label}>
                  <h4 className="mb-2 text-sm font-medium text-gray-900/70 dark:text-white/70">
                    {group.label}
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {group.keys.map((perm) => (
                      <label
                        key={perm}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-900/5 dark:hover:bg-white/5"
                      >
                        <Checkbox
                          checked={editedPermissions.includes(perm)}
                          onCheckedChange={() => togglePermission(perm)}
                        />
                        <span className="text-gray-900/80 dark:text-white/80">
                          {PERMISSIONS[perm as Permission]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
