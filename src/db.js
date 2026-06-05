import { emptyData, seedData } from "./data";
import { isSupabaseReady, supabase } from "./supabaseClient";

const localKey = "a-and-i-phase-1-state";
const thumbnailBucket = "thumbnails";
const projectFileBucket = "project-files";
let forceLocalMode = false;

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

function shouldUseSupabase() {
  return isSupabaseReady && !forceLocalMode;
}

function readLocalState() {
  const saved = window.localStorage.getItem(localKey);
  return saved ? withDefaults(JSON.parse(saved)) : seedData;
}

function writeLocalState(nextState) {
  window.localStorage.setItem(localKey, JSON.stringify(withDefaults(nextState)));
}

function withDefaults(state = {}) {
  return Object.fromEntries(
    Object.entries(emptyData).map(([key, value]) => [key, Array.isArray(state[key]) ? state[key] : value]),
  );
}

function shouldFallbackToLocal(error) {
  const message = error?.message || String(error);
  return (
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("ERR_NETWORK") ||
    message.includes("fetch") ||
    message.includes("Supabase schema is not applied") ||
    message.includes("Supabase permission/RLS policy blocked") ||
    message.includes("Supabase storage bucket is missing")
  );
}

function switchToLocalMode(error) {
  if (!shouldFallbackToLocal(error)) return false;
  forceLocalMode = true;
  return true;
}

export async function loadAllData() {
  if (!shouldUseSupabase()) {
    return { data: withDefaults(readLocalState()), source: "local" };
  }

  try {
    let data = await fetchSupabaseData();

    if (isWorkspaceEmpty(data)) {
      await seedSupabaseWorkspace();
      data = await fetchSupabaseData();
    }

    return { data, source: "supabase" };
  } catch (error) {
    if (switchToLocalMode(error)) {
      return { data: withDefaults(readLocalState()), source: "local" };
    }
    throw error;
  }
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

function isWorkspaceEmpty(state) {
  return (
    !state.projects.length &&
    !state.ideas.length &&
    !state.insights.length &&
    !state.announcements.length
  );
}

async function seedSupabaseWorkspace() {
  const projectIds = new Map();
  const versionIds = new Map();

  for (const project of seedData.projects) {
    const { id, ...payload } = project;
    const savedProject = await insertSupabase("projects", payload);
    projectIds.set(id, savedProject.id);
  }

  for (const version of seedData.projectVersions) {
    const { id, project_id, ...payload } = version;
    const savedVersion = await insertSupabase("projectVersions", {
      ...payload,
      project_id: projectIds.get(project_id),
    });
    versionIds.set(id, savedVersion.id);
  }

  for (const file of seedData.projectFiles) {
    const { id: _id, version_id, ...payload } = file;
    await insertSupabase("projectFiles", {
      ...payload,
      version_id: versionIds.get(version_id),
    });
  }

  const commentIds = new Map();
  const commentsByDepth = [...seedData.comments].sort((a, b) => Number(a.depth || 0) - Number(b.depth || 0));

  for (const comment of commentsByDepth) {
    const { id, target_id, parent_id, ...payload } = comment;
    const savedComment = await insertSupabase("comments", {
      ...payload,
      target_id: projectIds.get(target_id) ?? target_id,
      parent_id: parent_id ? commentIds.get(parent_id) ?? null : null,
    });
    commentIds.set(id, savedComment.id);
  }

  for (const collection of ["ideas", "insights", "announcements"]) {
    for (const item of seedData[collection]) {
      const { id: _id, ...payload } = item;
      await insertSupabase(collection, payload);
    }
  }
}

async function insertSupabase(collection, payload) {
  const { data, error } = await supabase.from(tableMap[collection]).insert(payload).select().single();
  if (error) throw formatSupabaseError(error);
  return data;
}

export async function createRecord(collection, payload) {
  if (!tableMap[collection]) throw new Error(`Unknown collection: ${collection}`);

  if (!shouldUseSupabase()) {
    const state = withDefaults(readLocalState());
    const record = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...(collectionsWithUpdatedAt.has(collection) ? { updated_at: new Date().toISOString() } : {}),
      ...payload,
    };

    writeLocalState({
      ...state,
      [collection]: [record, ...(state[collection] ?? [])],
    });

    return record;
  }

  try {
    return await insertSupabase(collection, payload);
  } catch (error) {
    if (switchToLocalMode(error)) return createRecord(collection, payload);
    throw error;
  }
}

export async function updateRecord(collection, id, payload) {
  if (!tableMap[collection]) throw new Error(`Unknown collection: ${collection}`);

  const nextPayload = collectionsWithUpdatedAt.has(collection)
    ? { ...payload, updated_at: payload.updated_at ?? new Date().toISOString() }
    : payload;

  if (!shouldUseSupabase()) {
    const state = withDefaults(readLocalState());
    const nextItems = state[collection].map((item) => (item.id === id ? { ...item, ...nextPayload } : item));

    writeLocalState({
      ...state,
      [collection]: nextItems,
    });

    return nextItems.find((item) => item.id === id);
  }

  try {
    const { data, error } = await supabase
      .from(tableMap[collection])
      .update(nextPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw formatSupabaseError(error);
    return data;
  } catch (error) {
    if (switchToLocalMode(error)) return updateRecord(collection, id, payload);
    throw error;
  }
}

export async function deleteRecord(collection, id) {
  if (!tableMap[collection]) throw new Error(`Unknown collection: ${collection}`);

  if (!shouldUseSupabase()) {
    const state = withDefaults(readLocalState());
    writeLocalState({
      ...state,
      [collection]: state[collection].filter((item) => item.id !== id),
    });
    return;
  }

  try {
    const { error } = await supabase.from(tableMap[collection]).delete().eq("id", id);
    if (error) throw formatSupabaseError(error);
  } catch (error) {
    if (switchToLocalMode(error)) return deleteRecord(collection, id);
    throw error;
  }
}

export async function deleteProjectBundle(projectId) {
  if (!shouldUseSupabase()) {
    const state = withDefaults(readLocalState());
    const versionIds = state.projectVersions
      .filter((version) => version.project_id === projectId)
      .map((version) => version.id);

    writeLocalState({
      ...state,
      projects: state.projects.filter((project) => project.id !== projectId),
      projectVersions: state.projectVersions.filter((version) => version.project_id !== projectId),
      projectFiles: state.projectFiles.filter((file) => !versionIds.includes(file.version_id)),
      comments: state.comments.filter((comment) => comment.target_id !== projectId),
    });
    return;
  }

  const { error } = await supabase
    .from(tableMap.comments)
    .delete()
    .eq("target_type", "project")
    .eq("target_id", projectId);
  if (error) throw formatSupabaseError(error);

  await deleteRecord("projects", projectId);
}

export async function deleteCommunityPostBundle(postId) {
  if (!shouldUseSupabase()) {
    const state = withDefaults(readLocalState());
    writeLocalState({
      ...state,
      communityPosts: state.communityPosts.filter((post) => post.id !== postId),
      comments: state.comments.filter(
        (comment) => !(comment.target_type === "community" && comment.target_id === postId),
      ),
    });
    return;
  }

  try {
    const { error } = await supabase
      .from(tableMap.comments)
      .delete()
      .eq("target_type", "community")
      .eq("target_id", postId);
    if (error) throw formatSupabaseError(error);

    await deleteRecord("communityPosts", postId);
  } catch (error) {
    if (switchToLocalMode(error)) return deleteCommunityPostBundle(postId);
    throw error;
  }
}

export async function deleteContentBundle(collection, targetType, itemId) {
  if (!tableMap[collection]) throw new Error(`Unknown collection: ${collection}`);

  if (!shouldUseSupabase()) {
    const state = withDefaults(readLocalState());
    writeLocalState({
      ...state,
      [collection]: state[collection].filter((item) => item.id !== itemId),
      comments: state.comments.filter(
        (comment) => !(comment.target_type === targetType && comment.target_id === itemId),
      ),
    });
    return;
  }

  try {
    const { error } = await supabase
      .from(tableMap.comments)
      .delete()
      .eq("target_type", targetType)
      .eq("target_id", itemId);
    if (error) throw formatSupabaseError(error);

    await deleteRecord(collection, itemId);
  } catch (error) {
    if (switchToLocalMode(error)) return deleteContentBundle(collection, targetType, itemId);
    throw error;
  }
}

export function subscribeToChatMessages(onInsert) {
  if (!shouldUseSupabase()) return null;

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

  if (!shouldUseSupabase()) return fileToDataUrl(file);

  try {
    const storagePath = `${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(thumbnailBucket).upload(storagePath, file, { upsert: false });
    if (error) throw formatSupabaseError(error);
    const { data } = supabase.storage.from(thumbnailBucket).getPublicUrl(storagePath);
    return data.publicUrl;
  } catch (error) {
    if (switchToLocalMode(error)) return uploadThumbnail(file);
    throw error;
  }
}

export async function uploadProjectFile({ file, versionId }) {
  const payload = {
    version_id: versionId,
    file_name: file.name,
    file_size: file.size,
  };

  if (!shouldUseSupabase()) {
    return createRecord("projectFiles", {
      ...payload,
      file_url: await fileToDataUrl(file),
    });
  }

  try {
    const storagePath = `${versionId}/${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(projectFileBucket).upload(storagePath, file, { upsert: false });
    if (error) throw formatSupabaseError(error);
    const { data } = supabase.storage.from(projectFileBucket).getPublicUrl(storagePath);

    return createRecord("projectFiles", {
      ...payload,
      file_url: data.publicUrl,
    });
  } catch (error) {
    if (switchToLocalMode(error)) return uploadProjectFile({ file, versionId });
    throw error;
  }
}

export async function getProjectFileBlob(fileRecord) {
  if (!fileRecord?.file_url) {
    return new Blob([""], { type: "application/octet-stream" });
  }

  const response = await fetch(fileRecord.file_url);
  return response.blob();
}

function safeFileName(name = "file") {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-") || "file";
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

  if (message.includes("Bucket not found")) {
    return new Error(
      `Supabase storage bucket is missing. Run supabase/schema.sql in the Supabase SQL Editor. Original error: ${message}`,
    );
  }

  return error;
}
