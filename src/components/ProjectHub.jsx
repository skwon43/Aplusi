import { useMemo, useState } from "react";
import {
  Clock3,
  ExternalLink,
  FileCode2,
  FileImage,
  Link as LinkIcon,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  UploadCloud,
} from "lucide-react";

const emptyProject = { title: "", description: "", category: "웹앱" };
const emptyLink = { title: "", url: "" };
const emptyUpdate = { title: "", body: "" };

function ProjectHub({
  data,
  filePreview,
  isBusy,
  isFileLoading,
  onAddFileComment,
  onAddLink,
  onCreateProject,
  onDeleteProject,
  onPostProjectComment,
  onPostUpdate,
  onSelectFile,
  onSelectProject,
  onSendChat,
  onUploadFiles,
  selectedFile,
  selectedProject,
  selectedProjectId,
}) {
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [linkForm, setLinkForm] = useState(emptyLink);
  const [projectComment, setProjectComment] = useState("");
  const [fileComment, setFileComment] = useState("");
  const [updateForm, setUpdateForm] = useState(emptyUpdate);
  const [chatMessage, setChatMessage] = useState("");

  const projectFiles = useMemo(() => {
    return data.projectFiles.filter((file) => file.project_id === selectedProjectId);
  }, [data.projectFiles, selectedProjectId]);

  const projectComments = data.projectComments.filter(
    (comment) => comment.project_id === selectedProjectId,
  );
  const fileComments = data.fileComments.filter((comment) => comment.file_id === selectedFile?.id);
  const updates = data.projectUpdates.filter((update) => update.project_id === selectedProjectId);
  const chats = data.chatMessages.filter((message) => message.project_id === selectedProjectId);
  const activities = data.activityLogs.filter((log) => log.project_id === selectedProjectId);
  const versionHistory = selectedFile
    ? projectFiles.filter((file) => file.version_group === selectedFile.version_group)
    : [];

  return (
    <div className="project-layout">
      <section className="panel project-list-panel">
        <PanelTitle eyebrow="Project Hub" title="프로젝트 올리기" />
        <div className="form-stack">
          <input
            value={projectForm.title}
            onChange={(event) => setProjectForm({ ...projectForm, title: event.target.value })}
            placeholder="프로젝트 이름"
          />
          <input
            value={projectForm.category}
            onChange={(event) => setProjectForm({ ...projectForm, category: event.target.value })}
            placeholder="카테고리"
          />
          <textarea
            value={projectForm.description}
            onChange={(event) =>
              setProjectForm({ ...projectForm, description: event.target.value })
            }
            placeholder="무엇을 만들었고 어떤 피드백이 필요한가요?"
            rows="4"
          />
          <button
            className="primary-action"
            disabled={isBusy || !projectForm.title.trim()}
            onClick={async () => {
              await onCreateProject(projectForm);
              setProjectForm(emptyProject);
            }}
          >
            <Plus size={16} />
            프로젝트 생성
          </button>
        </div>

        <div className="project-list">
          {data.projects.map((project) => (
            <article
              className={`project-row ${project.id === selectedProjectId ? "active" : ""}`}
              key={project.id}
            >
              <button onClick={() => onSelectProject(project.id)}>
                <span>{project.category}</span>
                <strong>{project.title}</strong>
                <small>{project.description}</small>
              </button>
              <button className="icon-danger" onClick={() => onDeleteProject(project.id)}>
                <Trash2 size={15} />
              </button>
            </article>
          ))}
        </div>
      </section>

      {selectedProject ? (
        <section className="workspace-grid">
          <div className="panel project-main">
            <PanelTitle eyebrow={selectedProject.category} title={selectedProject.title} />
            <p className="project-description">{selectedProject.description}</p>

            <div className="upload-zone">
              <label>
                <UploadCloud size={18} />
                <span>파일/이미지 업로드</span>
                <input
                  multiple
                  type="file"
                  onChange={(event) => {
                    if (event.target.files?.length) onUploadFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
              <div className="link-form">
                <input
                  value={linkForm.title}
                  onChange={(event) => setLinkForm({ ...linkForm, title: event.target.value })}
                  placeholder="링크 이름"
                />
                <input
                  value={linkForm.url}
                  onChange={(event) => setLinkForm({ ...linkForm, url: event.target.value })}
                  placeholder="https://"
                />
                <button
                  disabled={!linkForm.title.trim() || !linkForm.url.trim()}
                  onClick={async () => {
                    await onAddLink(linkForm);
                    setLinkForm(emptyLink);
                  }}
                >
                  <LinkIcon size={16} />
                </button>
              </div>
            </div>

            <div className="file-browser">
              <div className="file-list">
                <h3>업로드된 파일과 링크</h3>
                {projectFiles.map((file) => (
                  <button
                    className={`file-row ${selectedFile?.id === file.id ? "active" : ""}`}
                    key={file.id}
                    onClick={() => onSelectFile(file.id)}
                  >
                    {file.resource_type === "image" ? <FileImage size={18} /> : <FileCode2 size={18} />}
                    <span>
                      <strong>{file.original_name}</strong>
                      <small>
                        {file.resource_type === "link" ? "링크" : `${formatBytes(file.size_bytes)} / v${file.version_number}`}
                      </small>
                    </span>
                  </button>
                ))}
              </div>

              <div className="file-viewer">
                {selectedFile ? (
                  <>
                    <div className="file-viewer-header">
                      <div>
                        <span>파일 뷰어</span>
                        <strong>{selectedFile.original_name}</strong>
                      </div>
                      {selectedFile.external_url && (
                        <a href={selectedFile.external_url} target="_blank" rel="noreferrer">
                          <ExternalLink size={16} />
                          열기
                        </a>
                      )}
                    </div>
                    {isFileLoading ? (
                      <p className="muted">파일을 불러오는 중입니다.</p>
                    ) : selectedFile.resource_type === "image" ? (
                      <img className="preview-image" src={filePreview} alt={selectedFile.original_name} />
                    ) : selectedFile.resource_type === "link" ? (
                      <a className="big-link" href={filePreview} target="_blank" rel="noreferrer">
                        {filePreview}
                      </a>
                    ) : (
                      <pre>{filePreview}</pre>
                    )}

                    <div className="version-history">
                      <h4>
                        <Clock3 size={15} />
                        버전 히스토리
                      </h4>
                      {versionHistory.map((file) => (
                        <button key={file.id} onClick={() => onSelectFile(file.id)}>
                          v{file.version_number} / {formatDate(file.created_at)}
                        </button>
                      ))}
                    </div>

                    <CommentComposer
                      buttonLabel="파일 피드백 남기기"
                      disabled={!fileComment.trim()}
                      value={fileComment}
                      onChange={setFileComment}
                      onSubmit={async () => {
                        await onAddFileComment(fileComment);
                        setFileComment("");
                      }}
                    />
                    <CommentList comments={fileComments} />
                  </>
                ) : (
                  <div className="empty-state">
                    <FileCode2 />
                    <strong>파일을 선택하면 코드/텍스트 내용을 볼 수 있습니다.</strong>
                    <span>이미지는 미리보기로, 링크는 바로 열 수 있게 표시됩니다.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="side-stack">
            <div className="panel">
              <PanelTitle eyebrow="Live Chat" title="프로젝트 대화" />
              <div className="chat-panel">
                {chats.map((message) => (
                  <p key={message.id}>
                    <strong>{message.author_name}</strong>
                    {message.body}
                  </p>
                ))}
              </div>
              <CommentComposer
                buttonLabel="보내기"
                disabled={!chatMessage.trim()}
                icon={<Send size={16} />}
                value={chatMessage}
                onChange={setChatMessage}
                onSubmit={async () => {
                  await onSendChat(chatMessage);
                  setChatMessage("");
                }}
              />
            </div>

            <div className="panel">
              <PanelTitle eyebrow="Updates" title="프로젝트 업데이트" />
              <div className="form-stack compact">
                <input
                  value={updateForm.title}
                  onChange={(event) => setUpdateForm({ ...updateForm, title: event.target.value })}
                  placeholder="업데이트 제목"
                />
                <textarea
                  value={updateForm.body}
                  onChange={(event) => setUpdateForm({ ...updateForm, body: event.target.value })}
                  placeholder="오늘 무엇을 고쳤나요?"
                  rows="3"
                />
                <button
                  className="secondary-action"
                  disabled={!updateForm.title.trim()}
                  onClick={async () => {
                    await onPostUpdate(updateForm);
                    setUpdateForm(emptyUpdate);
                  }}
                >
                  업데이트 게시
                </button>
              </div>
              <FeedList items={updates} />
            </div>

            <div className="panel">
              <PanelTitle eyebrow="Comments" title="프로젝트 댓글" />
              <CommentComposer
                buttonLabel="프로젝트 댓글 남기기"
                disabled={!projectComment.trim()}
                value={projectComment}
                onChange={setProjectComment}
                onSubmit={async () => {
                  await onPostProjectComment(projectComment);
                  setProjectComment("");
                }}
              />
              <CommentList comments={projectComments} />
            </div>

            <div className="panel">
              <PanelTitle eyebrow="Activity" title="활동 로그" />
              <FeedList items={activities} />
            </div>
          </aside>
        </section>
      ) : (
        <section className="panel empty-panel">
          <MessageSquare />
          <h3>먼저 프로젝트를 만들어주세요.</h3>
          <p>프로젝트 안에서 파일, 링크, 이미지, 댓글, 업데이트, 채팅이 연결됩니다.</p>
        </section>
      )}
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

function CommentComposer({ buttonLabel, disabled, icon, onChange, onSubmit, value }) {
  return (
    <div className="comment-composer">
      <textarea
        value={value}
        rows="3"
        onChange={(event) => onChange(event.target.value)}
        placeholder="댓글을 입력하세요"
      />
      <button disabled={disabled} onClick={onSubmit}>
        {icon}
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
          <span>{formatDate(comment.created_at)}</span>
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
          <strong>{item.title || item.message}</strong>
          {item.body && <p>{item.body}</p>}
          <span>{item.author_name || item.actor_name || "A&I"} / {formatDate(item.created_at)}</span>
        </article>
      ))}
    </div>
  );
}

function formatBytes(bytes = 0) {
  if (!bytes) return "0B";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
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

export default ProjectHub;
