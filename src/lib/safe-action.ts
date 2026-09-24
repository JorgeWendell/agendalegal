import { createSafeActionClient } from "next-safe-action";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof ActionError) {
      return error.message;
    }

    console.error(error);
    return "Não foi possível concluir a operação.";
  },
});

export const protectedAction = actionClient.use(async ({ next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new ActionError("Sessão expirada. Entre novamente.");
  }

  return next({ ctx: { session } });
});
