import "server-only";

import { and, eq, gt, inArray, isNull, lt, ne, or } from "drizzle-orm";

import { db } from "@/db";
import {
  agendaShare,
  task,
  taskShare,
  taskStatus,
  user,
  type TaskStatus,
} from "@/db/schema";
import {
  addDays,
  endOfDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDateParam,
} from "@/lib/utils";

export type CalendarView = "diaria" | "semanal" | "mensal";

export type Person = {
  id: string;
  name: string;
  email: string;
};

export type TaskDTO = {
  id: string;
  ownerId: string;
  ownerName: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: Exclude<TaskStatus, "excluido">;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  isOwner: boolean;
  sharedWith: Person[];
};

export type AgendaBoardData = {
  currentUser: Person;
  view: CalendarView;
  date: string;
  ownerId: string;
  isOwnAgenda: boolean;
  ownerName: string;
  rangeStart: string;
  rangeEnd: string;
  tasks: TaskDTO[];
  users: Person[];
  sharedAgendas: Person[];
  agendaShares: Person[];
};

function parseDateParam(value: string | undefined) {
  if (!value) return startOfDay(new Date());
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return startOfDay(new Date());
  return new Date(year, month - 1, day);
}

export { toDateParam };

export function getVisibleRange(view: CalendarView, date: Date) {
  if (view === "diaria") {
    return { start: startOfDay(date), end: endOfDay(date) };
  }

  if (view === "semanal") {
    const start = startOfWeek(date);
    return { start, end: endOfDay(addDays(start, 6)) };
  }

  const monthStart = startOfMonth(date);
  const gridStart = startOfWeek(monthStart);
  return { start: gridStart, end: endOfDay(addDays(gridStart, 41)) };
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

export async function loadAgendaBoard(input: {
  userId: string;
  userName: string;
  userEmail: string;
  view: CalendarView;
  date?: string;
  ownerId?: string;
}): Promise<AgendaBoardData> {
  const view = input.view;
  const selectedDate = parseDateParam(input.date);
  const ownerId = input.ownerId || input.userId;
  const isOwnAgenda = ownerId === input.userId;
  const { start, end } = getVisibleRange(view, selectedDate);

  if (!isOwnAgenda) {
    const [share] = await db
      .select({ id: agendaShare.id })
      .from(agendaShare)
      .where(
        and(
          eq(agendaShare.ownerId, ownerId),
          eq(agendaShare.sharedWithUserId, input.userId)
        )
      )
      .limit(1);

    if (!share) {
      throw new Error("Você não tem acesso a esta agenda.");
    }
  }

  const [owner] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .where(eq(user.id, ownerId))
    .limit(1);

  const overlapping = and(lt(task.startsAt, end), gt(task.endsAt, start));

  let taskRows: (typeof task.$inferSelect & { ownerName: string })[] = [];

  if (isOwnAgenda) {
    const sharedTaskIds = db
      .select({ taskId: taskShare.taskId })
      .from(taskShare)
      .where(eq(taskShare.sharedWithUserId, input.userId));

    taskRows = await db
      .select({
        id: task.id,
        ownerId: task.ownerId,
        description: task.description,
        startsAt: task.startsAt,
        endsAt: task.endsAt,
        status: task.status,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        deletedAt: task.deletedAt,
        ownerName: user.name,
      })
      .from(task)
      .innerJoin(user, eq(task.ownerId, user.id))
      .where(
        and(
          isNull(task.deletedAt),
          ne(task.status, taskStatus.excluido),
          overlapping,
          or(eq(task.ownerId, input.userId), inArray(task.id, sharedTaskIds))
        )
      );
  } else {
    taskRows = await db
      .select({
        id: task.id,
        ownerId: task.ownerId,
        description: task.description,
        startsAt: task.startsAt,
        endsAt: task.endsAt,
        status: task.status,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        deletedAt: task.deletedAt,
        ownerName: user.name,
      })
      .from(task)
      .innerJoin(user, eq(task.ownerId, user.id))
      .where(
        and(
          eq(task.ownerId, ownerId),
          isNull(task.deletedAt),
          ne(task.status, taskStatus.excluido),
          overlapping
        )
      );
  }

  const taskIds = taskRows.map((row) => row.id);
  const shareRows =
    taskIds.length === 0
      ? []
      : await db
          .select({
            taskId: taskShare.taskId,
            id: user.id,
            name: user.name,
            email: user.email,
          })
          .from(taskShare)
          .innerJoin(user, eq(taskShare.sharedWithUserId, user.id))
          .where(inArray(taskShare.taskId, taskIds));

  const sharesByTask = new Map<string, Person[]>();
  for (const row of shareRows) {
    const list = sharesByTask.get(row.taskId) ?? [];
    list.push({ id: row.id, name: row.name, email: row.email });
    sharesByTask.set(row.taskId, list);
  }

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .where(ne(user.id, input.userId))
    .orderBy(user.name);

  const incomingShares = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(agendaShare)
    .innerJoin(user, eq(agendaShare.ownerId, user.id))
    .where(eq(agendaShare.sharedWithUserId, input.userId));

  const outgoingShares = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(agendaShare)
    .innerJoin(user, eq(agendaShare.sharedWithUserId, user.id))
    .where(eq(agendaShare.ownerId, input.userId));

  return {
    currentUser: {
      id: input.userId,
      name: input.userName,
      email: input.userEmail,
    },
    view,
    date: toDateParam(selectedDate),
    ownerId,
    isOwnAgenda,
    ownerName: owner?.name ?? "Agenda",
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
    tasks: taskRows.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      description: row.description,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      status: row.status as Exclude<TaskStatus, "excluido">,
      createdAt: row.createdAt.toISOString(),
      startedAt: toIso(row.startedAt),
      completedAt: toIso(row.completedAt),
      isOwner: row.ownerId === input.userId,
      sharedWith: sharesByTask.get(row.id) ?? [],
    })),
    users,
    sharedAgendas: incomingShares,
    agendaShares: outgoingShares,
  };
}
