"use client";

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Share2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { TaskCreateDialog } from "@/components/agenda/task-create-dialog";
import { TaskDetailsDialog } from "@/components/agenda/task-details-dialog";
import { ShareAgendaDialog } from "@/components/agenda/share-agenda-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AgendaBoardData,
  CalendarView,
  TaskDTO,
} from "@/lib/agenda-data";
import {
  addDays,
  cn,
  formatMonthLabel,
  formatTime,
  startOfMonth,
  startOfWeek,
  toDateParam,
} from "@/lib/utils";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const statusClass: Record<TaskDTO["status"], string> = {
  aguardando:
    "border-amber-300/70 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-50",
  iniciado:
    "border-sky-300/70 bg-sky-50 text-sky-950 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-50",
  concluido:
    "border-emerald-300/70 bg-emerald-50 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-50",
};

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function tasksForDay(tasks: TaskDTO[], day: Date) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  return tasks.filter((item) => {
    const startsAt = new Date(item.startsAt);
    const endsAt = new Date(item.endsAt);
    return startsAt < end && endsAt > start;
  });
}

export function AgendaBoard({ data }: { data: AgendaBoardData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const selectedDate = parseDate(data.date);
  const today = new Date();
  const [createOpen, setCreateOpen] = useState(false);
  const [createStartsAt, setCreateStartsAt] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);
  const [shareAgendaOpen, setShareAgendaOpen] = useState(false);

  const selectedTaskLive = useMemo(
    () => data.tasks.find((item) => item.id === selectedTask?.id) ?? selectedTask,
    [data.tasks, selectedTask]
  );

  function pushState(next: {
    view?: CalendarView;
    date?: Date;
    ownerId?: string;
  }) {
    const params = new URLSearchParams();
    params.set("view", next.view ?? data.view);
    params.set("date", toDateParam(next.date ?? selectedDate));
    const ownerId = next.ownerId ?? data.ownerId;
    if (ownerId !== data.currentUser.id) {
      params.set("owner", ownerId);
    }
    startTransition(() => {
      router.push(`/agenda?${params.toString()}`);
    });
  }

  function shift(amount: number) {
    if (data.view === "diaria") {
      pushState({ date: addDays(selectedDate, amount) });
      return;
    }
    if (data.view === "semanal") {
      pushState({ date: addDays(selectedDate, amount * 7) });
      return;
    }
    pushState({
      date: new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + amount,
        1
      ),
    });
  }

  function openCreate(day: Date, hour?: number) {
    if (!data.isOwnAgenda) return;
    const startsAt = new Date(day);
    startsAt.setHours(hour ?? 9, 0, 0, 0);
    setCreateStartsAt(startsAt);
    setCreateOpen(true);
  }

  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(startOfWeek(selectedDate), index)
  );
  const monthStart = startOfMonth(selectedDate);
  const monthGrid = Array.from({ length: 42 }, (_, index) =>
    addDays(startOfWeek(monthStart), index)
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)}>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            onClick={() => pushState({ date: new Date() })}
          >
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
          <h1 className="min-w-0 flex-1 px-1 font-heading text-base sm:text-xl">
            {data.view === "mensal"
              ? formatMonthLabel(selectedDate)
              : selectedDate.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
          </h1>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-center">
          <NativeSelect
            className="h-9 w-full sm:min-w-48 lg:w-auto"
            value={data.ownerId}
            onChange={(event) => pushState({ ownerId: event.target.value })}
          >
            <option value={data.currentUser.id}>Minha agenda</option>
            {data.sharedAgendas.map((item) => (
              <option key={item.id} value={item.id}>
                Agenda de {item.name}
              </option>
            ))}
          </NativeSelect>
          {data.isOwnAgenda ? (
            <>
              <Button
                variant="outline"
                className="h-9"
                onClick={() => setShareAgendaOpen(true)}
              >
                <Share2 />
                Compartilhar agenda
              </Button>
              <Button
                className="h-9 sm:col-span-2 lg:col-span-1"
                onClick={() => openCreate(selectedDate)}
              >
                <Plus />
                Criar tarefa
              </Button>
            </>
          ) : (
            <Badge variant="secondary" className="h-9 rounded-lg px-3">
              Somente leitura · {data.ownerName}
            </Badge>
          )}
        </div>
      </div>

      <Tabs
        value={data.view}
        onValueChange={(value) => {
          if (!value) return;
          pushState({ view: value as CalendarView });
        }}
      >
        <TabsList className="h-10 w-full max-w-md">
          <TabsTrigger value="diaria">Diária</TabsTrigger>
          <TabsTrigger value="semanal">Semanal</TabsTrigger>
          <TabsTrigger value="mensal">Mensal</TabsTrigger>
        </TabsList>
      </Tabs>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto rounded-xl bg-card ring-1 ring-foreground/10",
          pending && "opacity-70"
        )}
      >
        {data.view === "mensal" ? (
          <MonthView
            grid={monthGrid}
            month={selectedDate.getMonth()}
            today={today}
            selected={selectedDate}
            tasks={data.tasks}
            onSelectDay={(day) => pushState({ view: "diaria", date: day })}
          />
        ) : data.view === "semanal" ? (
          <WeekView
            days={weekDays}
            today={today}
            tasks={data.tasks}
            canCreate={data.isOwnAgenda}
            onSelectDay={(day) => pushState({ view: "diaria", date: day })}
            onCreate={openCreate}
            onSelectTask={setSelectedTask}
          />
        ) : (
          <DayView
            day={selectedDate}
            tasks={tasksForDay(data.tasks, selectedDate)}
            canCreate={data.isOwnAgenda}
            onCreate={openCreate}
            onSelectTask={setSelectedTask}
          />
        )}
      </div>

      <TaskCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        startsAt={createStartsAt ?? selectedDate}
      />
      <TaskDetailsDialog
        task={selectedTaskLive}
        users={data.users}
        onClose={() => setSelectedTask(null)}
      />
      <ShareAgendaDialog
        open={shareAgendaOpen}
        onOpenChange={setShareAgendaOpen}
        users={data.users}
        shares={data.agendaShares}
      />
    </div>
  );
}

function MonthView({
  grid,
  month,
  today,
  selected,
  tasks,
  onSelectDay,
}: {
  grid: Date[];
  month: number;
  today: Date;
  selected: Date;
  tasks: TaskDTO[];
  onSelectDay: (day: Date) => void;
}) {
  return (
    <div className="grid grid-cols-7">
      {WEEKDAYS.map((label) => (
        <div
          key={label}
          className="border-b px-0.5 py-2 text-center text-[10px] font-medium text-muted-foreground sm:px-2 sm:text-xs"
        >
          <span className="sm:hidden">{label.slice(0, 1)}</span>
          <span className="hidden sm:inline">{label}</span>
        </div>
      ))}
      {grid.map((day) => {
        const dayTasks = tasksForDay(tasks, day);
        const isCurrentMonth = day.getMonth() === month;
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDay(day)}
            className={cn(
              "min-h-14 border-b border-r p-1 text-left align-top hover:bg-muted/60 sm:min-h-24 sm:p-2",
              !isCurrentMonth && "bg-muted/30 text-muted-foreground",
              sameDay(day, today) && "bg-primary/5",
              sameDay(day, selected) && "ring-1 ring-inset ring-primary/40"
            )}
          >
            <div className="mb-1 flex items-center justify-between">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs sm:size-7 sm:text-sm",
                  sameDay(day, today) && "bg-primary text-primary-foreground"
                )}
              >
                {day.getDate()}
              </span>
              {dayTasks.length > 0 ? (
                <span className="hidden text-[11px] text-muted-foreground sm:inline">
                  {dayTasks.length}
                </span>
              ) : null}
            </div>
            <div className="hidden gap-1 sm:grid">
              {dayTasks.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "truncate rounded-md border px-1.5 py-0.5 text-[11px]",
                    statusClass[item.status]
                  )}
                >
                  {formatTime(new Date(item.startsAt))} {item.description}
                </div>
              ))}
              {dayTasks.length > 3 ? (
                <p className="text-[11px] text-muted-foreground">
                  +{dayTasks.length - 3} tarefas
                </p>
              ) : null}
            </div>
            {dayTasks.length > 0 ? (
              <div className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
                {dayTasks.slice(0, 4).map((item) => (
                  <span
                    key={item.id}
                    className={cn(
                      "size-1.5 rounded-full",
                      item.status === "aguardando" && "bg-amber-500",
                      item.status === "iniciado" && "bg-sky-500",
                      item.status === "concluido" && "bg-emerald-500"
                    )}
                  />
                ))}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function WeekView({
  days,
  today,
  tasks,
  canCreate,
  onSelectDay,
  onCreate,
  onSelectTask,
}: {
  days: Date[];
  today: Date;
  tasks: TaskDTO[];
  canCreate: boolean;
  onSelectDay: (day: Date) => void;
  onCreate: (day: Date, hour: number) => void;
  onSelectTask: (task: TaskDTO) => void;
}) {
  return (
    <>
      <div className="grid gap-2 p-3 md:hidden">
        {days.map((day) => {
          const items = tasksForDay(tasks, day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "rounded-lg border p-3 text-left hover:bg-muted/50",
                sameDay(day, today) && "border-primary/40 bg-primary/5"
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium capitalize">
                  {day.toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {items.length} tarefa{items.length === 1 ? "" : "s"}
                </span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Toque para ver as horas e criar tarefa
                </p>
              ) : (
                <div className="grid gap-1">
                  {items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "truncate rounded-md border px-2 py-1 text-xs",
                        statusClass[item.status]
                      )}
                    >
                      {formatTime(new Date(item.startsAt))} {item.description}
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">
      <div className="min-w-[880px]">
      <div className="sticky top-0 z-10 grid grid-cols-[72px_repeat(7,1fr)] border-b bg-card">
        <div />
        {days.map((day) => (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDay(day)}
            className={cn(
              "px-2 py-3 text-center text-sm hover:bg-muted/50",
              sameDay(day, today) && "text-primary"
            )}
          >
            <div className="text-xs text-muted-foreground uppercase">
              {WEEKDAYS[days.indexOf(day)]}
            </div>
            <div
              className={cn(
                "mx-auto mt-1 flex size-8 items-center justify-center rounded-full",
                sameDay(day, today) && "bg-primary text-primary-foreground"
              )}
            >
              {day.getDate()}
            </div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[72px_repeat(7,1fr)]">
        {HOURS.map((hour) => (
          <HourRow key={hour} hour={hour}>
            {days.map((day) => (
              <HourCell
                key={`${day.toISOString()}-${hour}`}
                hour={hour}
                day={day}
                tasks={tasks}
                canCreate={canCreate}
                onCreate={onCreate}
                onSelectTask={onSelectTask}
              />
            ))}
          </HourRow>
        ))}
      </div>
    </div>
    </div>
    </>
  );
}

function DayView({
  day,
  tasks,
  canCreate,
  onCreate,
  onSelectTask,
}: {
  day: Date;
  tasks: TaskDTO[];
  canCreate: boolean;
  onCreate: (day: Date, hour: number) => void;
  onSelectTask: (task: TaskDTO) => void;
}) {
  return (
    <div>
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b bg-card px-3 py-2">
        <p className="text-sm font-medium">Horários do dia</p>
        {canCreate ? (
          <Button size="sm" onClick={() => onCreate(day, 9)}>
            <Plus />
            Criar tarefa
          </Button>
        ) : null}
      </div>
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="grid min-h-16 grid-cols-[56px_1fr] border-b last:border-b-0 sm:grid-cols-[72px_1fr]"
        >
          <div className="px-1 py-2 text-right text-xs text-muted-foreground sm:px-2">
            {String(hour).padStart(2, "0")}:00
          </div>
          <div className="relative border-l p-1">
            {canCreate ? (
              <button
                type="button"
                className="absolute inset-0"
                onClick={() => onCreate(day, hour)}
                aria-label={`Criar tarefa às ${hour}h`}
              />
            ) : null}
            <div className="relative z-10 grid gap-1">
              {tasks
                .filter((item) => new Date(item.startsAt).getHours() === hour)
                .map((item) => (
                  <TaskChip
                    key={item.id}
                    task={item}
                    onSelect={onSelectTask}
                  />
                ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HourRow({
  hour,
  children,
}: {
  hour: number;
  children: React.ReactNode;
}) {
  return (
    <div className="contents">
      <div className="border-b px-2 py-2 text-right text-xs text-muted-foreground">
        {String(hour).padStart(2, "0")}:00
      </div>
      {children}
    </div>
  );
}

function HourCell({
  hour,
  day,
  tasks,
  canCreate,
  onCreate,
  onSelectTask,
}: {
  hour: number;
  day: Date;
  tasks: TaskDTO[];
  canCreate: boolean;
  onCreate: (day: Date, hour: number) => void;
  onSelectTask: (task: TaskDTO) => void;
}) {
  const items = tasksForDay(tasks, day).filter(
    (item) => new Date(item.startsAt).getHours() === hour
  );

  return (
    <div className="relative min-h-16 border-b border-l p-1">
      {canCreate ? (
        <button
          type="button"
          className="absolute inset-0"
          onClick={() => onCreate(day, hour)}
          aria-label={`Criar tarefa ${day.getDate()} às ${hour}h`}
        />
      ) : null}
      <div className="relative z-10 grid gap-1">
        {items.map((item) => (
          <TaskChip key={item.id} task={item} onSelect={onSelectTask} />
        ))}
      </div>
    </div>
  );
}

function TaskChip({
  task,
  onSelect,
}: {
  task: TaskDTO;
  onSelect: (task: TaskDTO) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect(task);
      }}
      className={cn(
        "w-full rounded-md border px-2 py-1 text-left text-xs whitespace-normal",
        statusClass[task.status]
      )}
    >
      <span className="font-medium">{formatTime(new Date(task.startsAt))}</span>{" "}
      {task.description}
    </button>
  );
}
