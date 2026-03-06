"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { UserPlus, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  getAdminTeam,
  inviteAdmin,
  removeAdmin,
  changeAdminRole,
} from "./actions";
import { getRoles } from "./roles/actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface TeamMember {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  roleName: string;
  roleSlug: string;
  roleId: number;
  createdAt: string;
}

interface Role {
  id: number;
  name: string;
  slug: string;
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    startTransition(async () => {
      const [teamData, rolesData] = await Promise.all([
        getAdminTeam(),
        getRoles(),
      ]);
      setTeam(teamData);
      setRoles(rolesData);
    });
  };

  const handleInvite = () => {
    if (!inviteEmail || !inviteRoleId) return;
    startTransition(async () => {
      await inviteAdmin(inviteEmail, Number(inviteRoleId));
      setInviteEmail("");
      setInviteRoleId("");
      setDialogOpen(false);
      loadData();
    });
  };

  const handleRemove = (userId: string) => {
    startTransition(async () => {
      const result = await removeAdmin(userId);
      if (result.error) {
        alert(result.error);
        return;
      }
      loadData();
    });
  };

  const handleRoleChange = (userId: string, roleId: string) => {
    startTransition(async () => {
      await changeAdminRole(userId, Number(roleId));
      loadData();
    });
  };

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="flex items-center justify-between"
      >
        <h2 className="font-display text-2xl font-light text-gray-900 dark:text-white">
          Team
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 rounded-full border-gray-900/15 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
            >
              <UserPlus size={16} weight="duotone" />
              Invite Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border-gray-900/15 bg-white/90 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/90">
            <DialogHeader>
              <DialogTitle className="font-display font-light">
                Invite Admin
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleInvite}
                disabled={isPending || !inviteEmail || !inviteRoleId}
                className="w-full rounded-full"
              >
                {isPending ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
        className="space-y-3"
      >
        {team.map((member) => (
          <div
            key={member.userId}
            className="flex items-center justify-between rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-gray-900/10 dark:border-white/15">
                {member.image && (
                  <AvatarImage src={member.image} alt={member.name} />
                )}
                <AvatarFallback className="bg-gray-900/5 text-sm dark:bg-white/10">
                  {member.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {member.name}
                </p>
                <p className="text-xs text-gray-900/50 dark:text-white/50">
                  {member.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select
                value={String(member.roleId)}
                onValueChange={(v) => handleRoleChange(member.userId, v)}
              >
                <SelectTrigger className="h-8 w-[140px] rounded-full border-gray-900/10 bg-transparent text-xs dark:border-white/15">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => handleRemove(member.userId)}
                className="rounded-lg p-2 text-gray-900/40 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
              >
                <Trash size={16} weight="duotone" />
              </button>
            </div>
          </div>
        ))}

        {team.length === 0 && !isPending && (
          <p className="py-8 text-center text-sm text-gray-900/50 dark:text-white/50">
            No team members yet.
          </p>
        )}
      </motion.div>
    </div>
  );
}
