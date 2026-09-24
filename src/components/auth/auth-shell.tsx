import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

const highlights = [
  "Agenda diária, semanal e mensal",
  "Tarefas com início, término e status",
  "Compartilhe a agenda ou uma tarefa",
  "Pronto para celular e tablet",
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-0 flex-1 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="absolute top-4 right-4 z-20 lg:right-8 lg:top-6">
        <ThemeToggle />
      </div>
      <section className="relative hidden overflow-hidden bg-[#06241f] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="auth-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -left-24 top-24 size-[420px] rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 size-[320px] rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative z-10 text-white">
          <BrandMark className="text-white" />
        </div>
        <div className="relative z-10 max-w-lg space-y-6 text-white">
          <p className="text-xs font-medium tracking-[0.28em] text-teal-300 uppercase">
            Organização simples
          </p>
          <h2 className="font-heading text-4xl leading-tight tracking-tight xl:text-5xl">
            Sua agenda, no ritmo do dia.
          </h2>
          <p className="max-w-md text-sm leading-6 text-white/65">
            Crie tarefas, acompanhe o status e compartilhe com quem já está
            cadastrado no Agenda Legal.
          </p>
          <ul className="grid gap-3 pt-2">
            {highlights.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-sm text-white/80"
              >
                <span className="size-1.5 rounded-full bg-teal-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs tracking-wide text-white/40">
          © Adel Web 2026
        </p>
      </section>
      <section className="flex items-center justify-center bg-background px-6 py-16 sm:px-10">
        {children}
      </section>
    </div>
  );
}
