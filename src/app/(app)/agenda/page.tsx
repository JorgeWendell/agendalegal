import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AgendaBoard } from "@/components/agenda/agenda-board";
import { loadAgendaBoard, type CalendarView } from "@/lib/agenda-data";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Agenda",
};

const views = new Set<CalendarView>(["diaria", "semanal", "mensal"]);

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; owner?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const view = views.has(params.view as CalendarView)
    ? (params.view as CalendarView)
    : "mensal";

  try {
    const data = await loadAgendaBoard({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      view,
      date: params.date,
      ownerId: params.owner,
    });

    return <AgendaBoard data={data} />;
  } catch (error) {
    if (params.owner) {
      redirect("/agenda");
    }
    throw error;
  }
}
