"use client";

import { switchPersonaAction } from "@/lib/actions";
import type { ShopSession } from "@/lib/shop/session";
import { SEED_USERS } from "@/lib/shop/seed";

export function PersonaSwitcher({ session }: { session: ShopSession }) {
  return (
    <form action={switchPersonaAction} className="flex items-center gap-2">
      <label htmlFor="persona" className="sr-only">
        Persona
      </label>
      <select
        id="persona"
        name="userId"
        defaultValue={session.user.id}
        className="max-w-[11rem] rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5 text-xs font-semibold"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {SEED_USERS.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </form>
  );
}
