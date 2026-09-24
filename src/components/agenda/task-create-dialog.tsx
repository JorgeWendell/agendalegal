"use client";

import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { createTask } from "@/actions/agenda";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toDatetimeLocalValue } from "@/lib/utils";

export function TaskCreateDialog({
  open,
  onOpenChange,
  startsAt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startsAt: Date;
}) {
  const [description, setDescription] = useState("");
  const [startValue, setStartValue] = useState("");
  const [endValue, setEndValue] = useState("");

  useEffect(() => {
    if (!open) return;
    const start = new Date(startsAt);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    setDescription("");
    setStartValue(toDatetimeLocalValue(start));
    setEndValue(toDatetimeLocalValue(end));
  }, [open, startsAt]);

  const { execute, isExecuting } = useAction(createTask, {
    onSuccess() {
      toast.success("Tarefa criada com status aguardando.");
      onOpenChange(false);
    },
    onError({ error }) {
      toast.error(error.serverError || "Não foi possível criar a tarefa.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>
            A tarefa nasce com status aguardando.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            execute({
              description,
              startsAt: new Date(startValue).toISOString(),
              endsAt: new Date(endValue).toISOString(),
            });
          }}
        >
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="startsAt">Data de início</FieldLabel>
              <Input
                id="startsAt"
                type="datetime-local"
                className="h-10"
                value={startValue}
                onChange={(event) => setStartValue(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="endsAt">Data de término</FieldLabel>
              <Input
                id="endsAt"
                type="datetime-local"
                className="h-10"
                value={endValue}
                onChange={(event) => setEndValue(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Descrição</FieldLabel>
              <Textarea
                id="description"
                rows={4}
                placeholder="O que precisa ser feito?"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isExecuting}>
              {isExecuting ? <Loader2 className="animate-spin" /> : null}
              Criar tarefa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
