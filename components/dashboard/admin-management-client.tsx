"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Users,
  ShieldCheck,
  PauseCircle,
  XCircle,
  MoreVertical,
  User,
  Mail,
  Phone,
  Lock,
  Edit2,
  Trash2,
  PlayCircle,
  Ban,
  Eye,
  X,
  Loader2,
  AlertTriangle,
  UserCheck2,
} from "lucide-react";
import {
  Modal,
  ModalPortal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from "../ui/modal-system";
import { StatusBadge } from "../ui/status-badge";
import {
  getAdmins,
  createAdminAction,
  editAdminAction,
  updateAdminStatusAction,
  deleteAdminAction,
  AdminUser,
} from "../../lib/actions/admin-management";

interface AdminManagementClientProps {
  initialAdmins: AdminUser[];
  callerId: string;
  callerRole: "SUPER_ADMIN" | "ADMIN";
}

// ─── KPI Card Component ──────────────────────────────────────────────────────
function KpiCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/40 p-5 glass-premium flex flex-col justify-between hover:scale-[1.015] hover:border-primary/25 transition-all duration-300 shadow-xl group"
    >
      <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20", color)} />
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 text-foreground/70 transition-colors group-hover:text-foreground bg-opacity-10", color)}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{value}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

export function AdminManagementClient({
  initialAdmins,
  callerId,
  callerRole,
}: AdminManagementClientProps) {
  const router = useRouter();
  const [admins, setAdmins] = React.useState<AdminUser[]>(initialAdmins);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [roleFilter, setRoleFilter] = React.useState("All");

  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  // Loading States
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);

  // Modals States
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
  const [isPauseConfirmOpen, setIsPauseConfirmOpen] = React.useState(false);
  const [isDisableConfirmOpen, setIsDisableConfirmOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);

  const [selectedAdmin, setSelectedAdmin] = React.useState<AdminUser | null>(null);

  // Form States
  const [formError, setFormError] = React.useState<string | null>(null);
  const [addForm, setAddForm] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "Admin" as "Admin" | "Manager",
  });
  const [editForm, setEditForm] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    role: "Admin" as "Admin" | "Manager" | "Super Admin",
  });

  React.useEffect(() => {
    setAdmins(initialAdmins);
  }, [initialAdmins]);

  // Click outside menu listener
  React.useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Compute KPI totals
  const totalAdmins = admins.length;
  const activeAdmins = admins.filter((a) => a.status === "Active").length;
  const pausedAdmins = admins.filter((a) => a.status === "Paused").length;
  const disabledAdmins = admins.filter((a) => a.status === "Disabled").length;

  // Filter logic
  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      admin.name.toLowerCase().includes(search.toLowerCase()) ||
      admin.email.toLowerCase().includes(search.toLowerCase()) ||
      admin.phone.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" ? true : admin.status === statusFilter;
    const matchesRole = roleFilter === "All" ? true : admin.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const isSuperAdmin = callerRole === "SUPER_ADMIN";

  // Form actions handler
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (addForm.password !== addForm.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setLoadingAction("creating");
    const res = await createAdminAction(addForm);
    setLoadingAction(null);

    if (res.error) {
      setFormError(res.error);
    } else {
      setIsAddModalOpen(false);
      setAddForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        role: "Admin",
      });
      router.refresh();
    }
  };

  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    setFormError(null);

    setLoadingAction("editing");
    const res = await editAdminAction(selectedAdmin.id, editForm);
    setLoadingAction(null);

    if (res.error) {
      setFormError(res.error);
    } else {
      setIsEditModalOpen(false);
      setSelectedAdmin(null);
      router.refresh();
    }
  };

  const handlePauseAdmin = async () => {
    if (!selectedAdmin) return;
    setLoadingAction("pausing");
    const res = await updateAdminStatusAction(selectedAdmin.id, "Paused");
    setLoadingAction(null);

    if (res.error) {
      alert(res.error);
    } else {
      setIsPauseConfirmOpen(false);
      setSelectedAdmin(null);
      router.refresh();
    }
  };

  const handleActivateAdmin = async (admin: AdminUser) => {
    setLoadingAction(`activating-${admin.id}`);
    const res = await updateAdminStatusAction(admin.id, "Active");
    setLoadingAction(null);

    if (res.error) {
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  const handleDisableAdmin = async () => {
    if (!selectedAdmin) return;
    setLoadingAction("disabling");
    const res = await updateAdminStatusAction(selectedAdmin.id, "Disabled");
    setLoadingAction(null);

    if (res.error) {
      alert(res.error);
    } else {
      setIsDisableConfirmOpen(false);
      setSelectedAdmin(null);
      router.refresh();
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;
    setLoadingAction("deleting");
    const res = await deleteAdminAction(selectedAdmin.id);
    setLoadingAction(null);

    if (res.error) {
      alert(res.error);
    } else {
      setIsDeleteConfirmOpen(false);
      setSelectedAdmin(null);
      router.refresh();
    }
  };

  const handleToggleSuperAdmin = async (admin: AdminUser, makeSuper: boolean) => {
    setLoadingAction(`role-${admin.id}`);
    const res = await editAdminAction(admin.id, {
      fullName: admin.name,
      email: admin.email,
      phone: admin.phone === "N/A" ? "" : admin.phone,
      role: makeSuper ? "Super Admin" : "Admin",
    });
    setLoadingAction(null);

    if (res.error) {
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Statistics Cards ──────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Admins"
          value={totalAdmins}
          icon={<Users className="h-4 w-4 text-violet-500" />}
          color="bg-violet-500"
          subtitle="System administrators"
        />
        <KpiCard
          title="Active"
          value={activeAdmins}
          icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />}
          color="bg-emerald-500"
          subtitle="Allowed to log in"
        />
        <KpiCard
          title="Paused"
          value={pausedAdmins}
          icon={<PauseCircle className="h-4 w-4 text-amber-500" />}
          color="bg-amber-500"
          subtitle="Temporarily locked out"
        />
        <KpiCard
          title="Disabled"
          value={disabledAdmins}
          icon={<XCircle className="h-4 w-4 text-rose-500" />}
          color="bg-rose-500"
          subtitle="Permanently blocked"
        />
      </div>

      {/* ── Search, Filters & Add Admin ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full bg-card/40 border border-border/30 rounded-3xl p-5 shadow-sm backdrop-blur-xl">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone..."
            className="w-full pl-9 pr-4 py-2.5 bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/40 focus:border-primary/50 rounded-xl text-sm outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 px-3 py-2.5 bg-muted/20 hover:bg-muted/30 border border-border/40 rounded-xl text-xs font-medium outline-none focus:border-primary/50 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:inline">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-40 px-3 py-2.5 bg-muted/20 hover:bg-muted/30 border border-border/40 rounded-xl text-xs font-medium outline-none focus:border-primary/50 cursor-pointer"
            >
              <option value="All">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          {/* Add Admin Button */}
          {isSuperAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Add Admin
            </button>
          )}
        </div>
      </div>

      {/* ── Admin Table ───────────────────────────────────────────────────── */}
      <div className="w-full overflow-hidden rounded-3xl border border-border/45 bg-card/30 backdrop-blur-xl shadow-xl">
        <div className="w-full overflow-x-auto select-none">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30 font-medium text-muted-foreground">
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">Avatar</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">Name</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">Email</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">Phone</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">Role</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">Created Date</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">Last Login</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-foreground/90">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-muted-foreground">
                    No administrators found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-muted/15 transition-colors">
                    {/* Avatar */}
                    <td className="px-5 py-3.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/50 border border-violet-200/50 dark:border-violet-800/40 text-violet-700 dark:text-violet-400 font-extrabold uppercase text-sm">
                        {admin.avatar ? (
                          <img src={admin.avatar} alt={admin.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          admin.name.slice(0, 2)
                        )}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-5 py-3.5 font-bold text-foreground">{admin.name}</td>

                    {/* Email */}
                    <td className="px-5 py-3.5 text-foreground/80">{admin.email}</td>

                    {/* Phone */}
                    <td className="px-5 py-3.5 text-foreground/80">{admin.phone}</td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
                        {admin.role}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5">
                      {isSuperAdmin ? (
                        <div className="flex items-center gap-1.5">
                          {/* Active Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (admin.status !== "Active") {
                                handleActivateAdmin(admin);
                              }
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
                              admin.status === "Active"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                                : "bg-muted/10 text-muted-foreground hover:text-emerald-500 border-border/40 hover:bg-emerald-500/5"
                            )}
                          >
                            Active
                          </button>

                          {/* Paused Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (admin.status !== "Paused") {
                                setSelectedAdmin(admin);
                                setIsPauseConfirmOpen(true);
                              }
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
                              admin.status === "Paused"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40"
                                : "bg-muted/10 text-muted-foreground hover:text-amber-500 border-border/40 hover:bg-amber-500/5"
                            )}
                          >
                            Paused
                          </button>

                          {/* Disabled Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (admin.status !== "Disabled") {
                                setSelectedAdmin(admin);
                                setIsDisableConfirmOpen(true);
                              }
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
                              admin.status === "Disabled"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40"
                                : "bg-muted/10 text-muted-foreground hover:text-rose-500 border-border/40 hover:bg-rose-500/5"
                            )}
                          >
                            Disable
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              admin.status === "Active" && "bg-emerald-500",
                              admin.status === "Paused" && "bg-amber-500",
                              admin.status === "Disabled" && "bg-rose-500"
                            )}
                          />
                          <span className="text-xs font-semibold">{admin.status}</span>
                        </div>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {new Date(admin.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Last Login */}
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{admin.last_login}</td>

                    {/* Actions Menu */}
                    <td className="px-5 py-3.5 text-right pr-6 relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === admin.id ? null : admin.id);
                        }}
                        className="p-1.5 rounded-lg border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {openMenuId === admin.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-6 mt-1 w-48 rounded-2xl border border-border/45 bg-card text-foreground shadow-2xl z-50 py-1.5 text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setIsViewModalOpen(true);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold hover:bg-muted/30 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" /> View Profile
                            </button>

                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setEditForm({
                                  fullName: admin.name,
                                  email: admin.email,
                                  phone: admin.phone === "N/A" ? "" : admin.phone,
                                  role: admin.role,
                                });
                                setIsEditModalOpen(true);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold hover:bg-muted/30 transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" /> Edit
                            </button>

                            {isSuperAdmin && (
                              <>
                                {admin.role !== "Super Admin" ? (
                                  <button
                                    onClick={() => {
                                      handleToggleSuperAdmin(admin, true);
                                      setOpenMenuId(null);
                                    }}
                                    disabled={loadingAction === `role-${admin.id}`}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors border-t border-border/20 pt-2"
                                  >
                                    {loadingAction === `role-${admin.id}` ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <UserCheck2 className="h-3.5 w-3.5" />
                                    )}
                                    Make Super Admin
                                  </button>
                                ) : (
                                  admin.id !== callerId && (
                                    <button
                                      onClick={() => {
                                        handleToggleSuperAdmin(admin, false);
                                        setOpenMenuId(null);
                                      }}
                                      disabled={loadingAction === `role-${admin.id}`}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors border-t border-border/20 pt-2"
                                    >
                                      {loadingAction === `role-${admin.id}` ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <UserCheck2 className="h-3.5 w-3.5" />
                                      )}
                                      Make Regular Admin
                                    </button>
                                  )
                                )}
                                {/* Status Toggle */}
                                {admin.status === "Active" && (
                                  <button
                                    onClick={() => {
                                      setSelectedAdmin(admin);
                                      setIsPauseConfirmOpen(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                                  >
                                    <PauseCircle className="h-3.5 w-3.5" /> Pause Admin
                                  </button>
                                )}

                                {admin.status === "Paused" && (
                                  <button
                                    onClick={() => {
                                      handleActivateAdmin(admin);
                                      setOpenMenuId(null);
                                    }}
                                    disabled={loadingAction === `activating-${admin.id}`}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-500 hover:bg-emerald-55 dark:hover:bg-emerald-950/20 transition-colors"
                                  >
                                    {loadingAction === `activating-${admin.id}` ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <PlayCircle className="h-3.5 w-3.5" />
                                    )}
                                    Activate Admin
                                  </button>
                                )}

                                {admin.status !== "Disabled" && (
                                  <button
                                    onClick={() => {
                                      setSelectedAdmin(admin);
                                      setIsDisableConfirmOpen(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors border-t border-border/20 mt-1 pt-2"
                                  >
                                    <Ban className="h-3.5 w-3.5" /> Disable Admin
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setSelectedAdmin(admin);
                                    setIsDeleteConfirmOpen(true);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/30 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete Admin
                                </button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Admin Modal ────────────────────────────────────────────────── */}
      <Modal open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isAddModalOpen} className="max-w-md border border-border/50">
            <ModalHeader>
              <ModalTitle>Add Admin</ModalTitle>
            </ModalHeader>

            <form onSubmit={handleAddAdmin} className="space-y-4 mt-4">
              {formError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    type="text"
                    value={addForm.fullName}
                    onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                    placeholder="Enter name"
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    type="password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    type="password"
                    value={addForm.confirmPassword}
                    onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>

              <ModalFooter className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-border/50 text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === "creating"}
                  className="h-10 px-5 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all flex items-center gap-2 shadow-lg shadow-primary/10"
                >
                  {loadingAction === "creating" && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Admin
                </button>
              </ModalFooter>
            </form>
          </ModalContent>
        </ModalPortal>
      </Modal>

      {/* ── Edit Admin Modal ───────────────────────────────────────────────── */}
      <Modal open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isEditModalOpen} className="max-w-md border border-border/50">
            <ModalHeader>
              <ModalTitle>Edit Admin</ModalTitle>
            </ModalHeader>

            <form onSubmit={handleEditAdmin} className="space-y-4 mt-4">
              {formError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    placeholder="Enter name"
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Role</label>
                <select
                  disabled={!isSuperAdmin || selectedAdmin?.role === "Super Admin"}
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 cursor-pointer disabled:opacity-65"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                </select>
                {!isSuperAdmin && (
                  <p className="text-[10px] text-muted-foreground mt-1 pl-1">
                    Only Super Admins can alter roles.
                  </p>
                )}
              </div>

              <ModalFooter className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-border/50 text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === "editing"}
                  className="h-10 px-5 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all flex items-center gap-2 shadow-lg shadow-primary/10"
                >
                  {loadingAction === "editing" && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </ModalFooter>
            </form>
          </ModalContent>
        </ModalPortal>
      </Modal>

      {/* ── View Profile Modal ─────────────────────────────────────────────── */}
      <Modal open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isViewModalOpen} className="max-w-sm border border-border/50">
            <ModalHeader className="relative pb-0">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </ModalHeader>

            <div className="flex flex-col items-center text-center space-y-4 pt-4 pb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/50 border border-violet-200/50 dark:border-violet-800/40 text-violet-700 dark:text-violet-400 font-extrabold uppercase text-xl">
                {selectedAdmin?.avatar ? (
                  <img src={selectedAdmin.avatar} alt={selectedAdmin.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  selectedAdmin?.name.slice(0, 2)
                )}
              </div>

              <div>
                <h3 className="font-extrabold text-lg text-foreground">{selectedAdmin?.name}</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-extrabold uppercase tracking-wider bg-primary/5 text-primary border-primary/20 mt-1">
                  {selectedAdmin?.role}
                </span>
              </div>

              <div className="w-full divide-y divide-border/30 text-xs text-left px-2">
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground font-medium">Email</span>
                  <span className="font-semibold text-foreground">{selectedAdmin?.email}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground font-medium">Phone</span>
                  <span className="font-semibold text-foreground">{selectedAdmin?.phone}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground font-medium">Status</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        selectedAdmin?.status === "Active" && "bg-emerald-500",
                        selectedAdmin?.status === "Paused" && "bg-amber-500",
                        selectedAdmin?.status === "Disabled" && "bg-rose-500"
                      )}
                    />
                    {selectedAdmin?.status}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground font-medium">Created Date</span>
                  <span className="font-semibold text-foreground">
                    {selectedAdmin?.created_at &&
                      new Date(selectedAdmin.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground font-medium">Last Login</span>
                  <span className="font-semibold text-foreground">{selectedAdmin?.last_login}</span>
                </div>
              </div>
            </div>
          </ModalContent>
        </ModalPortal>
      </Modal>

      {/* ── Pause Admin Confirmation Modal ───────────────────────────────── */}
      <Modal open={isPauseConfirmOpen} onOpenChange={setIsPauseConfirmOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isPauseConfirmOpen} className="max-w-sm border border-border/50">
            <ModalHeader>
              <ModalTitle>Pause this Admin?</ModalTitle>
            </ModalHeader>

            <div className="mt-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                This admin will not be able to login until reactivated.
              </p>
            </div>

            <ModalFooter className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPauseConfirmOpen(false)}
                className="h-10 px-4 rounded-xl border border-border/50 text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePauseAdmin}
                disabled={loadingAction === "pausing"}
                className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-sm font-bold text-white transition-all flex items-center gap-2 shadow-lg shadow-amber-500/10"
              >
                {loadingAction === "pausing" && <Loader2 className="h-4 w-4 animate-spin" />}
                Pause Admin
              </button>
            </ModalFooter>
          </ModalContent>
        </ModalPortal>
      </Modal>

      {/* ── Disable Admin Confirmation Modal ──────────────────────────────── */}
      <Modal open={isDisableConfirmOpen} onOpenChange={setIsDisableConfirmOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isDisableConfirmOpen} className="max-w-sm border border-border/50">
            <ModalHeader>
              <ModalTitle>Disable this Admin?</ModalTitle>
            </ModalHeader>

            <div className="mt-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                This account will be permanently disabled from logging into the portal.
              </p>
            </div>

            <ModalFooter className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDisableConfirmOpen(false)}
                className="h-10 px-4 rounded-xl border border-border/50 text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisableAdmin}
                disabled={loadingAction === "disabling"}
                className="h-10 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-sm font-bold text-white transition-all flex items-center gap-2 shadow-lg shadow-rose-500/10"
              >
                {loadingAction === "disabling" && <Loader2 className="h-4 w-4 animate-spin" />}
                Disable Admin
              </button>
            </ModalFooter>
          </ModalContent>
        </ModalPortal>
      </Modal>

      {/* ── Delete Admin Warning Modal ────────────────────────────────────── */}
      <Modal open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isDeleteConfirmOpen} className="max-w-sm border border-border/50">
            <ModalHeader>
              <ModalTitle>Delete Admin?</ModalTitle>
            </ModalHeader>

            <div className="mt-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                This action cannot be undone. All admin data will be removed permanently.
              </p>
            </div>

            <ModalFooter className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="h-10 px-4 rounded-xl border border-border/50 text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAdmin}
                disabled={loadingAction === "deleting"}
                className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-sm font-bold text-white transition-all flex items-center gap-2 shadow-lg shadow-rose-600/10"
              >
                {loadingAction === "deleting" && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Permanently
              </button>
            </ModalFooter>
          </ModalContent>
        </ModalPortal>
      </Modal>
    </div>
  );
}
