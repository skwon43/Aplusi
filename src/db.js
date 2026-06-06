import { emptyData } from "./data";
import { isSupabaseReady, supabase } from "./supabaseClient";

const thumbnailBucket = "thumbnails";
const projectFileBucket = "project-files";

export const MAX_PROJECT_FILE_SIZE = 50 * 1024 * 1024;
const PROJECT_UPLOAD_TIMEOUT_MS = 180000;

export const tableMap = {
  projects: "projects",
  projectVersions: "project_versions",
  projectFiles: "project_files",
  comments: "comments",
  communityPosts: "community_posts",
  chatMessages: "chat_messages",
  ideas: "ideas",
  insights: "insights",
  announcements: "announcements",
};

const collectionsWithUpdatedAt = new Set(["projects", "communityPosts", "ideas", "insights", "announcements"]);

function withDefaults(state = {}) {
  return Object.fromEntries(
    Object.entries(emptyData).map(([key, value]) => [key, Array.isArray(state[key]) ? state[key] : value]),
  );
}

function ensureSupabaseReady() {
  if (isSupabaseReady && supabase) return;
  throw new Error(
    "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.",
  );
}

export async function loadAllData() {
  ensureSupabaseReady();
  return { data: await fetchSupabaseData(), source: "supabase" };
}

async function fetchSupabaseData() {
  const entries = await Promise.all(
    Object.entries(tableMap).map(async ([key, table]) => {
      const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });

      if (error) throw formatSupabaseError(error);
      return [key, data ?? []];
    }),
  );

  return normalizeWorkspace(withDefaults(Object.fromEntries(entries)));
}

function normalizeWorkspace(state) {
  return {
    ...state,
    projects: state.projects.map((project) => ({
      ...project,
      builder_name: project.builder_name || project.owner_name || "A&I Builder",
      thumbnail_url: project.thumbnail_url || project.image_url || null,
      demo_url: project.demo_url || "",
      github_url: project.github_url || "",
    })),
    projectFiles: state.projectFiles.map((file) => ({
      ...file,
      version_id: file.version_id || file.project_version_id || file.projectVersionId || null,
      file_size: Number(file.file_size ?? file.size_bytes ?? 0),
      file_url: file.file_url || file.public_url || file.external_url || "",
      file_name: file.file_name || file.original_name || "download",
    })),
    insights: state.insights.map((item) => ({
      ...item,
      source_url: item.source_url || "",
    })),
  };
}

async function insertSupabase(collection, payload) {
  ensureSupabaseReady();
  const { data, error } = await supabase.from(tableMap[collection]).insert(payload).select().single();
  if (error) throw formatSupabaseError(error);
  return data;
}

export async function createRecord(collection, payload) {
  if (!tableMap[collection]) throw new Error(`Unknown collection: ${collection}`);
  return insertSupabase(collection, payload);
}

export async function updateRecord(collection, id, payload) {
  if (!tableMap[collection]) throw new Error(`Unknown collection: ${collection}`);

  const nextPayload = collectionsWithUpdatedAt.has(collection)
    ? { ...payload, updated_at: payload.updated_at ?? new Date().toISOString() }
    : payload;

  ensureSupabaseReady();
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
  if (!tableMap[collection]) throw new Error(`Unknown collection: ${collection}`);

  ensureSupabaseReady();
  const { error } = await supabase.from(tableMap[collection]).delete().eq("id", id);
  if (error) throw formatSupabaseError(error);
}

export async function deleteProjectBundle(projectId) {
  ensureSupabaseReady();
  const { error } = await supabase
    .from(tableMap.comments)
    .delete()
    .eq("target_type", "project")
    .eq("target_id", projectId);
  if (error) throw formatSupabaseError(error);

  await deleteRecord("projects", projectId);
}

export async function deleteCommunityPostBundle(postId) {
  ensureSupabaseReady();
  const { error } = await supabase
    .from(tableMap.comments)
    .delete()
    .eq("target_type", "community")
    .eq("target_id", postId);
  if (error) throw formatSupabaseError(error);

  await deleteRecord("communityPosts", postId);
}

export async function deleteContentBundle(collection, targetType, itemId) {
  if (!tableMap[collection]) throw new Error(`Unknown collection: ${collection}`);

  ensureSupabaseReady();
  const { error } = await supabase
    .from(tableMap.comments)
    .delete()
    .eq("target_type", targetType)
    .eq("target_id", itemId);
  if (error) throw formatSupabaseError(error);

  await deleteRecord(collection, itemId);
}

export function subscribeToChatMessages(onInsert) {
  if (!isSupabaseReady || !supabase) return null;

  const channel = supabase
    .channel("a-and-i-chat-messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: tableMap.chatMessages },
      (payload) => {
        if (payload.new) onInsert(payload.new);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function uploadThumbnail(file) {
  if (!file) return null;
  if (!file.type?.startsWith("image/")) {
    throw new Error("썸네일은 이미지 파일만 사용할 수 있습니다.");
  }

  ensureSupabaseReady();
  const storagePath = `${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await withTimeout(
    supabase.storage.from(thumbnailBucket).upload(storagePath, file, {
      contentType: file.type || "image/png",
      upsert: false,
    }),
    `${file.name || "썸네일"} 업로드`,
    PROJECT_UPLOAD_TIMEOUT_MS,
  );
  if (error) throw formatSupabaseError(error);
  const { data } = supabase.storage.from(thumbnailBucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function uploadProjectFile({ file, versionId }) {
  if (!versionId) throw new Error("파일을 저장할 버전 정보가 없습니다.");
  validateProjectFile(file);

  const fileName = file.name || "download";
  const fileSize = Number(file.size ?? 0);
  const payload = {
    version_id: versionId,
    version_group: versionId,
    file_name: fileName,
    original_name: fileName,
    file_size: fileSize,
    size_bytes: fileSize,
  };

  ensureSupabaseReady();
  const storagePath = `${versionId}/${Date.now()}-${safeFileName(fileName)}`;
  const { error } = await withTimeout(
    supabase.storage.from(projectFileBucket).upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    }),
    `${fileName} 업로드`,
    PROJECT_UPLOAD_TIMEOUT_MS,
  );
  if (error) throw formatSupabaseError(error);
  const { data } = supabase.storage.from(projectFileBucket).getPublicUrl(storagePath);

  return createRecord("projectFiles", {
    ...payload,
    file_url: data.publicUrl,
  });
}

export async function getProjectFileBlob(fileRecord) {
  if (!fileRecord?.file_url) {
    return new Blob([""], { type: "application/octet-stream" });
  }

  const response = await withTimeout(
    fetch(fileRecord.file_url),
    `${fileRecord.file_name || "파일"} 다운로드`,
    PROJECT_UPLOAD_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new Error(`파일 다운로드에 실패했습니다. HTTP ${response.status}`);
  }
  return response.blob();
}

export function validateProjectFile(file) {
  if (!file) throw new Error("업로드할 파일을 선택해 주세요.");
  if (Number(file.size || 0) > MAX_PROJECT_FILE_SIZE) {
    throw new Error(`파일 크기는 50MB 이하만 업로드할 수 있습니다. (${file.name || "파일"})`);
  }
}

function withTimeout(promise, label, ms) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      reject(new Error(`${label} 시간이 너무 오래 걸립니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => globalThis.clearTimeout(timeoutId));
}

function safeFileName(name = "file") {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-") || "file";
}

function formatSupabaseError(error) {
  const message = error?.message || String(error);
  const code = error?.code || "";

  if (error?.name === "AbortError" || error?.name === "TimeoutError" || message.includes("aborted")) {
    return new Error("Supabase request timed out. Check network access, Supabase project status, and storage policies.");
  }

  if (message.includes("fetch failed")) {
    return new Error(`Supabase network request failed. Original error: ${message}`);
  }

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

  if (message.includes("Bucket not found")) {
    return new Error(
      `Supabase storage bucket is missing. Run supabase/schema.sql in the Supabase SQL Editor. Original error: ${message}`,
    );
  }

  return error;
}
