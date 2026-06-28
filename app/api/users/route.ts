import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { UserRole } from "@/lib/types";

// Prevent static pre-rendering at build time
export const dynamic = "force-dynamic";


type CreateUserBody = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateUserBody;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        first_name: body.first_name,
        last_name: body.last_name,
        role: body.role
      }
    });

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? "Creation impossible" }, { status: 400 });
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: data.user.id,
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
      role: body.role,
      is_active: true
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 });
  }
}
