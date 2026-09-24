"use client";

import { Loader2, Share2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { shareAgenda, unshareAgenda } from "@/actions/agenda";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import type { Person } from "@/lib/agenda-data";

export function ShareAgendaDialog({
  open,
  onOpenChange,
  users,
  shares,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: Person[];
  shares: Person[];
}) {
  const [userId, setUserId] = useState("");
  const candidates = users.filter(
    (item) => !shares.some((share) => share.id === item.id)
  );

  const { execute: executeShare, isExecuting: sharing } = useAction(
    shareAgenda,
    {
      onSuccess() {
        toast.success("Agenda compartilhada.");
        setUserId("");
      },
      onError({ error }) {
        toast.error(error.serverError || "Não foi possível compartilhar.");
      },
    }
  );

  const { execute: executeUnshare, isExecuting: unsharing } = useAction(
    unshareAgenda,
    {
      onSuccess() {
        toast.success("Acesso removido.");
      },
      onError({ error }) {
        toast.error(error.serverError || "Não foi possível remover o acesso.");
      },
    }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar agenda</DialogTitle>
          <DialogDescription>
            Somente usuários já cadastrados no Agenda Legal podem receber acesso
            à agenda inteira.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel>Usuário</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <NativeSelect
              className="h-9"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            >
              <option value="">Selecione</option>
              {candidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.email})
                </option>
              ))}
            </NativeSelect>
            <Button
              className="h-9"
              disabled={!userId || sharing}
              onClick={() => executeShare({ userId })}
            >
              {sharing ? <Loader2 className="animate-spin" /> : <Share2 />}
              Compartilhar
            </Button>
          </div>
        </Field>
        {shares.length > 0 ? (
          <ul className="grid gap-2">
            {shares.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>
                  {item.name}{" "}
                  <span className="text-muted-foreground">{item.email}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={unsharing}
                  onClick={() => executeUnshare({ userId: item.id })}
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ninguém tem acesso à sua agenda ainda.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
