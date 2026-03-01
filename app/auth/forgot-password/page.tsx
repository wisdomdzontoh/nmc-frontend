import { redirect } from "next/navigation"

// Password reset is handled through admin contact. Redirect to login.
export default function ForgotPasswordPage() {
  redirect("/auth/login")
}
