"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  Lightning,
  Prohibit,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/DataTable";
import { StatsCard } from "@/components/admin/StatsCard";
import { listUsers } from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  university: string;
  gender: string;
}

interface UsersClientProps {
  stats: {
    totalUsers: number;
    activeToday: number;
    bannedUsers: number;
    verifiedContributors: number;
  };
}

const columns = [
  {
    key: "name",
    header: "Name",
    render: (item: User) => (
      <span className="font-medium">{item.name}</span>
    ),
  },
  {
    key: "email",
    header: "Email",
    render: (item: User) => (
      <span className="text-gray-900/70 dark:text-white/70">{item.email}</span>
    ),
  },
  {
    key: "university",
    header: "University",
    render: (item: User) => (
      <span className="text-gray-900/70 dark:text-white/70">
        {item.university || "\u2014"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (item: User) =>
      item.banned ? (
        <Badge variant="destructive" className="text-xs">
          Banned
        </Badge>
      ) : (
        <span className="text-xs text-green-600 dark:text-green-400">
          Active
        </span>
      ),
  },
  {
    key: "createdAt",
    header: "Joined",
    render: (item: User) => (
      <span className="text-gray-900/50 dark:text-white/50 text-sm">
        {new Date(item.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
    ),
  },
];

export function UsersClient({ stats }: UsersClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isPending, startTransition] = useTransition();

  const loadUsers = useCallback(
    (searchQuery: string, currentPage: number) => {
      startTransition(async () => {
        const result = await listUsers({
          search: searchQuery || undefined,
          page: currentPage,
          limit: 20,
        });
        setUsers(result.users as User[]);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      });
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadUsers(debouncedSearch, page);
  }, [loadUsers, debouncedSearch, page]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRowClick = (item: User) => {
    router.push(`/admin/users/${item.id}`);
  };

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users size={24} weight="duotone" />}
          index={0}
        />
        <StatsCard
          title="Active Today"
          value={stats.activeToday}
          icon={<Lightning size={24} weight="duotone" />}
          index={1}
        />
        <StatsCard
          title="Banned Users"
          value={stats.bannedUsers}
          icon={<Prohibit size={24} weight="duotone" />}
          index={2}
        />
        <StatsCard
          title="Verified Contributors"
          value={stats.verifiedContributors}
          icon={<ShieldCheck size={24} weight="duotone" />}
          index={3}
        />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
            Users
          </h2>
          <p className="mt-1 text-sm text-gray-900/50 dark:text-white/50">
            {total} {total === 1 ? "user" : "users"} total
          </p>
        </div>
      </motion.div>

      <DataTable<User>
        columns={columns}
        data={users}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchValue={search}
        onSearch={handleSearch}
        searchPlaceholder="Search by name or email..."
        onRowClick={handleRowClick}
        loading={isPending}
        emptyMessage="No users found."
      />
    </div>
  );
}
