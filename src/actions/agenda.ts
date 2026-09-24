"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { agendaShare, task, taskShare, taskStatus, user } from "@/db/schema";
import { ActionError, protectedAction } from "@/lib/safe-action";

function revalidateAgenda() {
  revalidatePath("/agenda");
}

async function getOwnedTask(taskId: string, userId: string) {
  const [row] = await db
    .select()
    .from(task)
    .where(and(eq(task.id, taskId), eq(task.ownerId, userId)))
    .limit(1);

  if (!row || row.status === taskStatus.excluido || row.deletedAt) {
    throw new ActionError("Tarefa não encontrada.");
  }

  return row;
}

export const createTask = protectedAction
  .inputSchema(
    z.object({
      description: z.string().trim().min(1, "Descreva a tarefa."),
      startsAt: z.string().min(1),
      endsAt: z.string().min(1),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const startsAt = new Date(parsedInput.startsAt);
    const endsAt = new Date(parsedInput.endsAt);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new ActionError("Datas inválidas.");
    }

    if (endsAt <= startsAt) {
      throw new ActionError("A data de término deve ser depois do início.");
    }

    const now = new Date();
    await db.insert(task).values({
      id: crypto.randomUUID(),
      ownerId: ctx.session.user.id,
      description: parsedInput.description,
      startsAt,
      endsAt,
      status: taskStatus.aguardando,
      createdAt: now,
    });

    revalidateAgenda();
    return { ok: true };
  });

export const startTask = protectedAction
  .inputSchema(z.object({ taskId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const row = await getOwnedTask(parsedInput.taskId, ctx.session.user.id);

    if (row.status !== taskStatus.aguardando) {
      throw new ActionError("Só é possível iniciar uma tarefa em aguardando.");
    }

    await db
      .update(task)
      .set({
        status: taskStatus.iniciado,
        startedAt: new Date(),
      })
      .where(eq(task.id, row.id));

    revalidateAgenda();
    return { ok: true };
  });

export const completeTask = protectedAction
  .inputSchema(z.object({ taskId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const row = await getOwnedTask(parsedInput.taskId, ctx.session.user.id);

    if (row.status !== taskStatus.iniciado) {
      throw new ActionError("Só é possível terminar uma tarefa iniciada.");
    }

    await db
      .update(task)
      .set({
        status: taskStatus.concluido,
        completedAt: new Date(),
      })
      .where(eq(task.id, row.id));

    revalidateAgenda();
    return { ok: true };
  });

export const deleteTask = protectedAction
  .inputSchema(z.object({ taskId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const row = await getOwnedTask(parsedInput.taskId, ctx.session.user.id);

    await db
      .update(task)
      .set({
        status: taskStatus.excluido,
        deletedAt: new Date(),
      })
      .where(eq(task.id, row.id));

    revalidateAgenda();
    return { ok: true };
  });

export const shareTask = protectedAction
  .inputSchema(
    z.object({
      taskId: z.string().min(1),
      userId: z.string().min(1),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.userId === ctx.session.user.id) {
      throw new ActionError("Você já é o dono desta tarefa.");
    }

    await getOwnedTask(parsedInput.taskId, ctx.session.user.id);

    const [target] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, parsedInput.userId))
      .limit(1);

    if (!target) {
      throw new ActionError("Usuário não encontrado.");
    }

    await db
      .insert(taskShare)
      .values({
        id: crypto.randomUUID(),
        taskId: parsedInput.taskId,
        sharedWithUserId: parsedInput.userId,
        createdAt: new Date(),
      })
      .onConflictDoNothing();

    revalidateAgenda();
    return { ok: true };
  });

export const unshareTask = protectedAction
  .inputSchema(
    z.object({
      taskId: z.string().min(1),
      userId: z.string().min(1),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    await getOwnedTask(parsedInput.taskId, ctx.session.user.id);

    await db
      .delete(taskShare)
      .where(
        and(
          eq(taskShare.taskId, parsedInput.taskId),
          eq(taskShare.sharedWithUserId, parsedInput.userId)
        )
      );

    revalidateAgenda();
    return { ok: true };
  });

export const shareAgenda = protectedAction
  .inputSchema(z.object({ userId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.userId === ctx.session.user.id) {
      throw new ActionError("Não é possível compartilhar a agenda consigo mesmo.");
    }

    const [target] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, parsedInput.userId))
      .limit(1);

    if (!target) {
      throw new ActionError("Usuário não encontrado.");
    }

    await db
      .insert(agendaShare)
      .values({
        id: crypto.randomUUID(),
        ownerId: ctx.session.user.id,
        sharedWithUserId: parsedInput.userId,
        createdAt: new Date(),
      })
      .onConflictDoNothing();

    revalidateAgenda();
    return { ok: true };
  });

export const unshareAgenda = protectedAction
  .inputSchema(z.object({ userId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    await db
      .delete(agendaShare)
      .where(
        and(
          eq(agendaShare.ownerId, ctx.session.user.id),
          eq(agendaShare.sharedWithUserId, parsedInput.userId)
        )
      );

    revalidateAgenda();
    return { ok: true };
  });
