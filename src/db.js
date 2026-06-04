import { emptyData, seedData } from "./data";
import { isSupabaseReady, supabase } from "./supabaseClient";

const localKey = "a-and-i-collaboration-state";
const projectFileBucket = "project-files";
const showcaseBucket = "showcase-screenshots";
const collectionsWithUpdatedAt = new Set([
  "projects",
  "projectFolders",
  "projectFiles",
  "projectFeedback",
  "fileComments",
  "projectUpdates",
]);

export const tableMap = {
  projects: "projects",
  projectFolders: "project_folders",
  projectFiles: "project_files",
  projectFeedback: "project_feedback",
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

const codeExtensions = new Set([
  "c",
  "cpp",
  "css",
  "html",
  "java",
  "js",
  "json",
  "jsx",
  "md",
  "py",
  "sql",
  "ts",
  "tsx",
  "txt",
]);

const documentExtensions = new Set(["doc", "docx", "pdf", "ppt", "pptx"]);
const archiveExtensions = new Set(["7z", "rar", "tar", "gz", "zip"]);

export function getSaveTarget(collection) {
  if (!isSupabaseReady) return `localStorage: ${localKey} > ${collection}`;

  const storageByCollection = {
    projectFiles: " + Storage bucket: project-files",
    showcases: " + Storage bucket: showcase-screenshots",
  };

  return `Supabase table: public.${tableMap[collection]}${
    storageByCollection[collection] || ""
  }`;
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

      if (error) throw formatSupabaseError(error);
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

  if (error) throw formatSupabaseError(error);
  return data;
}

export async function updateRecord(collection, id, payload) {
  const nextPayload = collectionsWithUpdatedAt.has(collection)
    ? {
        ...payload,
        updated_at: payload.updated_at ?? new Date().toISOString(),
      }
    : payload;

  if (!isSupabaseReady) {
    const state = withDefaults(readLocalState());
    const nextItems = state[collection].map((item) =>
      item.id === id ? { ...item, ...nextPayload } : item,
    );

    writeLocalState({
      ...state,
      [collection]: nextItems,
    });

    return nextItems.find((item) => item.id === id);
  }

  const { data, error } = await supabase
    .from(tableMap[collection])
    .update(nextPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw formatSupabaseError(error);
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
  if (error) throw formatSupabaseError(error);
}

export async function deleteProjectBundle(projectId) {
  if (!isSupabaseReady) {
    const state = withDefaults(readLocalState());

    writeLocalState({
      ...state,
      projects: state.projects.filter((project) => project.id !== projectId),
      projectFolders: state.projectFolders.filter((folder) => folder.project_id !== projectId),
      projectFiles: state.projectFiles.filter((file) => file.project_id !== projectId),
      projectFeedback: state.projectFeedback.filter((feedback) => feedback.project_id !== projectId),
      projectComments: state.projectComments.filter((comment) => comment.project_id !== projectId),
      fileComments: state.fileComments.filter((comment) => comment.project_id !== projectId),
      projectUpdates: state.projectUpdates.filter((update) => update.project_id !== projectId),
      chatMessages: state.chatMessages.filter((message) => message.project_id !== projectId),
      activityLogs: state.activityLogs.filter((log) => log.project_id !== projectId),
    });

    return;
  }

  await deleteRecord("projects", projectId);
}

export async function uploadProjectFile({
  actorName,
  file,
  folderPath = "",
  projectId,
  relativePath = "",
  versionNumber,
}) {
  const resourceType = getFileResourceType(file.name, file.type);
  const normalizedFolder = normalizeFolderPath(folderPath);
  const basePayload = {
    project_id: projectId,
    folder_path: normalizedFolder,
    resource_type: resourceType,
    original_name: file.name,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    version_group: `${normalizedFolder}/${file.name}`,
    version_number: versionNumber,
    created_by: actorName,
    download_count: 0,
  };

  if (!isSupabaseReady) {
    const isText = isPreviewableTextFile({ original_name: file.name, mime_type: file.type, resource_type: resourceType });
    const content = isText ? await file.text() : "";
    const publicUrl = isText ? null : await fileToDataUrl(file);

    return createRecord("projectFiles", {
      ...basePayload,
      storage_path: null,
      public_url: publicUrl,
      external_url: null,
      relative_path: relativePath,
      content,
    });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${projectId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(projectFileBucket)
    .upload(storagePath, file, { upsert: false });

  if (uploadError) throw formatSupabaseError(uploadError);

  const { data } = supabase.storage.from(projectFileBucket).getPublicUrl(storagePath);

  return createRecord("projectFiles", {
    ...basePayload,
    storage_path: storagePath,
    public_url: data.publicUrl,
    external_url: null,
    relative_path: relativePath,
    content: "",
  });
}

export async function createProjectLink({ actorName, folderPath = "", projectId, title, url }) {
  return createRecord("projectFiles", {
    project_id: projectId,
    folder_path: normalizeFolderPath(folderPath),
    resource_type: "link",
    original_name: title,
    file_name: title,
    mime_type: "text/uri-list",
    size_bytes: 0,
    storage_path: null,
    public_url: null,
    external_url: url,
    version_group: `${normalizeFolderPath(folderPath)}/${title}`,
    version_number: 1,
    created_by: actorName,
    download_count: 0,
    content: "",
  });
}

export async function getProjectFileContent(fileRecord) {
  if (!fileRecord) return "";
  if (fileRecord.resource_type === "link") return fileRecord.external_url ?? "";
  if (fileRecord.resource_type === "image") return fileRecord.public_url ?? "";
  if (!isPreviewableTextFile(fileRecord)) return "";
  if (!isSupabaseReady) return fileRecord.content || "";

  const { data, error } = await supabase.storage
    .from(projectFileBucket)
    .download(fileRecord.storage_path);

  if (error) throw formatSupabaseError(error);
  return data.text();
}

export async function getProjectFileBlob(fileRecord) {
  if (!fileRecord) return new Blob([""], { type: "text/plain" });

  if (fileRecord.resource_type === "link") {
    return new Blob([`[InternetShortcut]\nURL=${fileRecord.external_url || ""}\n`], {
      type: "text/plain",
    });
  }

  if (!isSupabaseReady) {
    if (fileRecord.content) {
      return new Blob([fileRecord.content], {
        type: fileRecord.mime_type || "text/plain",
      });
    }

    if (fileRecord.public_url) {
      return fetch(fileRecord.public_url).then((response) => response.blob());
    }

    return new Blob([""], { type: fileRecord.mime_type || "application/octet-stream" });
  }

  if (fileRecord.storage_path) {
    const { data, error } = await supabase.storage
      .from(projectFileBucket)
      .download(fileRecord.storage_path);

    if (error) throw formatSupabaseError(error);
    return data;
  }

  if (fileRecord.public_url) {
    return fetch(fileRecord.public_url).then((response) => response.blob());
  }

  return new Blob([""], { type: fileRecord.mime_type || "application/octet-stream" });
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

  if (uploadError) throw formatSupabaseError(uploadError);

  const { data } = supabase.storage.from(showcaseBucket).getPublicUrl(storagePath);

  return {
    screenshot_path: storagePath,
    screenshot_url: data.publicUrl,
  };
}

export function subscribeWorkspace(onChange) {
  if (!isSupabaseReady) return () => {};

  const channel = supabase.channel("a-and-i-workspace");

  Object.values(tableMap).forEach((table) => {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  });

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribePresence(userName, context, onPresence) {
  const presencePayload = {
    user_name: userName,
    project_id: context?.projectId ?? null,
    file_id: context?.fileId ?? null,
    online_at: new Date().toISOString(),
  };

  if (!isSupabaseReady) {
    onPresence([
      presencePayload,
      { user_name: "Mina", project_id: context?.projectId ?? null, file_id: context?.fileId ?? null },
      { user_name: "Joon", project_id: context?.projectId ?? null, file_id: null },
    ]);
    return () => {};
  }

  const key =
    window.localStorage.getItem("a-and-i-presence-id") ?? crypto.randomUUID();
  window.localStorage.setItem("a-and-i-presence-id", key);

  const channel = supabase.channel("presence:a-and-i", {
    config: { presence: { key } },
  });

  channel.on("presence", { event: "sync" }, () => {
    onPresence(Object.values(channel.presenceState()).flat());
  });

  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track(presencePayload);
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
}

export function getFileExtension(name = "") {
  return name.split(".").pop()?.toLowerCase() || "";
}

export function getFileResourceType(fileName = "", mimeType = "") {
  const extension = getFileExtension(fileName);
  if (mimeType.startsWith("image/")) return "image";
  if (archiveExtensions.has(extension)) return "archive";
  if (documentExtensions.has(extension)) return "document";
  if (codeExtensions.has(extension) || mimeType.startsWith("text/")) return "code";
  return "file";
}

export function isPreviewableTextFile(fileRecord) {
  if (!fileRecord) return false;
  const extension = getFileExtension(fileRecord.original_name);
  return (
    fileRecord.resource_type === "code" ||
    codeExtensions.has(extension) ||
    fileRecord.mime_type?.startsWith("text/")
  );
}

export function normalizeFolderPath(path = "") {
  return path
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatSupabaseError(error) {
  const message = error?.message || String(error);
  const code = error?.code || "";

  if (code === "PGRST204" || code === "PGRST205" || message.includes("schema cache")) {
    return new Error(
      `Supabase schema is not applied yet. Run supabase/schema.sql in the Supabase SQL Editor. Original error: ${message}`,
    );
  }

  if (message.includes("row-level security") || code === "42501") {
    return new Error(
      `Supabase permission/RLS policy blocked this save. Run supabase/schema.sql again. Original error: ${message}`,
    );
  }

  return error;
}
