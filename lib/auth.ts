import { createClient } from "@supabase/supabase-js";
import api from "./api";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  // 1. Register in Supabase
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw new Error(error.message);

  // 2. Sync with Django backend
  const response = await api.post("/users/", {
    email,
    username: email.split("@")[0],
    first_name: firstName,
    last_name: lastName,
  });

  return response.data;
}
