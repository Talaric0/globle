import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type GameResult = {
  id?: string;
  date: string;
  country: string;
  continent: string;
  num_guesses: number;
  correct_guesser: string;
  created_at?: string;
};
