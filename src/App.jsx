import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Database,
  FileCode2,
  GalleryHorizontalEnd,
  HardDrive,
  Heart,
  Image,
  Lightbulb,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  Plus,
  Radio,
  Send,
  UploadCloud,
} from "lucide-react";
import {
  createProjectLink,
  createRecord,
  getProjectFileContent,
  getSaveTarget,
  loadAllData,
  subscribePresence,
  subscribeWorkspace,
  updateRecord,
  uploadProjectFile,
  uploadShowcaseScreenshot,
} from "./db";
import { emptyData } from "./data";
import { isSupabaseReady } from "./supabaseClient";
import "./App.css";

const blankProject = {
  title: "",
  category: "웹앱",
  description: "",
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
  { id: "files", label: "파일" },
  { id: "comments", label: "댓글" },
  { id: "updates", label: "업데이트" },
  { id: "chat", label: "채팅" },
  { id: "activity", label: "활동" },
];

function App() {
  const [view, setView] = useState("projects");
  const [data, setData] = useState(null);
  const [dataSource, setDataSource] = useState("local");
  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem("a-and-i-user-name") || "익명 메이커",
  );
  const [presence, setPresence] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState("저장 전입니다.");
  const [lastSave, setLastSave] = useState("아직 저장 위치가 없습니다.");
  const [categoryFilter, setCategoryFilter] = useState("전체");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedFileId, setSelectedFileId] = useState("");
  const [projectTab, setProjectTab] = useState("files");
  const [filePreview, setFilePreview] = useState("");
  const [forms, setForms] = useState({
    project: blankProject,
    link: blankLink,
    update: blankUpdate,
    idea: blankIdea,
    showcase: blankShowcase,
  });
  const [drafts, setDrafts] = useState({});

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

  useEffect(() => {
    localStorage.setItem("a-and-i-user-name", currentUser);
    return subscribePresence(currentUser, setPresence);
  }, [currentUser]);

  const selectedProject = useMemo(() => {
    if (!data || !selectedProjectId) return null;
    return data.projects.find((project) => project.id === selectedProjectId) || null;
  }, [data, selectedProjectId]);

  const projectFiles = useMemo(() => {
    if (!data || !selectedProject) return [];
    return data.projectFiles.filter((file) => file.project_id === selectedProject.id);
  }, [data, selectedProject]);

  const selectedFile = useMemo(() => {
    if (!projectFiles.length) return null;
    return projectFiles.find((file) => file.id === selectedFileId) || projectFiles[0];
  }, [projectFiles, selectedFileId]);

  const categories = useMemo(() => {
    if (!data) return ["전체"];
    return ["전체", ...new Set(data.projects.map((project) => project.category || "기타"))];
  }, [data]);

  const visibleProjects = useMemo(() => {
    if (!data) return [];
    if (categoryFilter === "전체") return data.projects;
    return data.projects.filter((project) => project.category === categoryFilter);
  }, [data, categoryFilter]);

  useEffect(() => {
    if (!selectedFile) {
      setFilePreview("");
      return;
    }

    getProjectFileContent(selectedFile)
      .then(setFilePreview)
      .catch((error) => setFilePreview(`파일을 불러오지 못했습니다: ${error.message}`));
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
      await task();
      const nextData = await refresh();
      setNotice(successMessage);
      setLastSave(`${getSaveTarget(collection)} / 현재 ${nextData[collection]?.length ?? 0}개`);
    } catch (error) {
      setNotice(`저장 실패: ${error.message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function logActivity(projectId, message) {
    await createRecord("activityLogs", {
      project_id: projectId,
      actor_name: currentUser,
      action_type: "activity",
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

  function openProject(projectId) {
    setSelectedProjectId(projectId);
    setSelectedFileId("");
    setProjectTab("files");
    setView("project-detail");
  }

  function createProject() {
    if (!forms.project.title.trim()) return;

    runTask(
      "projects",
      async () => {
        const project = await createRecord("projects", {
          ...forms.project,
          owner_name: currentUser,
          status: "진행 중",
        });

        await logActivity(project.id, "프로젝트가 생성되었습니다.");
        resetForm("project", blankProject);
        openProject(project.id);
      },
      "프로젝트가 생성되었습니다.",
    );
  }

  function uploadFiles(fileList) {
    if (!selectedProject) return;

    runTask(
      "projectFiles",
      async () => {
        for (const file of Array.from(fileList)) {
          const versionNumber =
            projectFiles.filter((item) => item.version_group === file.name).length + 1;

          const savedFile = await uploadProjectFile({
            projectId: selectedProject.id,
            file,
            versionNumber,
            actorName: currentUser,
          });

          setSelectedFileId(savedFile.id);
          await logActivity(selectedProject.id, `${file.name} 업로드`);
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
          title: forms.link.title,
          url: forms.link.url,
          actorName: currentUser,
        });

        await logActivity(selectedProject.id, `${forms.link.title} 링크 추가`);
        setSelectedFileId(link.id);
        resetForm("link", blankLink);
      },
      "링크가 추가되었습니다.",
    );
  }

  function addProjectComment() {
    const body = drafts.projectComment?.trim();
    if (!selectedProject || !body) return;

    runTask("projectComments", async () => {
      await createRecord("projectComments", {
        project_id: selectedProject.id,
        author_name: currentUser,
        body,
      });
      setDraft("projectComment", "");
      await logActivity(selectedProject.id, "프로젝트 댓글 작성");
    });
  }

  function addFileComment() {
    const body = drafts.fileComment?.trim();
    if (!selectedProject || !selectedFile || !body) return;

    runTask("fileComments", async () => {
      await createRecord("fileComments", {
        project_id: selectedProject.id,
        file_id: selectedFile.id,
        author_name: currentUser,
        body,
      });
      setDraft("fileComment", "");
      await logActivity(selectedProject.id, `${selectedFile.original_name} 파일 댓글 작성`);
    });
  }

  function postUpdate() {
    if (!selectedProject || !forms.update.title.trim()) return;

    runTask("projectUpdates", async () => {
      await createRecord("projectUpdates", {
        project_id: selectedProject.id,
        author_name: currentUser,
        title: forms.update.title,
        body: forms.update.body,
      });
      await logActivity(selectedProject.id, `${forms.update.title} 업데이트 게시`);
      resetForm("update", blankUpdate);
    });
  }

  function sendMessage() {
    const body = drafts.chat?.trim();
    if (!selectedProject || !body) return;

    runTask("chatMessages", async () => {
      await createRecord("chatMessages", {
        project_id: selectedProject.id,
        author_name: currentUser,
        body,
      });
      setDraft("chat", "");
    }, "메시지가 저장되었습니다.");
  }

  function createIdea() {
    if (!forms.idea.title.trim()) return;

    runTask("ideas", async () => {
      await createRecord("ideas", {
        ...forms.idea,
        author_name: currentUser,
        upvotes: 0,
      });
      resetForm("idea", blankIdea);
    }, "아이디어가 저장되었습니다.");
  }

  function upvoteIdea(idea) {
    runTask("ideas", async () => {
      await updateRecord("ideas", idea.id, {
        upvotes: Number(idea.upvotes || 0) + 1,
      });
    }, "추천이 저장되었습니다.");
  }

  function addIdeaComment(ideaId) {
    const key = `idea-${ideaId}`;
    const body = drafts[key]?.trim();
    if (!body) return;

    runTask("ideaComments", async () => {
      await createRecord("ideaComments", {
        idea_id: ideaId,
        author_name: currentUser,
        body,
      });
      setDraft(key, "");
    });
  }

  function publishShowcase() {
    if (!forms.showcase.title.trim()) return;

    runTask("showcases", async () => {
      const screenshot = await uploadShowcaseScreenshot(forms.showcase.screenshot);
      await createRecord("showcases", {
        project_id: forms.showcase.project_id || null,
        title: forms.showcase.title,
        description: forms.showcase.description,
        demo_url: forms.showcase.demo_url,
        likes: 0,
        ...screenshot,
      });
      resetForm("showcase", blankShowcase);
    }, "쇼케이스가 저장되었습니다.");
  }

  function likeShowcase(showcase) {
    runTask("showcases", async () => {
      await updateRecord("showcases", showcase.id, {
        likes: Number(showcase.likes || 0) + 1,
      });
    }, "좋아요가 저장되었습니다.");
  }

  function addShowcaseFeedback(showcaseId) {
    const key = `showcase-${showcaseId}`;
    const body = drafts[key]?.trim();
    if (!body) return;

    runTask("showcaseFeedback", async () => {
      await createRecord("showcaseFeedback", {
        showcase_id: showcaseId,
        author_name: currentUser,
        body,
      });
      setDraft(key, "");
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand-button" onClick={() => setView("projects")}>
          <span className="brand-mark">A&I</span>
          <span>
            <strong>A&I Community</strong>
            <small>AI로 만든 프로젝트를 공유하고 개선하는 공간</small>
          </span>
        </button>

        <nav className="nav-list">
          <button className={view.startsWith("project") ? "nav-item active" : "nav-item"} onClick={() => setView("projects")}>
            프로젝트
          </button>
          <button className={view === "ideas" ? "nav-item active" : "nav-item"} onClick={() => setView("ideas")}>
            아이디어
          </button>
          <button className={view === "showcase" ? "nav-item active" : "nav-item"} onClick={() => setView("showcase")}>
            쇼케이스
          </button>
        </nav>

        <div className="status-card">
          <p>저장 상태</p>
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
          <span>{dataSource === "supabase" ? "Supabase에 저장 중" : "브라우저 localStorage에 저장 중"}</span>
          <strong>{lastSave}</strong>
          <Radio size={16} />
          <span>{presence.map((user) => user.user_name).join(", ")}</span>
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
          <PanelTitle title="프로젝트 등록" eyebrow="새 프로젝트" />
          <div className="form-stack">
            <input
              placeholder="프로젝트 이름"
              value={forms.project.title}
              onChange={(event) => updateForm("project", "title", event.target.value)}
            />
            <input
              placeholder="카테고리 예: 웹앱, 앱, 게임, 디자인"
              value={forms.project.category}
              onChange={(event) => updateForm("project", "category", event.target.value)}
            />
            <textarea
              rows="5"
              placeholder="무엇을 만들었고 어떤 피드백이 필요한지 적어주세요."
              value={forms.project.description}
              onChange={(event) => updateForm("project", "description", event.target.value)}
            />
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
              const fileCount = data.projectFiles.filter((file) => file.project_id === project.id).length;
              const commentCount = data.projectComments.filter((comment) => comment.project_id === project.id).length;

              return (
                <article className="project-card" key={project.id}>
                  <span>{project.category}</span>
                  <strong>{project.title}</strong>
                  <p>{project.description}</p>
                  <div className="card-meta">
                    <small>{fileCount} files</small>
                    <small>{commentCount} comments</small>
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
    return (
      <section className="detail-page">
        <div className="detail-header">
          <button className="ghost-button" onClick={() => setView("projects")}>
            <ArrowLeft size={16} />
            목록
          </button>
          <div>
            <span>{selectedProject.category}</span>
            <h2>{selectedProject.title}</h2>
            <p>{selectedProject.description}</p>
          </div>
        </div>

        <div className="detail-tabs">
          {projectTabs.map((tab) => (
            <button
              className={projectTab === tab.id ? "active" : ""}
              key={tab.id}
              onClick={() => setProjectTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {projectTab === "files" && renderFilesTab()}
        {projectTab === "comments" && renderProjectCommentsTab()}
        {projectTab === "updates" && renderUpdatesTab()}
        {projectTab === "chat" && renderChatTab()}
        {projectTab === "activity" && renderActivityTab()}
      </section>
    );
  }

  function renderFilesTab() {
    const fileComments = data.fileComments.filter((comment) => comment.file_id === selectedFile?.id);
    const versions = selectedFile
      ? projectFiles.filter((file) => file.version_group === selectedFile.version_group)
      : [];

    return (
      <div className="file-workspace">
        <section className="panel upload-panel">
          <PanelTitle title="파일 추가" eyebrow="업로드" />
          <label className="upload-button">
            <UploadCloud size={18} />
            파일 또는 이미지 선택
            <input
              multiple
              type="file"
              onChange={(event) => {
                if (event.target.files?.length) uploadFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
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
            <button onClick={addLink}>링크 저장</button>
          </div>
        </section>

        <section className="panel file-list-panel">
          <PanelTitle title="파일 목록" eyebrow={`${projectFiles.length}개`} />
          <div className="file-list">
            {projectFiles.map((file) => (
              <button
                className={selectedFile?.id === file.id ? "active" : ""}
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
              >
                {file.resource_type === "image" ? <Image size={16} /> : <FileCode2 size={16} />}
                <span>
                  <strong>{file.original_name}</strong>
                  <small>{file.resource_type === "link" ? "링크" : `v${file.version_number}`}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel file-preview-panel">
          <PanelTitle title={selectedFile?.original_name || "파일 미리보기"} eyebrow="내용" />
          {!selectedFile && <div className="empty-state">파일을 업로드하거나 선택하세요.</div>}
          {selectedFile?.resource_type === "image" && <img className="preview-image" src={filePreview} alt="" />}
          {selectedFile?.resource_type === "link" && (
            <a className="big-link" href={filePreview} target="_blank" rel="noreferrer">
              {filePreview}
            </a>
          )}
          {selectedFile && selectedFile.resource_type === "file" && <pre>{filePreview}</pre>}

          {selectedFile && (
            <>
              <div className="version-row">
                {versions.map((file) => (
                  <button key={file.id} onClick={() => setSelectedFileId(file.id)}>
                    v{file.version_number}
                  </button>
                ))}
              </div>
              <CommentComposer
                buttonLabel="파일 댓글 저장"
                value={drafts.fileComment || ""}
                onChange={(value) => setDraft("fileComment", value)}
                onSubmit={addFileComment}
              />
              <CommentList comments={fileComments} />
            </>
          )}
        </section>
      </div>
    );
  }

  function renderProjectCommentsTab() {
    const comments = data.projectComments.filter((comment) => comment.project_id === selectedProject.id);

    return (
      <section className="panel narrow-panel">
        <PanelTitle title="프로젝트 댓글" eyebrow={`${comments.length}개`} />
        <CommentComposer
          buttonLabel="댓글 저장"
          value={drafts.projectComment || ""}
          onChange={(value) => setDraft("projectComment", value)}
          onSubmit={addProjectComment}
        />
        <CommentList comments={comments} />
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
            placeholder="무엇이 바뀌었나요?"
            value={forms.update.body}
            onChange={(event) => updateForm("update", "body", event.target.value)}
          />
          <button className="primary-action" onClick={postUpdate}>
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
      <section className="panel narrow-panel">
        <PanelTitle title="프로젝트 채팅" eyebrow={`${messages.length}개`} />
        <div className="chat-list">
          {messages.map((message) => (
            <article key={message.id}>
              <strong>{message.author_name}</strong>
              <p>{message.body}</p>
            </article>
          ))}
        </div>
        <div className="chat-composer">
          <input
            placeholder="메시지 입력"
            value={drafts.chat || ""}
            onChange={(event) => setDraft("chat", event.target.value)}
          />
          <button onClick={sendMessage}>
            <Send size={16} />
            저장
          </button>
        </div>
      </section>
    );
  }

  function renderActivityTab() {
    const logs = data.activityLogs.filter((log) => log.project_id === selectedProject.id);

    return (
      <section className="panel narrow-panel">
        <PanelTitle title="활동 로그" eyebrow={`${logs.length}개`} />
        <FeedList items={logs} />
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
            <button className="primary-action" onClick={createIdea}>
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
                  buttonLabel="토론 댓글 저장"
                  value={drafts[draftKey] || ""}
                  onChange={(value) => setDraft(draftKey, value)}
                  onSubmit={() => addIdeaComment(idea.id)}
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
            <button className="primary-action" onClick={publishShowcase}>
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

function CommentComposer({ buttonLabel, onChange, onSubmit, value }) {
  return (
    <div className="comment-composer">
      <textarea
        rows="3"
        placeholder="댓글을 입력하세요"
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

function CommentList({ comments }) {
  return (
    <div className="comment-list">
      {comments.map((comment) => (
        <article key={comment.id}>
          <strong>{comment.author_name}</strong>
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
        </article>
      ))}
    </div>
  );
}

export default App;
