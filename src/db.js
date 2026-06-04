import { emptyData, seedData } from "./data";
import { isSupabaseReady, supabase } from "./supabaseClient";

const localKey = "a-and-i-collaboration-state";
const projectFileBucket = "project-files";
const showcaseBucket = "showcase-screenshots";

export const tableMap = {
  projects: "projects",
  projectFiles: "project_files",
  projectComments: "project_comments",
  fileComments: "file_comments",
  projectUpdates: "project_updates",
  chatMessages: "chat_messages",
  activityLogs: "activity_logs",
  ideas: "ideas",
  ideaComments: "idea_comments",
  showcases: "showcases",
  showcaseFeedback: "showcase_feedback",
};

export function getSaveTarget(collection) {
  if (!isSupabaseReady) return `localStorage: ${localKey} > ${collection}`;

  const storage = {
    projectFiles: " + Storage bucket: project-files",
    showcases: " + Storage bucket: showcase-screenshots",
  };

  return `Supabase table: public.${tableMap[collection]}${storage[collection] || ""}`;
}

function readLocalState() {
  const saved = window.localStorage.getItem(localKey);
  return saved ? JSON.parse(saved) : seedData;
}

function writeLocalState(nextState) {
  window.localStorage.setItem(localKey, JSON.stringify(nextState));
}

function withDefaults(state) {
  return { ...emptyData, ...state };
}

export async function loadAllData() {
  if (!isSupabaseReady) {
    return { data: withDefaults(readLocalState()), source: "local" };
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

  return { data: withDefaults(Object.fromEntries(entries)), source: "supabase" };
}

export async function createRecord(collection, payload) {
  if (!isSupabaseReady) {
    const state = withDefaults(readLocalState());
    const record = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...payload,
    };
    writeLocalState({
      ...state,
      [collection]: [record, ...(state[collection] ?? [])],
    });
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
    const state = withDefaults(readLocalState());
    const nextItems = state[collection].map((item) =>
      item.id === id ? { ...item, ...payload } : item,
    );
    writeLocalState({ ...state, [collection]: nextItems });
    return nextItems.find((item) => item.id === id);
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
    const state = withDefaults(readLocalState());
    writeLocalState({
      ...state,
      [collection]: state[collection].filter((item) => item.id !== id),
    });
    return;
  }

  const { error } = await supabase.from(tableMap[collection]).delete().eq("id", id);
  if (error) throw error;
}

export async function uploadProjectFile({ projectId, file, versionNumber, actorName }) {
  const resourceType = file.type.startsWith("image/") ? "image" : "file";
  const basePayload = {
    project_id: projectId,
    resource_type: resourceType,
    original_name: file.name,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    version_group: file.name,
    version_number: versionNumber,
    created_by: actorName,
  };

  if (!isSupabaseReady) {
    const content = resourceType === "image" ? await fileToDataUrl(file) : await file.text();
    return createRecord("projectFiles", {
      ...basePayload,
      storage_path: null,
      public_url: resourceType === "image" ? content : null,
      external_url: null,
      content: resourceType === "image" ? "" : content,
    });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${projectId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(projectFileBucket)
    .upload(storagePath, file, { upsert: false });

  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from(projectFileBucket).getPublicUrl(storagePath);

  return createRecord("projectFiles", {
    ...basePayload,
    storage_path: storagePath,
    public_url: data.publicUrl,
    external_url: null,
  });
}

export async function createProjectLink({ projectId, title, url, actorName }) {
  return createRecord("projectFiles", {
    project_id: projectId,
    resource_type: "link",
    original_name: title,
    file_name: title,
    mime_type: "text/uri-list",
    size_bytes: 0,
    storage_path: null,
    public_url: null,
    external_url: url,
    version_group: title,
    version_number: 1,
    created_by: actorName,
    content: "",
  });
}

export async function getProjectFileContent(fileRecord) {
  if (!fileRecord) return "";
  if (fileRecord.resource_type === "link") return fileRecord.external_url ?? "";
  if (!isSupabaseReady) return fileRecord.content || fileRecord.public_url || "";
  if (fileRecord.resource_type === "image") return fileRecord.public_url ?? "";

  const { data, error } = await supabase.storage
    .from(projectFileBucket)
    .download(fileRecord.storage_path);

  if (error) throw error;
  return data.text();
}

export async function uploadShowcaseScreenshot(file) {
  if (!file) return { screenshot_path: null, screenshot_url: null };
  if (!isSupabaseReady) {
    return { screenshot_path: null, screenshot_url: await fileToDataUrl(file) };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(showcaseBucket)
    .upload(storagePath, file, { upsert: false });

  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from(showcaseBucket).getPublicUrl(storagePath);
  return { screenshot_path: storagePath, screenshot_url: data.publicUrl };
}

export function subscribeWorkspace(onChange) {
  if (!isSupabaseReady) return () => {};

  const channel = supabase.channel("a-and-i-workspace");
  Object.values(tableMap).forEach((table) => {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  });
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribePresence(userName, onPresence) {
  if (!isSupabaseReady) {
    onPresence([{ user_name: userName }, { user_name: "Mina" }, { user_name: "Joon" }]);
    return () => {};
  }

  const key = window.localStorage.getItem("a-and-i-presence-id") ?? crypto.randomUUID();
  window.localStorage.setItem("a-and-i-presence-id", key);

  const channel = supabase.channel("presence:a-and-i", {
    config: { presence: { key } },
  });

  channel.on("presence", { event: "sync" }, () => {
    onPresence(Object.values(channel.presenceState()).flat());
  });

  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track({ user_name: userName, online_at: new Date().toISOString() });
    }
  });

  return () => supabase.removeChannel(channel);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
