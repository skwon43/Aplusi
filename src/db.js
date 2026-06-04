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

const orderedCollections = Object.keys(tableMap);

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
    orderedCollections.map(async (collection) => {
      const { data, error } = await supabase
        .from(tableMap[collection])
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return [collection, data ?? []];
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
    const state = withDefaults(readLocalState());
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
    const state = withDefaults(readLocalState());
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

export async function uploadProjectFile({ projectId, file, versionNumber, actorName }) {
  const resourceType = file.type.startsWith("image/") ? "image" : "file";
  const payload = {
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
    const content = await readLocalFileContent(file);
    return createRecord("projectFiles", {
      ...payload,
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

  const { data: publicData } = supabase.storage.from(projectFileBucket).getPublicUrl(storagePath);

  return createRecord("projectFiles", {
    ...payload,
    storage_path: storagePath,
    public_url: publicData.publicUrl,
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

  if (fileRecord.resource_type === "link") {
    return fileRecord.external_url ?? "";
  }

  if (!isSupabaseReady) {
    return fileRecord.content || fileRecord.public_url || "";
  }

  if (fileRecord.resource_type === "image") {
    return fileRecord.public_url ?? "";
  }

  if (!isTextLike(fileRecord)) {
    return "이 파일은 텍스트 미리보기를 지원하지 않습니다. 다운로드 또는 원본 링크로 확인해주세요.";
  }

  const { data, error } = await supabase.storage
    .from(projectFileBucket)
    .download(fileRecord.storage_path);

  if (error) throw error;
  return data.text();
}

export async function uploadShowcaseScreenshot(file) {
  if (!file) return { screenshot_path: null, screenshot_url: null };

  if (!isSupabaseReady) {
    return {
      screenshot_path: null,
      screenshot_url: await fileToDataUrl(file),
    };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(showcaseBucket)
    .upload(storagePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from(showcaseBucket).getPublicUrl(storagePath);

  return {
    screenshot_path: storagePath,
    screenshot_url: publicData.publicUrl,
  };
}

export function subscribeWorkspace(onChange) {
  if (!isSupabaseReady) return () => {};

  const channel = supabase.channel("a-and-i-workspace");
  Object.values(tableMap).forEach((table) => {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      () => onChange(),
    );
  });

  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribePresence(userName, onPresence) {
  if (!isSupabaseReady) {
    onPresence([
      { user_name: userName, online_at: new Date().toISOString() },
      { user_name: "서연", online_at: new Date().toISOString() },
      { user_name: "준호", online_at: new Date().toISOString() },
    ]);
    return () => {};
  }

  const key = window.localStorage.getItem("a-and-i-presence-id") ?? crypto.randomUUID();
  window.localStorage.setItem("a-and-i-presence-id", key);

  const channel = supabase.channel("presence:a-and-i", {
    config: { presence: { key } },
  });

  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState();
    onPresence(Object.values(state).flat());
  });

  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track({
        user_name: userName,
        online_at: new Date().toISOString(),
      });
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
}

function isTextLike(fileRecord) {
  const mime = fileRecord.mime_type ?? "";
  const name = fileRecord.original_name ?? "";
  return (
    mime.startsWith("text/") ||
    /\.(js|jsx|ts|tsx|css|html|json|md|txt|sql|py|java|kt|swift|go|rs|php)$/i.test(name)
  );
}

async function readLocalFileContent(file) {
  if (file.type.startsWith("image/")) return fileToDataUrl(file);
  if (file.size > 2_000_000) return "2MB가 넘는 파일은 로컬 데모 모드에서 내용 미리보기를 생략합니다.";
  return file.text();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
