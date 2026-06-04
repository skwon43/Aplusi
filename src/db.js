import { isSupabaseReady, supabase } from "./supabaseClient";
import { seedData } from "./data";

const tableMap = {
  projects: "projects",
  conversations: "ai_conversations",
  ideas: "ideas",
  prompts: "prompts",
  logs: "build_logs",
  showcases: "showcases",
};

const localKey = "a-and-i-local-state";

function readLocalState() {
  const saved = window.localStorage.getItem(localKey);
  return saved ? JSON.parse(saved) : seedData;
}

function writeLocalState(nextState) {
  window.localStorage.setItem(localKey, JSON.stringify(nextState));
}

export async function loadAllData() {
  if (!isSupabaseReady) {
    return { data: readLocalState(), source: "local" };
  }

  const entries = await Promise.all(
    Object.entries(tableMap).map(async ([key, table]) => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return [key, data ?? []];
    }),
  );

  return { data: Object.fromEntries(entries), source: "supabase" };
}

export async function createRecord(collection, payload) {
  if (!isSupabaseReady) {
    const state = readLocalState();
    const record = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...payload,
    };
    const nextState = {
      ...state,
      [collection]: [record, ...(state[collection] ?? [])],
    };
    writeLocalState(nextState);
    return record;
  }

  const { data, error } = await supabase
    .from(tableMap[collection])
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateRecord(collection, id, payload) {
  if (!isSupabaseReady) {
    const state = readLocalState();
    const nextState = {
      ...state,
      [collection]: state[collection].map((item) =>
        item.id === id ? { ...item, ...payload } : item,
      ),
    };
    writeLocalState(nextState);
    return nextState[collection].find((item) => item.id === id);
  }

  const { data, error } = await supabase
    .from(tableMap[collection])
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRecord(collection, id) {
  if (!isSupabaseReady) {
    const state = readLocalState();
    const nextState = {
      ...state,
      [collection]: state[collection].filter((item) => item.id !== id),
    };
    writeLocalState(nextState);
    return;
  }

  const { error } = await supabase.from(tableMap[collection]).delete().eq("id", id);
  if (error) throw error;
}
