"use client";

import { Loader2, Share2, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import {
  completeTask,
  deleteTask,
  shareTask,
  startTask,
  unshareTask,
} from "@/actions/agenda";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import type { Person, TaskDTO } from "@/lib/agenda-data";
import { formatDateTime } from "@/lib/utils";

const statusLabel: Record<TaskDTO["status"], string> = {
  aguardando: "Aguardando",
  iniciado: "Iniciado",
  concluido: "Concluído",
};

export function TaskDetailsDialog({
  task,
  users,
  onClose,
}: {
  task: TaskDTO | null;
  users: Person[];
  onClose: () => void;
}) {
  const [shareUserId, setShareUserId] = useState("");

  const { execute: executeStart, isExecuting: starting } = useAction(startTask, {
    onSuccess() {
      toast.success("Tarefa iniciada.");
    },
    onError({ error }) {
      toast.error(error.serverError || "Não foi possível iniciar.");
    },
  });

  const { execute: executeComplete, isExecuting: completing } = useAction(
    completeTask,
    {
      onSuccess() {
        toast.success("Tarefa concluída.");
      },
      onError({ error }) {
        toast.error(error.serverError || "Não foi possível terminar.");
      },
    }
  );

  const { execute: executeDelete, isExecuting: deleting } = useAction(
    deleteTask,
    {
      onSuccess() {
        toast.success("Tarefa excluída.");
        onClose();
      },
      onError({ error }) {
        toast.error(error.serverError || "Não foi possível excluir.");
      },
    }
  );

  const { execute: executeShare, isExecuting: sharing } = useAction(shareTask, {
    onSuccess() {
      toast.success("Tarefa compartilhada.");
      setShareUserId("");
    },
    onError({ error }) {
      toast.error(error.serverError || "Não foi possível compartilhar.");
    },
  });

  const { execute: executeUnshare, isExecuting: unsharing } = useAction(
    unshareTask,
    {
      onSuccess() {
        toast.success("Compartilhamento removido.");
      },
      onError({ error }) {
        toast.error(error.serverError || "Não foi possível remover.");
      },
    }
  );

  const busy = starting || completing || deleting || sharing || unsharing;
  const shareCandidates = users.filter(
    (item) => !task?.sharedWith.some((share) => share.id === item.id)
  );

  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {task ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8">{task.description}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <Badge>{statusLabel[task.status]}</Badge>
                <span>Dono: {task.ownerName}</span>
              </DialogDescription>
            </DialogHeader>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Início</dt>
                <dd>{formatDateTime(new Date(task.startsAt))}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Término previsto</dt>
                <dd>{formatDateTime(new Date(task.endsAt))}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Criada em</dt>
                <dd>{formatDateTime(new Date(task.createdAt))}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Iniciada em</dt>
                <dd>
                  {task.startedAt
                    ? formatDateTime(new Date(task.startedAt))
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Concluída em</dt>
                <dd>
                  {task.completedAt
                    ? formatDateTime(new Date(task.completedAt))
                    : "—"}
                </dd>
              </div>
            </dl>

            {task.isOwner ? (
              <div className="grid gap-3 rounded-lg border p-3">
                <Field>
                  <FieldLabel>Compartilhar com usuário cadastrado</FieldLabel>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <NativeSelect
                      className="h-9"
                      value={shareUserId}
                      onChange={(event) => setShareUserId(event.target.value)}
                    >
                      <option value="">Selecione um usuário</option>
                      {shareCandidates.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.email})
                        </option>
                      ))}
                    </NativeSelect>
                    <Button
                      type="button"
                      className="h-9"
                      disabled={!shareUserId || busy}
                      onClick={() =>
                        executeShare({ taskId: task.id, userId: shareUserId })
                      }
                    >
                      {sharing ? <Loader2 className="animate-spin" /> : <Share2 />}
                      Compartilhar
                    </Button>
                  </div>
                </Field>
                {task.sharedWith.length > 0 ? (
                  <ul className="grid gap-2">
                    {task.sharedWith.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span>
                          {item.name}{" "}
                          <span className="text-muted-foreground">
                            {item.email}
                          </span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            executeUnshare({
                              taskId: task.id,
                              userId: item.id,
                            })
                          }
                        >
                          Remover
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ainda não compartilhada.
                  </p>
                )}
              </div>
            ) : null}

            {task.isOwner ? (
              <DialogFooter className="gap-2">
                {task.status === "aguardando" ? (
                  <Button
                    disabled={busy}
                    onClick={() => executeStart({ taskId: task.id })}
                  >
                    {starting ? <Loader2 className="animate-spin" /> : null}
                    Iniciar
                  </Button>
                ) : null}
                {task.status === "iniciado" ? (
                  <Button
                    disabled={busy}
                    onClick={() => executeComplete({ taskId: task.id })}
                  >
                    {completing ? <Loader2 className="animate-spin" /> : null}
                    Terminar
                  </Button>
                ) : null}
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => executeDelete({ taskId: task.id })}
                >
                  {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  Excluir
                </Button>
              </DialogFooter>
            ) : (
              <p className="text-sm text-muted-foreground">
                Esta tarefa foi compartilhada com você. Somente o dono pode
                alterar o status.
              </p>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
