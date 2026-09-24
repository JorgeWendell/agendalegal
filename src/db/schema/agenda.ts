import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const taskStatus = {
  aguardando: "aguardando",
  iniciado: "iniciado",
  concluido: "concluido",
  excluido: "excluido",
} as const;

export type TaskStatus = (typeof taskStatus)[keyof typeof taskStatus];

export const task = pgTable(
  "task",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }).notNull(),
    status: text("status").notNull().default(taskStatus.aguardando),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("task_ownerId_idx").on(table.ownerId),
    index("task_startsAt_idx").on(table.startsAt),
  ]
);

export const agendaShare = pgTable(
  "agenda_share",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sharedWithUserId: text("shared_with_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("agenda_share_owner_user_uidx").on(
      table.ownerId,
      table.sharedWithUserId
    ),
    index("agenda_share_sharedWith_idx").on(table.sharedWithUserId),
  ]
);

export const taskShare = pgTable(
  "task_share",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    sharedWithUserId: text("shared_with_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("task_share_task_user_uidx").on(
      table.taskId,
      table.sharedWithUserId
    ),
    index("task_share_sharedWith_idx").on(table.sharedWithUserId),
  ]
);
