import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSessionUser, registerUser, authenticateUser, endSession, type CurrentUser } from "./auth.server";

export type { CurrentUser };

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentUser | null> => getSessionUser(),
);

export const signUp = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().trim().email(), password: z.string().min(6) }))
  .handler(async ({ data }) => registerUser(data.email, data.password));

export const signIn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().trim().email(), password: z.string().min(1) }))
  .handler(async ({ data }) => authenticateUser(data.email, data.password));

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  await endSession();
  return { success: true };
});
