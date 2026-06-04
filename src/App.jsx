import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clipboard,
  Copy,
  Database,
  Download,
  Edit3,
  FileArchive,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GalleryHorizontalEnd,
  GitFork,
  HardDrive,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  Plus,
  Radio,
  Save,
  Send,
  Share2,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import {
  createProjectLink,
  createRecord,
  deleteProjectBundle,
  deleteRecord,
  getFileExtension,
  getProjectFileBlob,
  getProjectFileContent,
  getSaveTarget,
  isPreviewableTextFile,
  loadAllData,
  normalizeFolderPath,
  subscribePresence,
  subscribeWorkspace,
  updateRecord,
  uploadProjectFile,
  uploadShowcaseScreenshot,
} from "./db";
import { emptyData } from "./data";
import { isSupabaseReady } from "./supabaseClient";
import { createZipBlob } from "./zip";
import "./App.css";

const defaultUserName = "익명 메이커";

const blankProject = {
  title: "",
  category: "웹앱",
  description: "",
  collaborators: "",
  tags: "",
  visibility: "public",
};

const blankLink = {
  title: "",
  url: "",
};

const blankUpdate = {
  title: "",
  body: "",
};

const blankIdea = {
  title: "",
  category: "아이디어",
  body: "",
};

const blankShowcase = {
  project_id: "",
  title: "",
  description: "",
  demo_url: "",
  screenshot: null,
};

const projectTabs = [
  { id: "files", label: "파일", icon: FileCode2 },
  { id: "feedback", label: "피드백", icon: MessageCircle },
  { id: "updates", label: "업데이트", icon: Clipboard },
  { id: "chat", label: "채팅", icon: Send },
  { id: "activity", label: "타임라인", icon: Radio },
];

function App() {
  const [view, setView] = useState("projects");
  const [data, setData] = useState(null);
  const [dataSource, setDataSource] = useState("local");
  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem("a-and-i-user-name") || defaultUserName,
  );
  const [presence, setPresence] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState("저장 준비가 끝났습니다.");
  const [lastSave, setLastSave] = useState("아직 저장된 작업이 없습니다.");
  const [categoryFilter, setCategoryFilter] = useState("전체");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedFileId, setSelectedFileId] = useState("");
  const [projectTab, setProjectTab] = useState("files");
  const [currentFolder, setCurrentFolder] = useState("");
  const [filePreview, setFilePreview] = useState("");
  const [projectEditOpen, setProjectEditOpen] = useState(false);
  const [fileEditOpen, setFileEditOpen] = useState(false);
  const [initialRouteApplied, setInitialRouteApplied] = useState(false);
  const [forms, setForms] = useState({
    project: blankProject,
    projectEdit: blankProject,
    fileEdit: { original_name: "", folder_path: "" },
    folder: { name: "" },
    link: blankLink,
    update: blankUpdate,
    idea: blankIdea,
    showcase: blankShowcase,
  });
  const [drafts, setDrafts] = useState({
    chat: "",
    fileComment: "",
    fileLineNumber: "",
    projectFeedback: "",
    projectFeedbackType: "suggestion",
  });

  const refresh = useCallback(async () => {
    const result = await loadAllData();
    setData(result.data);
    setDataSource(result.source);
    return result.data;
  }, []);

  useEffect(() => {
    refresh().catch((error) => {
      setNotice(`불러오기 실패: ${error.message}`);
      setData(emptyData);
    });
  }, [refresh]);

  useEffect(() => {
    return subscribeWorkspace(() => {
      refresh().catch((error) => setNotice(`실시간 동기화 실패: ${error.message}`));
    });
  }, [refresh]);

  const selectedProject = useMemo(() => {
    if (!data || !selectedProjectId) return null;
    return data.projects.find((project) => project.id === selectedProjectId) || null;
  }, [data, selectedProjectId]);

  const projectFiles = useMemo(() => {
    if (!data || !selectedProject) return [];
    return data.projectFiles
      .filter((file) => file.project_id === selectedProject.id)
      .sort((a, b) => {
        const folderDiff = (a.folder_path || "").localeCompare(b.folder_path || "");
        if (folderDiff !== 0) return folderDiff;
        return (a.original_name || "").localeCompare(b.original_name || "");
      });
  }, [data, selectedProject]);

  const projectFolders = useMemo(() => {
    if (!data || !selectedProject) return [];
    return data.projectFolders.filter((folder) => folder.project_id === selectedProject.id);
  }, [data, selectedProject]);

  const folderNodes = useMemo(() => buildFolderNodes(projectFolders, projectFiles), [projectFolders, projectFiles]);

  const currentFolders = useMemo(
    () => folderNodes.filter((folder) => folder.parentPath === currentFolder),
    [currentFolder, folderNodes],
  );

  const currentFiles = useMemo(
    () => projectFiles.filter((file) => normalizeFolderPath(file.folder_path || "") === currentFolder),
    [currentFolder, projectFiles],
  );

  const selectedFile = useMemo(() => {
    if (!projectFiles.length) return null;
    return projectFiles.find((file) => file.id === selectedFileId) || currentFiles[0] || projectFiles[0];
  }, [currentFiles, projectFiles, selectedFileId]);

  useEffect(() => {
    const safeName = currentUser.trim() || defaultUserName;
    localStorage.setItem("a-and-i-user-name", safeName);

    return subscribePresence(
      safeName,
      {
        projectId: selectedProjectId || null,
        fileId: selectedFile?.id || null,
      },
      setPresence,
    );
  }, [currentUser, selectedFile?.id, selectedProjectId]);

  const categories = useMemo(() => {
    if (!data) return ["전체"];
    return ["전체", ...new Set(data.projects.map((project) => project.category || "기타"))];
  }, [data]);

  const visibleProjects = useMemo(() => {
    if (!data) return [];
    if (categoryFilter === "전체") return data.projects;
    return data.projects.filter((project) => project.category === categoryFilter);
  }, [data, categoryFilter]);

  const projectPresence = useMemo(() => {
    if (!selectedProject) return [];
    return uniquePresence(presence.filter((user) => user.project_id === selectedProject.id));
  }, [presence, selectedProject]);

  const filePresence = useMemo(() => {
    if (!selectedFile) return [];
    return uniquePresence(presence.filter((user) => user.file_id === selectedFile.id));
  }, [presence, selectedFile]);

  useEffect(() => {
    if (!data || initialRouteApplied) return;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const projectId = params.get("project");
    const fileId = params.get("file");
    const folderPath = normalizeFolderPath(params.get("folder") || "");
    const project = data.projects.find((item) => item.id === projectId);

    if (project) {
      setSelectedProjectId(project.id);
      setSelectedFileId(fileId || "");
      setCurrentFolder(folderPath);
      setProjectTab("files");
      setView("project-detail");
      setForms((current) => ({
        ...current,
        projectEdit: projectToForm(project),
      }));
    }

    setInitialRouteApplied(true);
  }, [data, initialRouteApplied]);

  useEffect(() => {
    if (view !== "project-detail" || !selectedProjectId) return;

    const params = new URLSearchParams();
    params.set("project", selectedProjectId);
    if (selectedFile?.id) params.set("file", selectedFile.id);
    if (currentFolder) params.set("folder", currentFolder);

    const nextHash = params.toString();
    if (window.location.hash.replace(/^#/, "") !== nextHash) {
      window.history.replaceState(null, "", `#${nextHash}`);
    }
  }, [currentFolder, selectedFile?.id, selectedProjectId, view]);

  useEffect(() => {
    if (!selectedFile) {
      setFilePreview("");
      return;
    }

    getProjectFileContent(selectedFile)
      .then(setFilePreview)
      .catch((error) => setFilePreview(`파일을 불러오지 못했습니다. ${error.message}`));

    setForms((current) => ({
      ...current,
      fileEdit: {
        original_name: selectedFile.original_name || "",
        folder_path: selectedFile.folder_path || "",
      },
    }));
  }, [selectedFile]);

  if (!data) {
    return (
      <main className="loading-screen">
        <Loader2 className="spin" />
        <span>A&I를 불러오는 중입니다.</span>
      </main>
    );
  }

  async function runTask(collection, task, successMessage = "저장되었습니다.") {
    setIsBusy(true);
    try {
      const result = await task();
      const nextData = await refresh();
      setNotice(successMessage);
      setLastSave(`${getSaveTarget(collection)} / 현재 ${nextData[collection]?.length ?? 0}개`);
      return result;
    } catch (error) {
      setNotice(`저장 실패: ${error.message}`);
      return null;
    } finally {
      setIsBusy(false);
    }
  }

  async function logActivity(projectId, message, actionType = "activity") {
    await createRecord("activityLogs", {
      project_id: projectId,
      actor_name: currentUser.trim() || defaultUserName,
      action_type: actionType,
      message,
    });
  }

  function updateForm(group, field, value) {
    setForms((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [field]: value,
      },
    }));
  }

  function resetForm(group, value) {
    setForms((current) => ({
      ...current,
      [group]: value,
    }));
  }

  function setDraft(key, value) {
    setDrafts((current) => ({ ...current, [key]: value }));
  }

  function clearRoute() {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  function openProject(projectId, options = {}) {
    const project = data?.projects.find((item) => item.id === projectId);
    setSelectedProjectId(projectId);
    setSelectedFileId(options.fileId || "");
    setCurrentFolder(options.folderPath || "");
    setProjectTab("files");
    setProjectEditOpen(false);
    setFileEditOpen(false);
    setView("project-detail");

    if (project) {
      setForms((current) => ({
        ...current,
        projectEdit: projectToForm(project),
      }));
    }
  }

  function goToProjects() {
    clearRoute();
    setSelectedProjectId("");
    setSelectedFileId("");
    setCurrentFolder("");
    setView("projects");
  }

  function createProject() {
    if (!forms.project.title.trim()) return;

    runTask(
      "projects",
      async () => {
        const project = await createRecord("projects", {
          title: forms.project.title.trim(),
          category: forms.project.category.trim() || "기타",
          description: forms.project.description.trim(),
          owner_name: currentUser.trim() || defaultUserName,
          collaborators: parseCsv(forms.project.collaborators),
          tags: parseCsv(forms.project.tags),
          visibility: forms.project.visibility,
          status: "진행 중",
          likes: 0,
          download_count: 0,
          fork_count: 0,
          original_project_id: null,
          fork_author: null,
          forked_at: null,
        });

        await logActivity(project.id, "프로젝트가 생성되었습니다.", "project_created");
        resetForm("project", blankProject);
        openProject(project.id);
      },
      "프로젝트가 생성되었습니다.",
    );
  }

  function startEditProject() {
    if (!selectedProject) return;
    setForms((current) => ({
      ...current,
      projectEdit: projectToForm(selectedProject),
    }));
    setProjectEditOpen(true);
  }

  function saveProjectEdit() {
    if (!selectedProject || !forms.projectEdit.title.trim()) return;

    runTask(
      "projects",
      async () => {
        await updateRecord("projects", selectedProject.id, {
          title: forms.projectEdit.title.trim(),
          category: forms.projectEdit.category.trim() || "기타",
          description: forms.projectEdit.description.trim(),
          collaborators: parseCsv(forms.projectEdit.collaborators),
          tags: parseCsv(forms.projectEdit.tags),
          visibility: forms.projectEdit.visibility,
        });
        await logActivity(selectedProject.id, "프로젝트 정보가 수정되었습니다.", "project_updated");
        setProjectEditOpen(false);
      },
      "프로젝트 정보가 저장되었습니다.",
    );
  }

  function deleteProject() {
    if (!selectedProject) return;
    if (!window.confirm("이 프로젝트와 연결된 파일, 댓글, 채팅을 모두 삭제할까요?")) return;

    runTask(
      "projects",
      async () => {
        await deleteProjectBundle(selectedProject.id);
        goToProjects();
      },
      "프로젝트가 삭제되었습니다.",
    );
  }

  function likeProject() {
    if (!selectedProject) return;

    runTask(
      "projects",
      async () => {
        await updateRecord("projects", selectedProject.id, {
          likes: Number(selectedProject.likes || 0) + 1,
        });
        await logActivity(selectedProject.id, "프로젝트에 좋아요가 추가되었습니다.", "project_liked");
      },
      "좋아요가 저장되었습니다.",
    );
  }

  function forkProject() {
    if (!selectedProject) return;

    runTask(
      "projects",
      async () => {
        const fork = await createRecord("projects", {
          title: `${selectedProject.title} Remix`,
          description: selectedProject.description,
          category: selectedProject.category,
          owner_name: currentUser.trim() || defaultUserName,
          collaborators: [],
          tags: selectedProject.tags || [],
          visibility: "private",
          status: "포크됨",
          likes: 0,
          download_count: 0,
          fork_count: 0,
          original_project_id: selectedProject.id,
          fork_author: currentUser.trim() || defaultUserName,
          forked_at: new Date().toISOString(),
        });

        for (const folder of projectFolders) {
          await createRecord("projectFolders", {
            project_id: fork.id,
            name: folder.name,
            folder_path: folder.folder_path || "",
            created_by: currentUser.trim() || defaultUserName,
          });
        }

        for (const file of projectFiles) {
          await createRecord("projectFiles", {
            ...copyFileRecord(file),
            project_id: fork.id,
            created_by: currentUser.trim() || defaultUserName,
          });
        }

        await updateRecord("projects", selectedProject.id, {
          fork_count: Number(selectedProject.fork_count || 0) + 1,
        });
        await logActivity(selectedProject.id, `${fork.title} 포크가 생성되었습니다.`, "project_forked");
        await logActivity(fork.id, `${selectedProject.title}에서 포크되었습니다.`, "project_forked");
        openProject(fork.id);
      },
      "프로젝트가 포크되었습니다.",
    );
  }

  function createFolder() {
    const folderName = forms.folder.name.trim();
    if (!selectedProject || !folderName) return;

    const fullPath = joinPath(currentFolder, folderName);
    const exists = folderNodes.some((folder) => folder.path === fullPath);
    if (exists) {
      setNotice("이미 같은 이름의 폴더가 있습니다.");
      return;
    }

    runTask(
      "projectFolders",
      async () => {
        await createRecord("projectFolders", {
          project_id: selectedProject.id,
          name: folderName,
          folder_path: currentFolder,
          created_by: currentUser.trim() || defaultUserName,
        });
        resetForm("folder", { name: "" });
        await logActivity(selectedProject.id, `${fullPath} 폴더가 생성되었습니다.`, "folder_created");
      },
      "폴더가 생성되었습니다.",
    );
  }

  function uploadFiles(fileList) {
    if (!selectedProject) return;

    runTask(
      "projectFiles",
      async () => {
        for (const file of Array.from(fileList)) {
          const relativePath = file.webkitRelativePath || file.name;
          const folderPath = deriveUploadFolder(relativePath, currentFolder);
          const versionGroup = `${folderPath}/${file.name}`;
          const versionNumber =
            projectFiles.filter((item) => item.version_group === versionGroup).length + 1;

          const savedFile = await uploadProjectFile({
            projectId: selectedProject.id,
            folderPath,
            relativePath,
            file,
            versionNumber,
            actorName: currentUser.trim() || defaultUserName,
          });

          setSelectedFileId(savedFile.id);
          setCurrentFolder(folderPath);
          await logActivity(
            selectedProject.id,
            `${file.name} 파일이 ${folderPath || "루트"}에 업로드되었습니다.`,
            "file_uploaded",
          );
        }
      },
      "파일이 업로드되었습니다.",
    );
  }

  function addLink() {
    if (!selectedProject || !forms.link.title.trim() || !forms.link.url.trim()) return;

    runTask(
      "projectFiles",
      async () => {
        const link = await createProjectLink({
          projectId: selectedProject.id,
          folderPath: currentFolder,
          title: forms.link.title.trim(),
          url: forms.link.url.trim(),
          actorName: currentUser.trim() || defaultUserName,
        });

        await logActivity(selectedProject.id, `${forms.link.title} 링크가 추가되었습니다.`, "link_added");
        setSelectedFileId(link.id);
        resetForm("link", blankLink);
      },
      "링크가 추가되었습니다.",
    );
  }

  function saveFileEdit() {
    if (!selectedProject || !selectedFile || !forms.fileEdit.original_name.trim()) return;

    const nextFolder = normalizeFolderPath(forms.fileEdit.folder_path);
    const nextName = forms.fileEdit.original_name.trim();

    runTask(
      "projectFiles",
      async () => {
        await updateRecord("projectFiles", selectedFile.id, {
          original_name: nextName,
          file_name: nextName,
          folder_path: nextFolder,
          version_group: `${nextFolder}/${nextName}`,
        });
        await logActivity(
          selectedProject.id,
          `${selectedFile.original_name} 파일이 ${joinPath(nextFolder, nextName)}로 정리되었습니다.`,
          "file_renamed",
        );
        setCurrentFolder(nextFolder);
        setFileEditOpen(false);
      },
      "파일 정보가 저장되었습니다.",
    );
  }

  function deleteFile() {
    if (!selectedProject || !selectedFile) return;
    if (!window.confirm(`${selectedFile.original_name} 파일을 삭제할까요?`)) return;

    runTask(
      "projectFiles",
      async () => {
        await deleteRecord("projectFiles", selectedFile.id);
        await logActivity(selectedProject.id, `${selectedFile.original_name} 파일이 삭제되었습니다.`, "file_deleted");
        setSelectedFileId("");
      },
      "파일이 삭제되었습니다.",
    );
  }

  async function copyFileShareLink() {
    if (!selectedProject || !selectedFile) return;

    const params = new URLSearchParams();
    params.set("project", selectedProject.id);
    params.set("file", selectedFile.id);
    if (selectedFile.folder_path) params.set("folder", selectedFile.folder_path);
    const shareUrl = `${window.location.origin}${window.location.pathname}#${params.toString()}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice("파일 공유 링크를 복사했습니다.");
    } catch {
      setNotice(`공유 링크: ${shareUrl}`);
    }

    logActivity(
      selectedProject.id,
      `${selectedFile.original_name} 파일 공유 링크가 생성되었습니다.`,
      "file_shared",
    )
      .then(refresh)
      .catch(() => {});
  }

  async function downloadFile(file = selectedFile) {
    if (!selectedProject || !file) return;

    setIsBusy(true);
    try {
      const blob = await getProjectFileBlob(file);
      downloadBlob(blob, downloadNameForFile(file));
      await updateRecord("projectFiles", file.id, {
        download_count: Number(file.download_count || 0) + 1,
      });
      await updateRecord("projects", selectedProject.id, {
        download_count: Number(selectedProject.download_count || 0) + 1,
      });
      await logActivity(selectedProject.id, `${file.original_name} 파일이 다운로드되었습니다.`, "file_downloaded");
      await refresh();
      setNotice("파일 다운로드를 시작했습니다.");
    } catch (error) {
      setNotice(`다운로드 실패: ${error.message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function downloadProjectZip() {
    if (!selectedProject) return;

    setIsBusy(true);
    try {
      const entries = [];

      for (const file of projectFiles) {
        const blob = await getProjectFileBlob(file);
        entries.push({
          name: joinPath(file.folder_path || "", downloadNameForFile(file)),
          blob,
          date: file.updated_at || file.created_at || new Date(),
        });
      }

      if (!entries.length) {
        entries.push({
          name: "README.txt",
          blob: new Blob(["이 프로젝트에는 아직 파일이 없습니다."], { type: "text/plain" }),
        });
      }

      const zipBlob = await createZipBlob(entries);
      downloadBlob(zipBlob, `${slugify(selectedProject.title)}.zip`);
      await updateRecord("projects", selectedProject.id, {
        download_count: Number(selectedProject.download_count || 0) + 1,
      });
      await logActivity(selectedProject.id, "프로젝트 ZIP이 다운로드되었습니다.", "project_downloaded");
      await refresh();
      setNotice("프로젝트 ZIP 다운로드를 시작했습니다.");
    } catch (error) {
      setNotice(`프로젝트 다운로드 실패: ${error.message}`);
    } finally {
      setIsBusy(false);
    }
  }

  function addFileComment(parentCommentId = null) {
    const key = parentCommentId ? `fileReply-${parentCommentId}` : "fileComment";
    const body = drafts[key]?.trim();
    const lineNumber = Number(drafts.fileLineNumber);
    const hasLineNumber = Number.isInteger(lineNumber) && lineNumber > 0;

    if (!selectedProject || !selectedFile || !body) return;

    runTask("fileComments", async () => {
      await createRecord("fileComments", {
        project_id: selectedProject.id,
        file_id: selectedFile.id,
        author_name: currentUser.trim() || defaultUserName,
        body,
        line_number: parentCommentId ? null : hasLineNumber ? lineNumber : null,
        parent_comment_id: parentCommentId,
        resolved: false,
      });
      setDraft(key, "");
      if (!parentCommentId) setDraft("fileLineNumber", "");
      await logActivity(
        selectedProject.id,
        `${selectedFile.original_name} 파일에 댓글이 작성되었습니다.`,
        "file_comment",
      );
    });
  }

  function toggleFileComment(comment) {
    if (!selectedProject || !selectedFile) return;

    runTask(
      "fileComments",
      async () => {
        await updateRecord("fileComments", comment.id, {
          resolved: !comment.resolved,
        });
        await logActivity(
          selectedProject.id,
          `${selectedFile.original_name} 파일 댓글을 ${
            comment.resolved ? "다시 열었습니다." : "해결 처리했습니다."
          }`,
          "file_comment_status",
        );
      },
      comment.resolved ? "댓글을 다시 열었습니다." : "댓글을 해결 처리했습니다.",
    );
  }

  function addProjectFeedback(parentFeedbackId = null) {
    const key = parentFeedbackId ? `feedbackReply-${parentFeedbackId}` : "projectFeedback";
    const body = drafts[key]?.trim();
    if (!selectedProject || !body) return;

    runTask("projectFeedback", async () => {
      await createRecord("projectFeedback", {
        project_id: selectedProject.id,
        author_name: currentUser.trim() || defaultUserName,
        feedback_type: parentFeedbackId ? "reply" : drafts.projectFeedbackType || "suggestion",
        body,
        parent_feedback_id: parentFeedbackId,
      });
      setDraft(key, "");
      await logActivity(selectedProject.id, "프로젝트 피드백이 작성되었습니다.", "project_feedback");
    });
  }

  function postUpdate() {
    if (!selectedProject || !forms.update.title.trim()) return;

    runTask("projectUpdates", async () => {
      await createRecord("projectUpdates", {
        project_id: selectedProject.id,
        author_name: currentUser.trim() || defaultUserName,
        title: forms.update.title.trim(),
        body: forms.update.body.trim(),
      });
      await logActivity(selectedProject.id, `${forms.update.title} 업데이트가 게시되었습니다.`, "update");
      resetForm("update", blankUpdate);
    });
  }

  function sendMessage() {
    const body = drafts.chat?.trim();
    if (!selectedProject || !body) return;

    runTask(
      "chatMessages",
      async () => {
        await createRecord("chatMessages", {
          project_id: selectedProject.id,
          author_name: currentUser.trim() || defaultUserName,
          body,
        });
        setDraft("chat", "");
        await logActivity(selectedProject.id, "채팅 메시지가 작성되었습니다.", "chat_message");
      },
      "메시지가 저장되었습니다.",
    );
  }

  function createIdea() {
    if (!forms.idea.title.trim()) return;

    runTask(
      "ideas",
      async () => {
        await createRecord("ideas", {
          title: forms.idea.title.trim(),
          category: forms.idea.category.trim() || "아이디어",
          body: forms.idea.body.trim(),
          author_name: currentUser.trim() || defaultUserName,
          upvotes: 0,
        });
        resetForm("idea", blankIdea);
      },
      "아이디어가 저장되었습니다.",
    );
  }

  function upvoteIdea(idea) {
    runTask(
      "ideas",
      async () => {
        await updateRecord("ideas", idea.id, {
          upvotes: Number(idea.upvotes || 0) + 1,
        });
      },
      "추천이 저장되었습니다.",
    );
  }

  function addIdeaComment(ideaId) {
    const key = `idea-${ideaId}`;
    const body = drafts[key]?.trim();
    if (!body) return;

    runTask("ideaComments", async () => {
      await createRecord("ideaComments", {
        idea_id: ideaId,
        author_name: currentUser.trim() || defaultUserName,
        body,
      });
      setDraft(key, "");
    });
  }

  function publishShowcase() {
    if (!forms.showcase.title.trim()) return;

    runTask(
      "showcases",
      async () => {
        const screenshot = await uploadShowcaseScreenshot(forms.showcase.screenshot);
        await createRecord("showcases", {
          project_id: forms.showcase.project_id || null,
          title: forms.showcase.title.trim(),
          description: forms.showcase.description.trim(),
          demo_url: forms.showcase.demo_url.trim(),
          likes: 0,
          ...screenshot,
        });
        resetForm("showcase", blankShowcase);
      },
      "쇼케이스가 저장되었습니다.",
    );
  }

  function likeShowcase(showcase) {
    runTask(
      "showcases",
      async () => {
        await updateRecord("showcases", showcase.id, {
          likes: Number(showcase.likes || 0) + 1,
        });
      },
      "좋아요가 저장되었습니다.",
    );
  }

  function addShowcaseFeedback(showcaseId) {
    const key = `showcase-${showcaseId}`;
    const body = drafts[key]?.trim();
    if (!body) return;

    runTask("showcaseFeedback", async () => {
      await createRecord("showcaseFeedback", {
        showcase_id: showcaseId,
        author_name: currentUser.trim() || defaultUserName,
        body,
      });
      setDraft(key, "");
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand-button" onClick={goToProjects}>
          <span className="brand-mark">A&I</span>
          <span>
            <strong>A&I</strong>
            <small>AI 메이커 협업 OS</small>
          </span>
        </button>

        <nav className="nav-list">
          <button
            className={view.startsWith("project") ? "nav-item active" : "nav-item"}
            onClick={goToProjects}
          >
            <FileCode2 size={17} />
            프로젝트
          </button>
          <button
            className={view === "ideas" ? "nav-item active" : "nav-item"}
            onClick={() => {
              clearRoute();
              setView("ideas");
            }}
          >
            <Lightbulb size={17} />
            아이디어
          </button>
          <button
            className={view === "showcase" ? "nav-item active" : "nav-item"}
            onClick={() => {
              clearRoute();
              setView("showcase");
            }}
          >
            <GalleryHorizontalEnd size={17} />
            쇼케이스
          </button>
        </nav>

        <div className={notice.includes("Supabase schema") ? "status-card warning" : "status-card"}>
          <p>저장 위치</p>
          <strong>{isSupabaseReady ? "Supabase" : "localStorage"}</strong>
          <span>{notice}</span>
          <code>{lastSave}</code>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>{view === "project-detail" ? selectedProject?.title : "A&I Community"}</h1>
          </div>
          <label className="user-name-field">
            <span>내 이름</span>
            <input value={currentUser} onChange={(event) => setCurrentUser(event.target.value)} />
          </label>
        </header>

        <section className="workspace-status">
          {isSupabaseReady ? <Database size={16} /> : <HardDrive size={16} />}
          <span>{dataSource === "supabase" ? "Supabase 실시간 저장" : "브라우저 localStorage 저장"}</span>
          <strong>{lastSave}</strong>
          <Radio size={16} />
          <span>{presence.length ? uniquePresence(presence).map((user) => user.user_name).join(", ") : "접속자 없음"}</span>
        </section>

        {view === "projects" && renderProjectList()}
        {view === "project-detail" && selectedProject && renderProjectDetail()}
        {view === "ideas" && renderIdeas()}
        {view === "showcase" && renderShowcase()}
      </main>
    </div>
  );

  function renderProjectList() {
    return (
      <div className="page-grid">
        <section className="panel create-panel">
          <PanelTitle title="프로젝트 등록" eyebrow="새 작업실" />
          <div className="form-stack">
            <input
              placeholder="프로젝트 이름"
              value={forms.project.title}
              onChange={(event) => updateForm("project", "title", event.target.value)}
            />
            <input
              placeholder="카테고리 예: 웹앱, 게임, 디자인"
              value={forms.project.category}
              onChange={(event) => updateForm("project", "category", event.target.value)}
            />
            <textarea
              rows="5"
              placeholder="무엇을 만들었고 어떤 협업이 필요한지 적어주세요."
              value={forms.project.description}
              onChange={(event) => updateForm("project", "description", event.target.value)}
            />
            <input
              placeholder="협업자 예: Mina, Joon"
              value={forms.project.collaborators}
              onChange={(event) => updateForm("project", "collaborators", event.target.value)}
            />
            <input
              placeholder="태그 예: React, AI, 학생"
              value={forms.project.tags}
              onChange={(event) => updateForm("project", "tags", event.target.value)}
            />
            <select
              value={forms.project.visibility}
              onChange={(event) => updateForm("project", "visibility", event.target.value)}
            >
              <option value="public">공개 프로젝트</option>
              <option value="private">비공개 프로젝트</option>
            </select>
            <button className="primary-action" disabled={isBusy || !forms.project.title.trim()} onClick={createProject}>
              <Plus size={16} />
              프로젝트 저장
            </button>
          </div>
        </section>

        <section className="panel list-panel">
          <div className="list-header">
            <PanelTitle title="프로젝트" eyebrow={`${data.projects.length}개`} />
            <div className="category-tabs">
              {categories.map((category) => (
                <button
                  className={categoryFilter === category ? "active" : ""}
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="project-card-grid">
            {visibleProjects.map((project) => {
              const files = data.projectFiles.filter((file) => file.project_id === project.id);
              const feedbackCount = data.projectFeedback.filter((feedback) => feedback.project_id === project.id).length;
              const fileCommentCount = data.fileComments.filter((comment) => comment.project_id === project.id).length;

              return (
                <article className="project-card" key={project.id}>
                  <div className="project-card-top">
                    <span>{project.category}</span>
                    <small>{project.visibility === "private" ? "비공개" : "공개"}</small>
                  </div>
                  <strong>{project.title}</strong>
                  <p>{project.description || "아직 설명이 없습니다."}</p>
                  <TagList items={project.tags || []} />
                  <div className="card-meta">
                    <small>{files.length} 파일</small>
                    <small>{feedbackCount + fileCommentCount} 댓글</small>
                    <small>{project.download_count || 0} 다운로드</small>
                    <small>{project.fork_count || 0} 포크</small>
                  </div>
                  <button onClick={() => openProject(project.id)}>작업실 열기</button>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  function renderProjectDetail() {
    const originalProject = selectedProject.original_project_id
      ? data.projects.find((project) => project.id === selectedProject.original_project_id)
      : null;

    return (
      <section className="detail-page">
        <div className="detail-header">
          <button className="ghost-button" onClick={goToProjects}>
            <ArrowLeft size={16} />
            목록
          </button>

          <div>
            <div className="detail-kicker">
              <span>{selectedProject.category}</span>
              <span>{selectedProject.visibility === "private" ? "비공개" : "공개"}</span>
              {originalProject && <span>{originalProject.title}에서 포크됨</span>}
            </div>
            <h2>{selectedProject.title}</h2>
            <p>{selectedProject.description || "프로젝트 설명이 없습니다."}</p>
            <TagList items={selectedProject.tags || []} />
            <div className="owner-row">
              <span>Creator: {selectedProject.owner_name || defaultUserName}</span>
              <span>Collaborators: {(selectedProject.collaborators || []).join(", ") || "없음"}</span>
            </div>
          </div>

          <div className="project-actions">
            <button className="secondary-action" onClick={downloadProjectZip}>
              <Download size={16} />
              프로젝트 ZIP
            </button>
            <button className="secondary-action" onClick={likeProject}>
              <Heart size={16} />
              {selectedProject.likes || 0}
            </button>
            <button className="secondary-action" onClick={forkProject}>
              <GitFork size={16} />
              포크
            </button>
            <button className="secondary-action" onClick={startEditProject}>
              <Edit3 size={16} />
              수정
            </button>
            <button className="danger-action" onClick={deleteProject}>
              <Trash2 size={16} />
              삭제
            </button>
          </div>

          <PresenceStrip title="작업실 접속자" users={projectPresence} />
        </div>

        {projectEditOpen && renderProjectEditPanel()}

        <div className="detail-tabs">
          {projectTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={projectTab === tab.id ? "active" : ""}
                key={tab.id}
                onClick={() => setProjectTab(tab.id)}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {projectTab === "files" && renderFilesTab()}
        {projectTab === "feedback" && renderProjectFeedbackTab()}
        {projectTab === "updates" && renderUpdatesTab()}
        {projectTab === "chat" && renderChatTab()}
        {projectTab === "activity" && renderActivityTab()}
      </section>
    );
  }

  function renderProjectEditPanel() {
    return (
      <section className="panel edit-panel">
        <div className="panel-row-header">
          <PanelTitle title="프로젝트 정보 수정" eyebrow="Metadata" />
          <button className="icon-action" onClick={() => setProjectEditOpen(false)}>
            <X size={16} />
          </button>
        </div>
        <div className="edit-grid">
          <input
            placeholder="프로젝트 이름"
            value={forms.projectEdit.title}
            onChange={(event) => updateForm("projectEdit", "title", event.target.value)}
          />
          <input
            placeholder="카테고리"
            value={forms.projectEdit.category}
            onChange={(event) => updateForm("projectEdit", "category", event.target.value)}
          />
          <input
            placeholder="협업자"
            value={forms.projectEdit.collaborators}
            onChange={(event) => updateForm("projectEdit", "collaborators", event.target.value)}
          />
          <input
            placeholder="태그"
            value={forms.projectEdit.tags}
            onChange={(event) => updateForm("projectEdit", "tags", event.target.value)}
          />
          <select
            value={forms.projectEdit.visibility}
            onChange={(event) => updateForm("projectEdit", "visibility", event.target.value)}
          >
            <option value="public">공개 프로젝트</option>
            <option value="private">비공개 프로젝트</option>
          </select>
          <textarea
            rows="3"
            placeholder="프로젝트 설명"
            value={forms.projectEdit.description}
            onChange={(event) => updateForm("projectEdit", "description", event.target.value)}
          />
        </div>
        <button className="primary-action" onClick={saveProjectEdit}>
          <Save size={16} />
          저장
        </button>
      </section>
    );
  }

  function renderFilesTab() {
    const fileComments = data.fileComments
      .filter((comment) => comment.file_id === selectedFile?.id)
      .sort((a, b) => {
        const lineDiff = Number(a.line_number || 999999) - Number(b.line_number || 999999);
        if (lineDiff !== 0) return lineDiff;
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      });
    const openCommentCount = fileComments.filter((comment) => !comment.resolved && !comment.parent_comment_id).length;
    const versions = selectedFile
      ? projectFiles
          .filter((file) => file.version_group === selectedFile.version_group)
          .sort((a, b) => Number(a.version_number || 0) - Number(b.version_number || 0))
      : [];

    return (
      <div className="drive-workspace">
        <section className="panel file-control-panel">
          <PanelTitle title="업로드" eyebrow="Project Files" />
          <label className="upload-button">
            <UploadCloud size={18} />
            파일 여러 개 업로드
            <input
              multiple
              type="file"
              onChange={(event) => {
                if (event.target.files?.length) uploadFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <label className="upload-button secondary-upload">
            <FolderOpen size={18} />
            프로젝트 폴더 업로드
            <input
              directory=""
              multiple
              type="file"
              webkitdirectory=""
              onChange={(event) => {
                if (event.target.files?.length) uploadFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>

          <div className="folder-create">
            <input
              placeholder="새 폴더 이름"
              value={forms.folder.name}
              onChange={(event) => updateForm("folder", "name", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") createFolder();
              }}
            />
            <button onClick={createFolder}>
              <FolderPlus size={16} />
            </button>
          </div>

          <div className="link-form">
            <input
              placeholder="링크 이름"
              value={forms.link.title}
              onChange={(event) => updateForm("link", "title", event.target.value)}
            />
            <input
              placeholder="https://"
              value={forms.link.url}
              onChange={(event) => updateForm("link", "url", event.target.value)}
            />
            <button disabled={!forms.link.title.trim() || !forms.link.url.trim()} onClick={addLink}>
              <LinkIcon size={16} />
              링크 저장
            </button>
          </div>
        </section>

        <section className="panel browser-panel">
          <div className="panel-row-header">
            <PanelTitle title="폴더 구조" eyebrow={currentFolder || "Root"} />
            <button className="secondary-action" onClick={downloadProjectZip}>
              <Download size={16} />
              ZIP
            </button>
          </div>
          <Breadcrumb path={currentFolder} onMove={setCurrentFolder} />

          <div className="folder-grid">
            {currentFolders.map((folder) => (
              <button className="folder-tile" key={folder.path} onClick={() => setCurrentFolder(folder.path)}>
                <Folder size={17} />
                <span>{folder.name}</span>
              </button>
            ))}
          </div>

          <div className="file-list">
            {currentFiles.map((file) => {
              const totalComments = data.fileComments.filter((comment) => comment.file_id === file.id).length;
              const unresolvedComments = data.fileComments.filter(
                (comment) => comment.file_id === file.id && !comment.resolved && !comment.parent_comment_id,
              ).length;
              const Icon = iconForFile(file);

              return (
                <button
                  className={selectedFile?.id === file.id ? "active" : ""}
                  key={file.id}
                  onClick={() => {
                    setSelectedFileId(file.id);
                    setDraft("fileLineNumber", "");
                  }}
                >
                  <Icon size={16} />
                  <span>
                    <strong>{file.original_name}</strong>
                    <small>
                      {resourceLabel(file)} · 댓글 {totalComments}
                      {unresolvedComments ? ` · 미해결 ${unresolvedComments}` : ""} · 다운로드 {file.download_count || 0}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel file-preview-panel">
          <div className="file-panel-header">
            <PanelTitle
              title={selectedFile?.original_name || "파일 미리보기"}
              eyebrow={selectedFile ? `${openCommentCount}개 미해결 댓글` : "선택 필요"}
            />
            {selectedFile && (
              <div className="file-actions">
                <button className="secondary-action" onClick={copyFileShareLink}>
                  <Share2 size={16} />
                  공유
                </button>
                <button className="secondary-action" onClick={() => downloadFile(selectedFile)}>
                  <Download size={16} />
                  다운로드
                </button>
                <button className="secondary-action" onClick={() => setFileEditOpen((value) => !value)}>
                  <Edit3 size={16} />
                  정리
                </button>
                <button className="danger-action" onClick={deleteFile}>
                  <Trash2 size={16} />
                  삭제
                </button>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="file-context-row">
              <span>{joinPath(selectedFile.folder_path || "", selectedFile.original_name)}</span>
              <span>{formatBytes(selectedFile.size_bytes)}</span>
              <span>{selectedFile.created_by || defaultUserName}</span>
              <span>{formatDate(selectedFile.created_at)}</span>
            </div>
          )}

          <PresenceStrip title="이 파일을 보는 사람" users={filePresence} compact />

          {selectedFile && fileEditOpen && (
            <div className="file-edit-box">
              <input
                placeholder="파일 이름"
                value={forms.fileEdit.original_name}
                onChange={(event) => updateForm("fileEdit", "original_name", event.target.value)}
              />
              <input
                placeholder="폴더 경로 예: src/components"
                value={forms.fileEdit.folder_path}
                onChange={(event) => updateForm("fileEdit", "folder_path", event.target.value)}
              />
              <button className="primary-action" onClick={saveFileEdit}>
                <Save size={16} />
                저장
              </button>
            </div>
          )}

          {!selectedFile && <div className="empty-state">파일을 업로드하거나 선택하세요.</div>}
          {selectedFile?.resource_type === "image" && <img className="preview-image" src={filePreview} alt="" />}
          {selectedFile?.resource_type === "link" && (
            <a className="big-link" href={filePreview} target="_blank" rel="noreferrer">
              {filePreview}
            </a>
          )}
          {selectedFile && isPreviewableTextFile(selectedFile) && (
            <CodePreview
              content={filePreview}
              fileName={selectedFile.original_name}
              onLineClick={(lineNumber) => setDraft("fileLineNumber", String(lineNumber))}
              selectedLine={Number(drafts.fileLineNumber)}
            />
          )}
          {selectedFile &&
            selectedFile.resource_type !== "image" &&
            selectedFile.resource_type !== "link" &&
            !isPreviewableTextFile(selectedFile) && (
              <div className="unsupported-preview">
                <FileArchive size={26} />
                <strong>This file preview is not supported. Download to view.</strong>
                <button className="primary-action" onClick={() => downloadFile(selectedFile)}>
                  <Download size={16} />
                  파일 다운로드
                </button>
              </div>
            )}

          {selectedFile && versions.length > 0 && (
            <div className="version-row">
              <span>버전</span>
              {versions.map((file) => (
                <button
                  className={selectedFile.id === file.id ? "active" : ""}
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                >
                  v{file.version_number}
                </button>
              ))}
            </div>
          )}

          {selectedFile && (
            <>
              <div className="file-comment-composer">
                <input
                  inputMode="numeric"
                  min="1"
                  placeholder="줄 번호"
                  type="number"
                  value={drafts.fileLineNumber || ""}
                  onChange={(event) => setDraft("fileLineNumber", event.target.value)}
                />
                <CommentComposer
                  buttonLabel="파일 댓글 저장"
                  value={drafts.fileComment || ""}
                  onChange={(value) => setDraft("fileComment", value)}
                  onSubmit={() => addFileComment()}
                  placeholder="이 파일에 남길 피드백을 입력하세요."
                />
              </div>
              <FileCommentList
                comments={fileComments}
                drafts={drafts}
                onReply={addFileComment}
                onReplyChange={setDraft}
                onToggle={toggleFileComment}
              />
            </>
          )}
        </section>
      </div>
    );
  }

  function renderProjectFeedbackTab() {
    const feedback = data.projectFeedback
      .filter((item) => item.project_id === selectedProject.id)
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

    return (
      <section className="panel narrow-panel">
        <PanelTitle title="프로젝트 피드백" eyebrow={`${feedback.length}개`} />
        <div className="feedback-composer">
          <select
            value={drafts.projectFeedbackType}
            onChange={(event) => setDraft("projectFeedbackType", event.target.value)}
          >
            <option value="review">리뷰</option>
            <option value="suggestion">제안</option>
            <option value="discussion">토론</option>
          </select>
          <CommentComposer
            buttonLabel="피드백 저장"
            value={drafts.projectFeedback || ""}
            onChange={(value) => setDraft("projectFeedback", value)}
            onSubmit={() => addProjectFeedback()}
            placeholder="테스트한 느낌, 개선 제안, 질문을 남겨주세요."
          />
        </div>
        <ProjectFeedbackList
          drafts={drafts}
          feedback={feedback}
          onReply={addProjectFeedback}
          onReplyChange={setDraft}
        />
      </section>
    );
  }

  function renderUpdatesTab() {
    const updates = data.projectUpdates.filter((update) => update.project_id === selectedProject.id);

    return (
      <section className="panel narrow-panel">
        <PanelTitle title="프로젝트 업데이트" eyebrow={`${updates.length}개`} />
        <div className="form-stack">
          <input
            placeholder="업데이트 제목"
            value={forms.update.title}
            onChange={(event) => updateForm("update", "title", event.target.value)}
          />
          <textarea
            rows="4"
            placeholder="오늘 바뀐 내용이나 다음 할 일을 적어주세요."
            value={forms.update.body}
            onChange={(event) => updateForm("update", "body", event.target.value)}
          />
          <button className="primary-action" disabled={!forms.update.title.trim()} onClick={postUpdate}>
            업데이트 저장
          </button>
        </div>
        <FeedList items={updates} />
      </section>
    );
  }

  function renderChatTab() {
    const messages = data.chatMessages.filter((message) => message.project_id === selectedProject.id);

    return (
      <section className="panel narrow-panel chat-panel">
        <PanelTitle title="프로젝트 채팅" eyebrow={`${messages.length}개`} />
        <div className="chat-list">
          {messages.map((message) => (
            <article key={message.id}>
              <strong>{message.author_name}</strong>
              <p>{message.body}</p>
              <small>{formatDate(message.created_at)}</small>
            </article>
          ))}
        </div>
        <div className="chat-composer">
          <input
            placeholder="메시지 입력"
            value={drafts.chat || ""}
            onChange={(event) => setDraft("chat", event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") sendMessage();
            }}
          />
          <button disabled={!drafts.chat?.trim()} onClick={sendMessage}>
            <Send size={16} />
            저장
          </button>
        </div>
      </section>
    );
  }

  function renderActivityTab() {
    const logs = data.activityLogs
      .filter((log) => log.project_id === selectedProject.id)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return (
      <section className="panel narrow-panel">
        <PanelTitle title="활동 타임라인" eyebrow={`${logs.length}개`} />
        <Timeline items={logs} />
      </section>
    );
  }

  function renderIdeas() {
    return (
      <div className="page-grid">
        <section className="panel create-panel">
          <PanelTitle title="아이디어 올리기" eyebrow="Idea Base" />
          <div className="form-stack">
            <input
              placeholder="아이디어 제목"
              value={forms.idea.title}
              onChange={(event) => updateForm("idea", "title", event.target.value)}
            />
            <input
              placeholder="카테고리"
              value={forms.idea.category}
              onChange={(event) => updateForm("idea", "category", event.target.value)}
            />
            <textarea
              rows="5"
              placeholder="어떤 문제를 해결하고 싶나요?"
              value={forms.idea.body}
              onChange={(event) => updateForm("idea", "body", event.target.value)}
            />
            <button className="primary-action" disabled={!forms.idea.title.trim()} onClick={createIdea}>
              아이디어 저장
            </button>
          </div>
        </section>

        <section className="idea-grid">
          {data.ideas.map((idea) => {
            const comments = data.ideaComments.filter((comment) => comment.idea_id === idea.id);
            const draftKey = `idea-${idea.id}`;

            return (
              <article className="panel idea-card" key={idea.id}>
                <span>{idea.category}</span>
                <strong>{idea.title}</strong>
                <p>{idea.body}</p>
                <button className="ghost-button" onClick={() => upvoteIdea(idea)}>
                  <Heart size={16} />
                  {idea.upvotes || 0} 추천
                </button>
                <CommentComposer
                  buttonLabel="의견 저장"
                  value={drafts[draftKey] || ""}
                  onChange={(value) => setDraft(draftKey, value)}
                  onSubmit={() => addIdeaComment(idea.id)}
                  placeholder="아이디어에 대한 의견을 남겨주세요."
                />
                <CommentList comments={comments} />
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  function renderShowcase() {
    return (
      <div className="page-grid">
        <section className="panel create-panel">
          <PanelTitle title="완성작 공개" eyebrow="Showcase" />
          <div className="form-stack">
            <select
              value={forms.showcase.project_id}
              onChange={(event) => updateForm("showcase", "project_id", event.target.value)}
            >
              <option value="">프로젝트 선택 안 함</option>
              {data.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            <input
              placeholder="쇼케이스 제목"
              value={forms.showcase.title}
              onChange={(event) => updateForm("showcase", "title", event.target.value)}
            />
            <input
              placeholder="데모 링크"
              value={forms.showcase.demo_url}
              onChange={(event) => updateForm("showcase", "demo_url", event.target.value)}
            />
            <textarea
              rows="4"
              placeholder="완성작을 소개해주세요."
              value={forms.showcase.description}
              onChange={(event) => updateForm("showcase", "description", event.target.value)}
            />
            <input
              accept="image/*"
              type="file"
              onChange={(event) =>
                updateForm("showcase", "screenshot", event.target.files?.[0] || null)
              }
            />
            <button className="primary-action" disabled={!forms.showcase.title.trim()} onClick={publishShowcase}>
              쇼케이스 저장
            </button>
          </div>
        </section>

        <section className="showcase-grid">
          {data.showcases.map((showcase) => {
            const feedback = data.showcaseFeedback.filter(
              (comment) => comment.showcase_id === showcase.id,
            );
            const draftKey = `showcase-${showcase.id}`;

            return (
              <article className="panel showcase-card" key={showcase.id}>
                {showcase.screenshot_url && (
                  <img src={showcase.screenshot_url} alt={`${showcase.title} screenshot`} />
                )}
                <div>
                  <strong>{showcase.title}</strong>
                  <p>{showcase.description}</p>
                  <div className="card-actions">
                    <button onClick={() => likeShowcase(showcase)}>
                      {showcase.likes || 0} 좋아요
                    </button>
                    {showcase.demo_url && (
                      <a href={showcase.demo_url} target="_blank" rel="noreferrer">
                        데모 열기
                      </a>
                    )}
                  </div>
                  <CommentComposer
                    buttonLabel="피드백 저장"
                    value={drafts[draftKey] || ""}
                    onChange={(value) => setDraft(draftKey, value)}
                    onSubmit={() => addShowcaseFeedback(showcase.id)}
                    placeholder="쇼케이스에 대한 피드백을 남겨주세요."
                  />
                  <CommentList comments={feedback} />
                </div>
              </article>
            );
          })}
        </section>
      </div>
    );
  }
}

function PanelTitle({ eyebrow, title }) {
  return (
    <div className="panel-title">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}

function PresenceStrip({ compact = false, title, users }) {
  return (
    <div className={compact ? "presence-strip compact" : "presence-strip"}>
      <span>
        <Users size={15} />
        {title}
      </span>
      <div>
        {users.length ? (
          users.map((user) => (
            <strong key={`${user.user_name}-${user.presence_ref || user.file_id || user.project_id || ""}`}>
              {user.user_name}
            </strong>
          ))
        ) : (
          <em>없음</em>
        )}
      </div>
    </div>
  );
}

function Breadcrumb({ onMove, path }) {
  const parts = path ? path.split("/") : [];

  return (
    <div className="breadcrumb">
      <button onClick={() => onMove("")}>Root</button>
      {parts.map((part, index) => {
        const nextPath = parts.slice(0, index + 1).join("/");
        return (
          <span key={nextPath}>
            <ChevronRight size={14} />
            <button onClick={() => onMove(nextPath)}>{part}</button>
          </span>
        );
      })}
    </div>
  );
}

function TagList({ items }) {
  if (!items?.length) return null;

  return (
    <div className="tag-list">
      {items.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}

function CodePreview({ content, fileName, onLineClick, selectedLine }) {
  const lines = content.split("\n");
  const language = getFileExtension(fileName);

  return (
    <div className="code-preview">
      {lines.map((line, index) => {
        const lineNumber = index + 1;
        return (
          <button
            className={selectedLine === lineNumber ? "code-line selected" : "code-line"}
            key={`${lineNumber}-${line}`}
            onClick={() => onLineClick(lineNumber)}
          >
            <span>{lineNumber}</span>
            <code>{highlightLine(line || " ", language)}</code>
          </button>
        );
      })}
    </div>
  );
}

function CommentComposer({ buttonLabel, onChange, onSubmit, placeholder = "댓글을 입력하세요.", value }) {
  return (
    <div className="comment-composer">
      <textarea
        rows="3"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button disabled={!value.trim()} onClick={onSubmit}>
        <MessageCircle size={16} />
        {buttonLabel}
      </button>
    </div>
  );
}

function FileCommentList({ comments, drafts, onReply, onReplyChange, onToggle }) {
  const topLevel = comments.filter((comment) => !comment.parent_comment_id);

  return (
    <div className="comment-list file-comments">
      {topLevel.map((comment) => {
        const replies = comments.filter((reply) => reply.parent_comment_id === comment.id);
        const replyKey = `fileReply-${comment.id}`;

        return (
          <article className={comment.resolved ? "resolved" : ""} key={comment.id}>
            <div className="comment-head">
              <strong>{comment.author_name}</strong>
              <span>{comment.line_number ? `${comment.line_number}번째 줄` : "파일 전체"}</span>
            </div>
            <p>{comment.body}</p>
            <div className="comment-actions">
              <small>{formatDate(comment.created_at)}</small>
              <button onClick={() => onToggle(comment)}>
                {comment.resolved ? <Circle size={15} /> : <CheckCircle2 size={15} />}
                {comment.resolved ? "다시 열기" : "해결"}
              </button>
            </div>
            {replies.length > 0 && (
              <div className="reply-list">
                {replies.map((reply) => (
                  <div key={reply.id}>
                    <strong>{reply.author_name}</strong>
                    <p>{reply.body}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="reply-composer">
              <input
                placeholder="답글"
                value={drafts[replyKey] || ""}
                onChange={(event) => onReplyChange(replyKey, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onReply(comment.id);
                }}
              />
              <button disabled={!drafts[replyKey]?.trim()} onClick={() => onReply(comment.id)}>
                답글
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ProjectFeedbackList({ drafts, feedback, onReply, onReplyChange }) {
  const topLevel = feedback.filter((item) => !item.parent_feedback_id);

  return (
    <div className="comment-list">
      {topLevel.map((item) => {
        const replies = feedback.filter((reply) => reply.parent_feedback_id === item.id);
        const replyKey = `feedbackReply-${item.id}`;

        return (
          <article key={item.id}>
            <div className="comment-head">
              <strong>{item.author_name}</strong>
              <span>{feedbackLabel(item.feedback_type)} · {formatDate(item.created_at)}</span>
            </div>
            <p>{item.body}</p>
            {replies.length > 0 && (
              <div className="reply-list">
                {replies.map((reply) => (
                  <div key={reply.id}>
                    <strong>{reply.author_name}</strong>
                    <p>{reply.body}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="reply-composer">
              <input
                placeholder="답글"
                value={drafts[replyKey] || ""}
                onChange={(event) => onReplyChange(replyKey, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onReply(item.id);
                }}
              />
              <button disabled={!drafts[replyKey]?.trim()} onClick={() => onReply(item.id)}>
                답글
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CommentList({ comments }) {
  return (
    <div className="comment-list">
      {comments.map((comment) => (
        <article key={comment.id}>
          <div className="comment-head">
            <strong>{comment.author_name}</strong>
            <span>{formatDate(comment.created_at)}</span>
          </div>
          <p>{comment.body}</p>
        </article>
      ))}
    </div>
  );
}

function FeedList({ items }) {
  return (
    <div className="feed-list">
      {items.map((item) => (
        <article key={item.id}>
          <strong>{item.title || item.actor_name || item.author_name}</strong>
          <p>{item.body || item.message}</p>
          <small>{formatDate(item.created_at)}</small>
        </article>
      ))}
    </div>
  );
}

function Timeline({ items }) {
  return (
    <div className="timeline">
      {items.map((item) => (
        <article key={item.id}>
          <span />
          <div>
            <strong>{item.message}</strong>
            <small>
              {item.actor_name} · {activityLabel(item.action_type)} · {formatDate(item.created_at)}
            </small>
          </div>
        </article>
      ))}
    </div>
  );
}

function buildFolderNodes(folders, files) {
  const map = new Map();

  function addPath(path, explicitFolder = null) {
    const normalized = normalizeFolderPath(path);
    if (!normalized) return;

    const parts = normalized.split("/");
    let current = "";

    parts.forEach((part, index) => {
      const parentPath = current;
      current = joinPath(current, part);

      if (!map.has(current)) {
        map.set(current, {
          id: explicitFolder && index === parts.length - 1 ? explicitFolder.id : current,
          name: part,
          parentPath,
          path: current,
        });
      }
    });
  }

  folders.forEach((folder) => addPath(joinPath(folder.folder_path || "", folder.name), folder));
  files.forEach((file) => addPath(file.folder_path || ""));

  return Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path));
}

function parseCsv(value = "") {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function projectToForm(project) {
  return {
    title: project.title || "",
    category: project.category || "",
    description: project.description || "",
    collaborators: (project.collaborators || []).join(", "),
    tags: (project.tags || []).join(", "),
    visibility: project.visibility || "public",
  };
}

function deriveUploadFolder(relativePath, currentFolder) {
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.length <= 1) return currentFolder;
  return normalizeFolderPath(parts.slice(1, -1).join("/"));
}

function copyFileRecord(file) {
  const {
    id,
    created_at,
    updated_at,
    project_id,
    ...rest
  } = file;

  void id;
  void created_at;
  void updated_at;
  void project_id;

  return {
    ...rest,
    download_count: 0,
    version_number: file.version_number || 1,
  };
}

function uniquePresence(users) {
  const seen = new Set();

  return users.filter((user) => {
    const name = user.user_name || defaultUserName;
    const scope = `${name}-${user.project_id || ""}-${user.file_id || ""}`;
    if (seen.has(scope)) return false;
    seen.add(scope);
    return true;
  });
}

function iconForFile(file) {
  if (file.resource_type === "image") return ImageIcon;
  if (file.resource_type === "archive") return FileArchive;
  if (file.resource_type === "document") return FileText;
  if (file.resource_type === "link") return LinkIcon;
  return FileCode2;
}

function resourceLabel(file) {
  const labels = {
    archive: "압축 파일",
    code: "코드",
    document: "문서",
    file: "파일",
    image: "이미지",
    link: "링크",
  };

  return labels[file.resource_type] || "파일";
}

function downloadNameForFile(file) {
  if (file.resource_type === "link" && !getFileExtension(file.original_name)) {
    return `${file.original_name}.url`;
  }

  return file.original_name || file.file_name || "download";
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function joinPath(...parts) {
  return normalizeFolderPath(parts.filter(Boolean).join("/"));
}

function slugify(value = "project") {
  return value
    .trim()
    .replace(/[^\w가-힣.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "project";
}

function highlightLine(line, language) {
  const commentMatch = line.match(/^(\s*)(\/\/.*|#.*|--.*)$/);
  if (commentMatch && ["js", "jsx", "ts", "tsx", "css", "py", "sql", "java", "c", "cpp"].includes(language)) {
    return <span className="tok-comment">{line}</span>;
  }

  const keywordPattern =
    /\b(import|from|export|function|return|const|let|var|if|else|for|while|class|extends|async|await|try|catch|new|switch|case|break|default|true|false|null|select|from|where|insert|update|delete|create|table|public|def|return|interface|type)\b/g;
  const tokenPattern = /("[^"]*"|'[^']*'|`[^`]*`|\b\d+(\.\d+)?\b)/g;
  const pieces = [];
  let cursor = 0;

  for (const match of line.matchAll(tokenPattern)) {
    if (match.index > cursor) {
      pieces.push(...highlightKeywords(line.slice(cursor, match.index), keywordPattern));
    }

    pieces.push(
      <span className={/^\d/.test(match[0]) ? "tok-number" : "tok-string"} key={`${match.index}-${match[0]}`}>
        {match[0]}
      </span>,
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < line.length) {
    pieces.push(...highlightKeywords(line.slice(cursor), keywordPattern));
  }

  return pieces.length ? pieces : line;
}

function highlightKeywords(value, keywordPattern) {
  const pieces = [];
  let cursor = 0;

  for (const match of value.matchAll(keywordPattern)) {
    if (match.index > cursor) pieces.push(value.slice(cursor, match.index));
    pieces.push(
      <span className="tok-keyword" key={`${match.index}-${match[0]}`}>
        {match[0]}
      </span>,
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < value.length) pieces.push(value.slice(cursor));
  return pieces;
}

function feedbackLabel(type) {
  const labels = {
    discussion: "토론",
    reply: "답글",
    review: "리뷰",
    suggestion: "제안",
  };

  return labels[type] || "피드백";
}

function activityLabel(type) {
  const labels = {
    chat_message: "채팅",
    file_comment: "파일 댓글",
    file_deleted: "파일 삭제",
    file_downloaded: "파일 다운로드",
    file_renamed: "파일 정리",
    file_shared: "파일 공유",
    file_uploaded: "파일 업로드",
    folder_created: "폴더 생성",
    link_added: "링크 추가",
    project_created: "프로젝트 생성",
    project_downloaded: "프로젝트 다운로드",
    project_feedback: "피드백",
    project_forked: "포크",
    project_liked: "좋아요",
    project_updated: "프로젝트 수정",
    update: "업데이트",
  };

  return labels[type] || "활동";
}

function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default App;
