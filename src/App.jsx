import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Database,
  FileCode2,
  GalleryHorizontalEnd,
  HardDrive,
  Heart,
  Lightbulb,
  Loader2,
  MessageCircle,
  Plus,
  Radio,
  Send,
  UploadCloud,
  Users,
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

const sections = [
  { id: "projects", label: "프로젝트", icon: Users },
  { id: "ideas", label: "아이디어", icon: Lightbulb },
  { id: "showcase", label: "쇼케이스", icon: GalleryHorizontalEnd },
];

const blankProject = {
  title: "",
  description: "",
  category: "웹앱",
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
  category: "커뮤니티",
  body: "",
};

const blankShowcase = {
  project_id: "",
  title: "",
  description: "",
  demo_url: "",
  screenshot: null,
};

function App() {
  const [activeSection, setActiveSection] = useState("projects");
  const [data, setData] = useState(null);
  const [dataSource, setDataSource] = useState("local");
  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem("a-and-i-user-name") || "익명 메이커",
  );
  const [presence, setPresence] = useState([]);
  const [notice, setNotice] = useState("");
  const [saveLocation, setSaveLocation] = useState("아직 저장한 데이터가 없습니다.");
  const [isBusy, setIsBusy] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedFileId, setSelectedFileId] = useState("");
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
      setNotice(`데이터를 불러오지 못했습니다: ${error.message}`);
      setData(emptyData);
    });
  }, [refresh]);

  useEffect(() => {
    return subscribeWorkspace(() => {
      refresh().catch((error) => {
        setNotice(`실시간 동기화 실패: ${error.message}`);
      });
    });
  }, [refresh]);

  useEffect(() => {
    localStorage.setItem("a-and-i-user-name", currentUser);
    return subscribePresence(currentUser, setPresence);
  }, [currentUser]);

  const selectedProject = useMemo(() => {
    if (!data?.projects?.length) return null;
    return (
      data.projects.find((project) => project.id === selectedProjectId) ||
      data.projects[0]
    );
  }, [data, selectedProjectId]);

  const projectId = selectedProject?.id || "";

  const projectFiles = useMemo(() => {
    if (!data || !projectId) return [];
    return data.projectFiles.filter((file) => file.project_id === projectId);
  }, [data, projectId]);

  const selectedFile = useMemo(() => {
    if (!projectFiles.length) return null;
    return projectFiles.find((file) => file.id === selectedFileId) || projectFiles[0];
  }, [projectFiles, selectedFileId]);

  useEffect(() => {
    if (!selectedFile) {
      setFilePreview("");
      return;
    }

    getProjectFileContent(selectedFile)
      .then(setFilePreview)
      .catch((error) => {
        setFilePreview(`파일을 불러오지 못했습니다: ${error.message}`);
      });
  }, [selectedFile]);

  if (!data) {
    return (
      <main className="loading-screen">
        <Loader2 className="spin" />
        <span>A&I 워크스페이스를 불러오는 중입니다.</span>
      </main>
    );
  }

  const stats = {
    projects: data.projects.length,
    files: data.projectFiles.length,
    comments:
      data.projectComments.length +
      data.fileComments.length +
      data.ideaComments.length +
      data.showcaseFeedback.length,
    showcases: data.showcases.length,
  };

  async function runTask(collection, task) {
    setIsBusy(true);

    try {
      await task();
      await refresh();
      setNotice("저장되었습니다.");
      setSaveLocation(getSaveTarget(collection));
    } catch (error) {
      setNotice(`작업 실패: ${error.message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function logActivity(projectIdForLog, message) {
    await createRecord("activityLogs", {
      project_id: projectIdForLog,
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

  function setDraft(key, value) {
    setDrafts((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm(group, value) {
    setForms((current) => ({
      ...current,
      [group]: value,
    }));
  }

  function addComment(collection, payload, draftKey) {
    if (!payload.body?.trim()) return null;

    return runTask(collection, async () => {
      await createRecord(collection, payload);
      setDraft(draftKey, "");
    });
  }

  function createProject() {
    if (!forms.project.title.trim()) return null;

    return runTask("projects", async () => {
      const project = await createRecord("projects", {
        ...forms.project,
        owner_name: currentUser,
        status: "진행 중",
      });

      await logActivity(project.id, "프로젝트를 만들었습니다.");
      resetForm("project", blankProject);
      setSelectedProjectId(project.id);
      setSelectedFileId("");
    });
  }

  function uploadFiles(fileList) {
    if (!projectId) return null;

    return runTask("projectFiles", async () => {
      for (const file of Array.from(fileList)) {
        const versionNumber =
          projectFiles.filter((item) => item.version_group === file.name).length + 1;

        const savedFile = await uploadProjectFile({
          projectId,
          file,
          versionNumber,
          actorName: currentUser,
        });

        setSelectedFileId(savedFile.id);
        await logActivity(projectId, `${file.name} 파일을 업로드했습니다.`);
      }
    });
  }

  function addLink() {
    if (!projectId || !forms.link.title.trim() || !forms.link.url.trim()) return null;

    return runTask("projectFiles", async () => {
      await createProjectLink({
        projectId,
        title: forms.link.title,
        url: forms.link.url,
        actorName: currentUser,
      });

      await logActivity(projectId, `${forms.link.title} 링크를 추가했습니다.`);
      resetForm("link", blankLink);
    });
  }

  function postProjectUpdate() {
    if (!projectId || !forms.update.title.trim()) return null;

    return runTask("projectUpdates", async () => {
      await createRecord("projectUpdates", {
        project_id: projectId,
        author_name: currentUser,
        title: forms.update.title,
        body: forms.update.body,
      });

      await logActivity(projectId, `${forms.update.title} 업데이트를 게시했습니다.`);
      resetForm("update", blankUpdate);
    });
  }

  function createIdea() {
    if (!forms.idea.title.trim()) return null;

    return runTask("ideas", async () => {
      await createRecord("ideas", {
        ...forms.idea,
        author_name: currentUser,
        upvotes: 0,
      });

      resetForm("idea", blankIdea);
    });
  }

  function upvoteIdea(idea) {
    return runTask("ideas", async () => {
      await updateRecord("ideas", idea.id, {
        upvotes: Number(idea.upvotes || 0) + 1,
      });
    });
  }

  function publishShowcase() {
    if (!forms.showcase.title.trim()) return null;

    return runTask("showcases", async () => {
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
    });
  }

  function likeShowcase(showcase) {
    return runTask("showcases", async () => {
      await updateRecord("showcases", showcase.id, {
        likes: Number(showcase.likes || 0) + 1,
      });
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand-button" onClick={() => setActiveSection("projects")}>
          <span className="brand-mark">A&I</span>
          <span>
            <strong>A&I 협업실</strong>
            <small>파일을 올리고 함께 피드백하세요</small>
          </span>
        </button>

        <nav className="nav-list" aria-label="주요 메뉴">
          {sections.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${activeSection === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="status-card">
          <p>저장 상태</p>
          <strong>{isSupabaseReady ? "Supabase 연결" : "로컬 저장"}</strong>
          <span>
            {notice ||
              (dataSource === "supabase"
                ? "Supabase Database, Storage, Realtime 사용 중"
                : "브라우저 localStorage 데모 모드")}
          </span>
          <div className="save-location">
            <b>마지막 저장 위치</b>
            <code>{saveLocation}</code>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">AI-powered creator collaboration</p>
            <h1>A&I</h1>
          </div>

          <label className="user-name-field">
            <span>내 이름</span>
            <input
              value={currentUser}
              onChange={(event) => setCurrentUser(event.target.value)}
            />
          </label>
        </header>

        <section className="hero-strip">
          <div>
            <p className="eyebrow">프로젝트 + 파일 공유 + 댓글</p>
            <h2>AI로 만든 결과물을 올리고, 함께 보고, 바로 피드백하세요.</h2>
            <p>
              코딩 고수 커뮤니티가 아니라, 한국 학생과 비개발자도 AI로 만든 프로젝트를
              공유하고 서로 개선하는 협업 공간입니다.
            </p>
          </div>

          <div className="stat-grid">
            <Stat label="프로젝트" value={stats.projects} />
            <Stat label="파일" value={stats.files} />
            <Stat label="댓글" value={stats.comments} />
            <Stat label="쇼케이스" value={stats.showcases} />
          </div>
        </section>

        <section className="quick-note">
          {isSupabaseReady ? <Database size={16} /> : <HardDrive size={16} />}
          <span>
            {isSupabaseReady
              ? "Supabase Database / Storage / Realtime에 저장됩니다."
              : "Supabase 설정 전에는 브라우저 localStorage에 저장됩니다."}
          </span>
          <strong>마지막 저장 위치: {saveLocation}</strong>
          <Radio size={16} />
          <span>{presence.map((user) => user.user_name).join(", ")}</span>
        </section>

        {activeSection === "projects" && renderProjects()}
        {activeSection === "ideas" && renderIdeas()}
        {activeSection === "showcase" && renderShowcase()}
      </main>
    </div>
  );

  function renderProjects() {
    const projectComments = data.projectComments.filter(
      (comment) => comment.project_id === projectId,
    );
    const fileComments = data.fileComments.filter(
      (comment) => comment.file_id === selectedFile?.id,
    );
    const updates = data.projectUpdates.filter((item) => item.project_id === projectId);
    const chats = data.chatMessages.filter((item) => item.project_id === projectId);
    const logs = data.activityLogs.filter((item) => item.project_id === projectId);

    return (
      <section className="project-layout">
        <div className="panel">
          <PanelTitle eyebrow="Project Hub" title="프로젝트 만들기" />

          <div className="form-stack">
            <input
              placeholder="프로젝트 이름"
              value={forms.project.title}
              onChange={(event) => updateForm("project", "title", event.target.value)}
            />
            <input
              placeholder="카테고리"
              value={forms.project.category}
              onChange={(event) => updateForm("project", "category", event.target.value)}
            />
            <textarea
              placeholder="무엇을 만들었고 어떤 피드백이 필요한가요?"
              rows="4"
              value={forms.project.description}
              onChange={(event) => updateForm("project", "description", event.target.value)}
            />
            <button
              className="primary-action"
              disabled={isBusy || !forms.project.title.trim()}
              onClick={createProject}
            >
              <Plus size={16} />
              생성
            </button>
          </div>

          <div className="project-list">
            {data.projects.map((project) => (
              <button
                className={`project-row ${project.id === projectId ? "active" : ""}`}
                key={project.id}
                onClick={() => {
                  setSelectedProjectId(project.id);
                  setSelectedFileId("");
                }}
              >
                <span>{project.category}</span>
                <strong>{project.title}</strong>
                <small>{project.description}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="workspace-grid">
          <div className="panel project-main">
            <PanelTitle
              eyebrow={selectedProject?.category || "Project"}
              title={selectedProject?.title || "프로젝트"}
            />
            <p className="project-description">{selectedProject?.description}</p>

            <div className="upload-zone">
              <label>
                <UploadCloud size={18} />
                파일 / 이미지 업로드
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
                <button onClick={addLink}>링크 추가</button>
              </div>
            </div>

            <div className="file-browser">
              <div className="file-list">
                <h3>파일 목록</h3>
                {projectFiles.map((file) => (
                  <button
                    className={`file-row ${file.id === selectedFile?.id ? "active" : ""}`}
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                  >
                    <FileCode2 size={18} />
                    <span>
                      <strong>{file.original_name}</strong>
                      <small>
                        {file.resource_type === "link"
                          ? "링크"
                          : `v${file.version_number}`}
                      </small>
                    </span>
                  </button>
                ))}
              </div>

              <div className="file-viewer">
                <PanelTitle
                  eyebrow="파일 내용"
                  title={selectedFile?.original_name || "파일을 선택하세요"}
                />

                {selectedFile?.resource_type === "image" ? (
                  <img className="preview-image" src={filePreview} alt="" />
                ) : selectedFile?.resource_type === "link" ? (
                  <a className="big-link" href={filePreview} target="_blank" rel="noreferrer">
                    {filePreview}
                  </a>
                ) : (
                  <pre>{filePreview || "파일을 선택하세요."}</pre>
                )}

                <CommentBox
                  label="파일 피드백"
                  value={drafts.file || ""}
                  onChange={(value) => setDraft("file", value)}
                  onSubmit={() =>
                    addComment(
                      "fileComments",
                      {
                        project_id: projectId,
                        file_id: selectedFile?.id,
                        author_name: currentUser,
                        body: drafts.file,
                      },
                      "file",
                    )
                  }
                />
                <CommentList comments={fileComments} />
              </div>
            </div>
          </div>

          <aside className="side-stack">
            <Panel title="프로젝트 댓글">
              <CommentBox
                label="댓글"
                value={drafts.project || ""}
                onChange={(value) => setDraft("project", value)}
                onSubmit={() =>
                  addComment(
                    "projectComments",
                    {
                      project_id: projectId,
                      author_name: currentUser,
                      body: drafts.project,
                    },
                    "project",
                  )
                }
              />
              <CommentList comments={projectComments} />
            </Panel>

            <Panel title="라이브 채팅">
              <CommentBox
                icon={<Send size={16} />}
                label="보내기"
                value={drafts.chat || ""}
                onChange={(value) => setDraft("chat", value)}
                onSubmit={() =>
                  addComment(
                    "chatMessages",
                    {
                      project_id: projectId,
                      author_name: currentUser,
                      body: drafts.chat,
                    },
                    "chat",
                  )
                }
              />
              <Feed items={chats} />
            </Panel>

            <Panel title="프로젝트 업데이트">
              <div className="form-stack compact">
                <input
                  placeholder="업데이트 제목"
                  value={forms.update.title}
                  onChange={(event) => updateForm("update", "title", event.target.value)}
                />
                <textarea
                  placeholder="무엇이 바뀌었나요?"
                  rows="3"
                  value={forms.update.body}
                  onChange={(event) => updateForm("update", "body", event.target.value)}
                />
                <button className="secondary-action" onClick={postProjectUpdate}>
                  업데이트 게시
                </button>
              </div>
              <Feed items={updates} />
            </Panel>

            <Panel title="활동 로그">
              <Feed items={logs} />
            </Panel>
          </aside>
        </div>
      </section>
    );
  }

  function renderIdeas() {
    return (
      <section className="forum-grid">
        <div className="panel">
          <PanelTitle eyebrow="Idea Base" title="아이디어 올리기" />
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
              placeholder="어떤 문제를 해결하고 싶나요?"
              rows="5"
              value={forms.idea.body}
              onChange={(event) => updateForm("idea", "body", event.target.value)}
            />
            <button className="primary-action" onClick={createIdea}>
              <Plus size={16} />
              아이디어 올리기
            </button>
          </div>
        </div>

        <div className="idea-list">
          {data.ideas.map((idea) => {
            const comments = data.ideaComments.filter(
              (comment) => comment.idea_id === idea.id,
            );
            const draftKey = `idea-${idea.id}`;

            return (
              <article className="panel idea-card" key={idea.id}>
                <span>{idea.category}</span>
                <strong>{idea.title}</strong>
                <p>{idea.body}</p>

                <div className="idea-actions">
                  <button onClick={() => upvoteIdea(idea)}>
                    <Heart size={16} />
                    {idea.upvotes || 0} 추천
                  </button>
                </div>

                <CommentBox
                  label="댓글"
                  value={drafts[draftKey] || ""}
                  onChange={(value) => setDraft(draftKey, value)}
                  onSubmit={() =>
                    addComment(
                      "ideaComments",
                      {
                        idea_id: idea.id,
                        author_name: currentUser,
                        body: drafts[draftKey],
                      },
                      draftKey,
                    )
                  }
                />
                <CommentList comments={comments} />
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderShowcase() {
    return (
      <section className="showcase-layout">
        <div className="panel">
          <PanelTitle eyebrow="Showcase" title="완성작 공개" />

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
              placeholder="완성작을 소개해주세요."
              rows="4"
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
              완성작 공개
            </button>
          </div>
        </div>

        <div className="showcase-grid">
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

                <div className="showcase-body">
                  <strong>{showcase.title}</strong>
                  <p>{showcase.description}</p>

                  <div className="idea-actions">
                    <button onClick={() => likeShowcase(showcase)}>
                      {showcase.likes || 0} 좋아요
                    </button>
                    {showcase.demo_url && (
                      <a href={showcase.demo_url} target="_blank" rel="noreferrer">
                        데모 링크
                      </a>
                    )}
                  </div>

                  <CommentBox
                    label="피드백"
                    value={drafts[draftKey] || ""}
                    onChange={(value) => setDraft(draftKey, value)}
                    onSubmit={() =>
                      addComment(
                        "showcaseFeedback",
                        {
                          showcase_id: showcase.id,
                          author_name: currentUser,
                          body: drafts[draftKey],
                        },
                        draftKey,
                      )
                    }
                  />
                  <CommentList comments={feedback} />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }
}

function Stat({ label, value }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function PanelTitle({ eyebrow, title }) {
  return (
    <div className="panel-title">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="panel">
      <PanelTitle eyebrow="Workspace" title={title} />
      {children}
    </div>
  );
}

function CommentBox({ icon, label, onChange, onSubmit, value }) {
  return (
    <div className="comment-composer">
      <textarea
        rows="3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="댓글을 입력하세요"
      />
      <button disabled={!value?.trim()} onClick={onSubmit}>
        {icon || <MessageCircle size={16} />}
        {label}
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

function Feed({ items }) {
  return (
    <div className="feed-list">
      {items.map((item) => (
        <article key={item.id}>
          <strong>{item.title || item.author_name || item.actor_name}</strong>
          <p>{item.body || item.message}</p>
        </article>
      ))}
    </div>
  );
}

export default App;
