// app/api/users/invite/route.ts
// Supabase-based invitation is no longer used.
// This route now returns a friendly message indicating that
// user accounts should be created via the Django admin.

import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "User invitations are now managed by the system administrator. Please create users via the Django admin interface.",
    },
    { status: 501 }
  )
}
