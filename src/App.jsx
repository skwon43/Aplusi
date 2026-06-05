import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  Home,
  Lightbulb,
  Megaphone,
  Menu,
  MessageCircle,
  Plus,
  Reply,
  Search,
  Send,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  createRecord,
  deleteContentBundle,
  deleteCommunityPostBundle,
  deleteProjectBundle,
  getProjectFileBlob,
  loadAllData,
  subscribeToChatMessages,
  updateRecord,
  uploadProjectFile,
  uploadThumbnail,
} from "./db";
import LogoBlock from "./components/LogoBlock";
import { createZipBlob } from "./zip";
import "./App.css";

const defaultProjectThumbnail = "/assets/default-project-thumbnail.png";
const heroBuilderImage = "/assets/ai-hero-builder.png";
const categoryTabs = ["All", "Web", "App", "Prompt", "Tool", "Game"];
const communityCategories = ["자유", "질문", "공유", "도움요청"];
const feedbackTypes = ["유용해요", "버그", "제안", "멋져요"];
const projectTabs = [
  { id: "intro", label: "소개" },
  { id: "files", label: "파일" },
  { id: "feedback", label: "피드백" },
  { id: "updates", label: "업데이트" },
];
const topLevelMenuItems = [
  { label: "홈", path: "/", icon: Home },
  { label: "프로젝트", path: "/projects", icon: FileArchive },
  { label: "아이디어", path: "/ideas", icon: Lightbulb },
  { label: "인사이트", path: "/insights", icon: BookOpen },
  { label: "공지사항", path: "/announcements", icon: Megaphone },
  { label: "커뮤니티", path: "/community", icon: Users },
  { label: "채팅방", path: "/chat", icon: MessageCircle },
];

const contentConfig = {
  ideas: {
    badge: "아이디어",
    ctaLabel: "아이디어 작성",
    createSuccess: "아이디어가 작성되었습니다",
    createTitle: "아이디어 작성",
    deleteConfirm: "이 아이디어와 댓글을 삭제할까요?",
    deleteSuccess: "아이디어가 삭제되었습니다",
    detailBackLabel: "아이디어로 돌아가기",
    title: "아이디어",
    definition: "VibeCoding으로 만들고 싶은 아이디어를 공유하세요.",
    editTitle: "아이디어 수정",
    emptyBody: "아직 공유된 아이디어가 없습니다. 첫 번째 아이디어를 남겨보세요.",
    emptyTitle: "아직 아이디어가 없습니다",
    formDescription: "초기 앱 컨셉, 프롬프트, 워크플로우, 나중에 만들고 싶은 것을 남겨 주세요.",
    targetType: "idea",
    updateSuccess: "아이디어가 수정되었습니다",
  },
  insights: {
    badge: "인사이트",
    ctaLabel: "인사이트 작성",
    createSuccess: "인사이트가 작성되었습니다",
    createTitle: "인사이트 작성",
    deleteConfirm: "이 인사이트와 댓글을 삭제할까요?",
    deleteSuccess: "인사이트가 삭제되었습니다",
    detailBackLabel: "인사이트로 돌아가기",
    title: "인사이트",
    definition: "AI 트렌드, 툴 사용기, 빌딩 경험을 나누는 공간입니다.",
    editTitle: "인사이트 수정",
    emptyBody: "아직 인사이트가 없습니다. 배운 점이나 AI 트렌드를 공유해보세요.",
    emptyTitle: "아직 인사이트가 없습니다",
    formDescription: "AI 트렌드, 툴 학습, 빌딩 경험, 시장 관찰을 정리해 주세요.",
    hasSourceUrl: true,
    targetType: "insight",
    updateSuccess: "인사이트가 수정되었습니다",
  },
  announcements: {
    badge: "공지사항",
    ctaLabel: "공지 작성",
    createSuccess: "공지사항이 작성되었습니다",
    createTitle: "공지 작성",
    deleteConfirm: "이 공지사항과 댓글을 삭제할까요?",
    deleteSuccess: "공지사항이 삭제되었습니다",
    detailBackLabel: "공지사항으로 돌아가기",
    title: "공지사항",
    definition: "A&I의 업데이트와 중요한 소식을 확인하세요.",
    editTitle: "공지사항 수정",
    emptyBody: "아직 공지사항이 없습니다.",
    emptyTitle: "아직 공지사항이 없습니다",
    formDescription: "A&I 업데이트, 릴리즈 노트, 운영 안내를 남겨 주세요.",
    targetType: "announcement",
    updateSuccess: "공지사항이 수정되었습니다",
  },
};
const contentCollections = Object.keys(contentConfig);

function App() {
  const [route, setRoute] = useState(readRoute);
  const [data, setData] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [detailTab, setDetailTab] = useState("intro");

  const refresh = useCallback(async () => {
    const result = await loadAllData();
    setData(result.data);
    return result.data;
  }, []);

  useEffect(() => {
    refresh().catch((error) => {
      setToast({ tone: "error", title: "데이터를 불러오지 못했습니다", body: error.message });
    });
  }, [refresh]);

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    const isProjectDetail =
      route.segments[0] === "projects" && Boolean(route.segments[1]) && route.segments[1] !== "new";
    const requestedTab = route.query.get("tab");
    setDetailTab(
      isProjectDetail && projectTabs.some((tab) => tab.id === requestedTab) ? requestedTab : "intro",
    );
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [route.pathname, route.search, route.query, route.segments]);

  function navigate(path) {
    if (path === `${route.pathname}${route.search}`) return;
    window.history.pushState({}, "", path);
    setRoute(readRoute());
  }

  function showToast(tone, title, body = "") {
    setToast({ tone, title, body });
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(null), 3200);
  }

  async function runTask(task, successTitle, successBody = "") {
    setIsBusy(true);
    try {
      const result = await task();
      await refresh();
      showToast("success", successTitle, successBody);
      return result;
    } catch (error) {
      showToast("error", "처리하지 못했습니다", error.message);
      return null;
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateProject(form) {
    const project = await runTask(
      async () => {
        const thumbnailUrl = await uploadThumbnail(form.thumbnailFile);
        const savedProject = await createRecord("projects", {
          title: form.title.trim(),
          builder_name: form.builder_name.trim(),
          description: form.description.trim(),
          category: form.category,
          thumbnail_url: thumbnailUrl,
          demo_url: form.demo_url.trim(),
          github_url: form.github_url.trim(),
        });

        const version = await createRecord("projectVersions", {
          project_id: savedProject.id,
          version_label: form.version_label.trim() || "v1.0",
          change_summary: form.change_summary.trim() || "프로젝트가 등록되었습니다.",
        });

        for (const file of form.files) {
          await uploadProjectFile({ file, versionId: version.id });
        }

        return savedProject;
      },
      "프로젝트가 등록되었습니다",
      "첫 번째 빌더 루프를 시작할 수 있습니다.",
    );

    if (project) navigate(`/projects/${project.id}`);
  }

  async function handleCreateVersion(projectId, form) {
    await runTask(
      async () => {
        const version = await createRecord("projectVersions", {
          project_id: projectId,
          version_label: form.version_label.trim(),
          change_summary: form.change_summary.trim(),
        });

        for (const file of form.files) {
          await uploadProjectFile({ file, versionId: version.id });
        }

        await updateRecord("projects", projectId, {});
      },
      "새 버전이 업로드되었습니다",
      "파일 탭과 업데이트 기록에 반영했습니다.",
    );
  }

  async function handleUpdateProject(projectId, payload) {
    const saved = await runTask(
      () => updateRecord("projects", projectId, payload),
      "프로젝트 정보가 수정되었습니다",
    );
    if (saved) setEditingProject(null);
  }

  async function handleDeleteProject(projectId) {
    if (!window.confirm("이 프로젝트와 연결된 버전, 파일, 피드백을 삭제할까요?")) return;
    const deleted = await runTask(
      () => deleteProjectBundle(projectId),
      "프로젝트가 삭제되었습니다",
    );
    if (deleted !== null) navigate("/projects");
  }

  async function handleCreateComment(projectId, payload) {
    await runTask(
      () =>
        createRecord("comments", {
          target_type: "project",
          target_id: projectId,
          parent_id: payload.parent?.id ?? null,
          depth: payload.parent ? Math.min(Number(payload.parent.depth || 0) + 1, 2) : 0,
          author_name: payload.author_name.trim(),
          body: payload.body.trim(),
          feedback_type: payload.parent ? null : payload.feedback_type,
        }),
      "피드백이 등록되었습니다",
    );
  }

  async function handleCreateCommunityPost(form) {
    const post = await runTask(
      () =>
        createRecord("communityPosts", {
          title: form.title.trim(),
          body: form.body.trim(),
          author_name: form.author_name.trim(),
          category: form.category || communityCategories[0],
        }),
      "커뮤니티 글이 등록되었습니다",
    );

    if (post) navigate(`/community/${post.id}`);
  }

  async function handleUpdateCommunityPost(postId, payload) {
    const post = await runTask(
      () =>
        updateRecord("communityPosts", postId, {
          title: payload.title.trim(),
          body: payload.body.trim(),
          author_name: payload.author_name.trim(),
          category: payload.category || communityCategories[0],
        }),
      "커뮤니티 글이 수정되었습니다",
    );

    if (post) navigate(`/community/${post.id}`);
  }

  async function handleDeleteCommunityPost(postId) {
    if (!window.confirm("이 커뮤니티 글과 댓글을 삭제할까요?")) return;
    const deleted = await runTask(
      () => deleteCommunityPostBundle(postId),
      "커뮤니티 글이 삭제되었습니다",
    );
    if (deleted !== null) navigate("/community");
  }

  async function handleCreateCommunityComment(postId, payload) {
    await runTask(
      () =>
        createRecord("comments", {
          target_type: "community",
          target_id: postId,
          parent_id: payload.parent?.id ?? null,
          depth: payload.parent ? Math.min(Number(payload.parent.depth || 0) + 1, 2) : 0,
          author_name: payload.author_name.trim(),
          body: payload.body.trim(),
          feedback_type: null,
        }),
      "댓글이 등록되었습니다",
    );
  }

  async function handleCreateContent(collection, form) {
    const config = contentConfig[collection];
    if (!config) return;

    const item = await runTask(
      () => createRecord(collection, buildContentPayload(collection, form)),
      config.createSuccess,
    );

    if (item) navigate(`/${collection}/${item.id}`);
  }

  async function handleUpdateContent(collection, itemId, form) {
    const config = contentConfig[collection];
    if (!config) return;

    const item = await runTask(
      () => updateRecord(collection, itemId, buildContentPayload(collection, form)),
      config.updateSuccess,
    );

    if (item) navigate(`/${collection}/${item.id}`);
  }

  async function handleDeleteContent(collection, itemId) {
    const config = contentConfig[collection];
    if (!config || !window.confirm(config.deleteConfirm)) return;

    const deleted = await runTask(
      () => deleteContentBundle(collection, config.targetType, itemId),
      config.deleteSuccess,
    );
    if (deleted !== null) navigate(`/${collection}`);
  }

  async function handleCreateContentComment(collection, itemId, payload) {
    const config = contentConfig[collection];
    if (!config) return;

    await runTask(
      () =>
        createRecord("comments", {
          target_type: config.targetType,
          target_id: itemId,
          parent_id: payload.parent?.id ?? null,
          depth: payload.parent ? Math.min(Number(payload.parent.depth || 0) + 1, 2) : 0,
          author_name: payload.author_name.trim(),
          body: payload.body.trim(),
          feedback_type: null,
        }),
      "댓글이 등록되었습니다",
    );
  }

  async function handleCreateChatMessage(payload) {
    return runTask(
      () =>
        createRecord("chatMessages", {
          author_name: payload.author_name.trim(),
          body: payload.body.trim(),
        }),
      "메시지가 전송되었습니다",
    );
  }

  const handleIncomingChatMessage = useCallback((message) => {
    setData((current) => {
      if (!current || current.chatMessages.some((item) => item.id === message.id)) return current;
      return {
        ...current,
        chatMessages: [message, ...current.chatMessages],
      };
    });
  }, []);

  async function handleDownloadVersion(project, version) {
    const files = getFilesForVersion(data, version?.id);
    await downloadVersion(project, version, files);
  }

  if (!data) {
    return (
      <main className="loading-screen">
        <Sparkles aria-hidden="true" />
        <span>A&I 커뮤니티를 불러오는 중입니다.</span>
      </main>
    );
  }

  const page = renderPage({
    data,
    detailTab,
    isBusy,
    navigate,
    onCreateComment: handleCreateComment,
    onCreateChatMessage: handleCreateChatMessage,
    onCreateCommunityComment: handleCreateCommunityComment,
    onCreateCommunityPost: handleCreateCommunityPost,
    onCreateContent: handleCreateContent,
    onCreateContentComment: handleCreateContentComment,
    onCreateProject: handleCreateProject,
    onCreateVersion: handleCreateVersion,
    onDeleteContent: handleDeleteContent,
    onDeleteCommunityPost: handleDeleteCommunityPost,
    onDeleteProject: handleDeleteProject,
    onDownloadVersion: handleDownloadVersion,
    onEditProject: setEditingProject,
    onIncomingChatMessage: handleIncomingChatMessage,
    onSetDetailTab: setDetailTab,
    onUpdateContent: handleUpdateContent,
    onUpdateCommunityPost: handleUpdateCommunityPost,
    route,
  });

  return (
    <AppShell
      drawerOpen={drawerOpen}
      navigate={navigate}
      onCloseDrawer={() => setDrawerOpen(false)}
      onOpenDrawer={() => setDrawerOpen(true)}
      route={route}
    >
      {page}
      {editingProject && (
        <EditProjectDialog
          isBusy={isBusy}
          onClose={() => setEditingProject(null)}
          onSubmit={(payload) => handleUpdateProject(editingProject.id, payload)}
          project={editingProject}
        />
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </AppShell>
  );
}

function renderPage(context) {
  const { data, navigate, route } = context;
  const [section, id, nested] = route.segments;

  if (!section) {
    return <HomePage data={data} navigate={navigate} />;
  }

  if (section === "projects" && id === "new") {
    return <ProjectCreatePage isBusy={context.isBusy} onSubmit={context.onCreateProject} />;
  }

  if (section === "projects" && id) {
    return (
      <ProjectDetailPage
        data={data}
        detailTab={context.detailTab}
        navigate={navigate}
        onCreateComment={context.onCreateComment}
        onCreateVersion={context.onCreateVersion}
        onDeleteProject={context.onDeleteProject}
        onDownloadVersion={context.onDownloadVersion}
        onEditProject={context.onEditProject}
        onSetDetailTab={context.onSetDetailTab}
        projectId={id}
      />
    );
  }

  if (section === "projects") {
    return <ProjectsPage data={data} navigate={navigate} />;
  }

  if (contentCollections.includes(section) && id === "new") {
    return (
      <ContentFormPage
        collection={section}
        isBusy={context.isBusy}
        mode="create"
        navigate={navigate}
        onSubmit={(payload) => context.onCreateContent(section, payload)}
      />
    );
  }

  if (contentCollections.includes(section) && id && nested === "edit") {
    return (
      <ContentFormPage
        collection={section}
        data={data}
        isBusy={context.isBusy}
        mode="edit"
        navigate={navigate}
        onSubmit={(payload) => context.onUpdateContent(section, id, payload)}
        postId={id}
      />
    );
  }

  if (contentCollections.includes(section) && id) {
    return (
      <ContentDetailPage
        collection={section}
        data={data}
        id={id}
        navigate={navigate}
        onCreateComment={(payload) => context.onCreateContentComment(section, id, payload)}
        onDelete={() => context.onDeleteContent(section, id)}
      />
    );
  }

  if (contentCollections.includes(section)) {
    return <ContentListPage collection={section} data={data} navigate={navigate} />;
  }

  if (section === "search") {
    return <SearchResultsPage data={data} navigate={navigate} query={route.query.get("q") || ""} />;
  }

  if (section === "community" && id === "new") {
    return (
      <CommunityPostFormPage
        isBusy={context.isBusy}
        mode="create"
        navigate={navigate}
        onSubmit={context.onCreateCommunityPost}
      />
    );
  }

  if (section === "community" && id && nested === "edit") {
    return (
      <CommunityPostFormPage
        data={data}
        isBusy={context.isBusy}
        mode="edit"
        navigate={navigate}
        onSubmit={(payload) => context.onUpdateCommunityPost(id, payload)}
        postId={id}
      />
    );
  }

  if (section === "community" && id) {
    return (
      <CommunityPostDetailPage
        data={data}
        navigate={navigate}
        onCreateComment={context.onCreateCommunityComment}
        onDeletePost={context.onDeleteCommunityPost}
        postId={id}
      />
    );
  }

  if (section === "community") {
    return <CommunityListPage data={data} navigate={navigate} />;
  }

  if (section === "chat") {
    return (
      <ChatPage
        data={data}
        isBusy={context.isBusy}
        onIncomingMessage={context.onIncomingChatMessage}
        onSendMessage={context.onCreateChatMessage}
      />
    );
  }

  return <EmptyState title="페이지를 찾을 수 없습니다" body="상단 메뉴에서 다시 이동해 주세요." />;
}

function AppShell({
  children,
  drawerOpen,
  navigate,
  onCloseDrawer,
  onOpenDrawer,
  route,
}) {
  return (
    <div className="app-shell">
      <TopBar navigate={navigate} onOpenDrawer={onOpenDrawer} route={route} />
      <SlideMenuDrawer
        navigate={navigate}
        onClose={onCloseDrawer}
        open={drawerOpen}
        pathname={route.pathname}
      />
      <main className="app-main">{children}</main>
    </div>
  );
}

function TopBar({ navigate, onOpenDrawer, route }) {
  return (
    <header className="topbar">
      <button className="icon-button" type="button" onClick={onOpenDrawer} aria-label="메뉴 열기">
        <Menu size={20} />
      </button>
      <LogoBlock onClick={() => navigate("/")} />
      <SearchBar navigate={navigate} query={route.query.get("q") || ""} />
      <button className="primary-button topbar-cta" type="button" onClick={() => navigate("/projects/new")}>
        <Plus size={17} />
        새 프로젝트 등록
      </button>
    </header>
  );
}

function SlideMenuDrawer({ navigate, onClose, open, pathname }) {
  return (
    <div className={`drawer-layer ${open ? "open" : ""}`} aria-hidden={!open}>
      <button className="drawer-backdrop" type="button" onClick={onClose} aria-label="메뉴 닫기" />
      <aside className="drawer-panel" aria-label="주 메뉴">
        <nav>
          {topLevelMenuItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.path === "/" ? pathname === "/" : pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <button
                className={active ? "active" : ""}
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}

function SearchBar({ navigate, query }) {
  const [value, setValue] = useState(query);

  useEffect(() => {
    setValue(query);
  }, [query]);

  function submit(event) {
    event.preventDefault();
    const nextQuery = value.trim();
    navigate(nextQuery ? `/search?q=${encodeURIComponent(nextQuery)}` : "/search");
  }

  return (
    <form className="search-bar" role="search" onSubmit={submit}>
      <Search size={17} />
      <input
        aria-label="프로젝트, 아이디어, 인사이트 검색"
        onChange={(event) => setValue(event.target.value)}
        placeholder="프로젝트, 아이디어, 인사이트 검색"
        value={value}
      />
    </form>
  );
}

function HomePage({ data, navigate }) {
  return (
    <div className="page-stack">
      <HeroSection navigate={navigate} />
      <section className="content-section">
        <SectionHeading
          title="최신 빌더 소식"
          description="프로젝트, 아이디어, 커뮤니티, 인사이트, 공지사항을 한 흐름으로 모았습니다."
        />
        <MixedFeedList data={data} navigate={navigate} />
      </section>
    </div>
  );
}

function HeroSection({ navigate }) {
  return (
    <section className="hero-section">
      <div className="hero-copy">
        <h1>AI and I, idea to the world</h1>
        <p>AI와 함께, 아이디어를 현실로</p>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={() => navigate("/projects/new")}>
            <Plus size={17} />
            프로젝트 등록
          </button>
          <button className="secondary-button" type="button" onClick={() => navigate("/ideas")}>
            아이디어 둘러보기
          </button>
        </div>
      </div>
      <div className="hero-visual" aria-label="A&I builder community visual">
        <img src={heroBuilderImage} alt="" />
      </div>
    </section>
  );
}

function MixedFeedList({ data, navigate }) {
  const feed = useMemo(() => buildMixedFeed(data).slice(0, 12), [data]);

  if (!feed.length) {
    return <EmptyState title="아직 새 소식이 없습니다" body="첫 프로젝트를 등록하고 빌더 루프를 시작해 보세요." />;
  }

  return (
    <div className="feed-list">
      {feed.map((item) => (
        <FeedItemRow item={item} key={item.key} navigate={navigate} />
      ))}
    </div>
  );
}

function FeedItemRow({ item, navigate }) {
  return (
    <button className="feed-row" type="button" onClick={() => navigate(item.path)}>
      <span className={`type-dot ${item.type}`} />
      <span className="feed-main">
        <strong>{item.title}</strong>
        <small>
          <Badge>{item.badge}</Badge>
          {item.author}
          <span aria-hidden="true">·</span>
          <RelativeTimeText value={item.time} />
          {typeof item.commentCount === "number" && (
            <>
              <span aria-hidden="true">·</span>
              <span>댓글 {item.commentCount}</span>
            </>
          )}
          {item.sourceUrl && (
            <>
              <span aria-hidden="true">·</span>
              <span>출처 있음</span>
            </>
          )}
        </small>
        {item.excerpt && <em>{item.excerpt}</em>}
      </span>
      <ChevronRight size={17} />
    </button>
  );
}

function ProjectsPage({ data, navigate }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const projects = useMemo(() => {
    const sorted = sortByRecent(data.projects);
    if (activeCategory === "All") return sorted;
    return sorted.filter((project) => project.category === activeCategory);
  }, [activeCategory, data.projects]);

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <button className="primary-button" type="button" onClick={() => navigate("/projects/new")}>
            <Plus size={17} />
            새 프로젝트 등록
          </button>
        }
        description="다운로드하고 실행해 보고 피드백을 남기는 프로젝트 발견 공간입니다."
        title="프로젝트"
      />
      <ProjectTabs active={activeCategory} onChange={setActiveCategory} />
      <ProjectList data={data} navigate={navigate} projects={projects} />
    </div>
  );
}

function ProjectTabs({ active, onChange }) {
  return (
    <div className="category-tabs" role="tablist" aria-label="프로젝트 카테고리">
      {categoryTabs.map((category) => (
        <button
          aria-selected={active === category}
          className={active === category ? "active" : ""}
          key={category}
          type="button"
          onClick={() => onChange(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

function ProjectList({ data, navigate, projects }) {
  if (!projects.length) {
    return <EmptyState title="조건에 맞는 프로젝트가 없습니다" body="다른 카테고리를 선택하거나 새 프로젝트를 등록해 보세요." />;
  }

  return (
    <div className="project-list">
      {projects.map((project) => (
        <ProjectCard data={data} key={project.id} navigate={navigate} project={project} />
      ))}
    </div>
  );
}

function ProjectCard({ data, navigate, project }) {
  const versions = getVersionsForProject(data, project.id);
  const files = versions.flatMap((version) => getFilesForVersion(data, version.id));
  const commentCount = getProjectComments(data, project.id).length;

  return (
    <article className="project-card">
      <button
        className="thumbnail-button"
        type="button"
        onClick={() => navigate(`/projects/${project.id}`)}
        aria-label={`${project.title} 상세 보기`}
      >
        <img
          alt=""
          className={project.thumbnail_url ? "thumbnail-image" : "thumbnail-image thumbnail-image--fallback"}
          src={project.thumbnail_url || defaultProjectThumbnail}
        />
      </button>
      <div className="project-card-body">
        <div className="project-title-line">
          <button type="button" onClick={() => navigate(`/projects/${project.id}`)}>
            {project.title}
          </button>
          <Badge>{project.category}</Badge>
        </div>
        <p>{project.description}</p>
        <div className="meta-row">
          <span>{project.builder_name}</span>
          <span>댓글 {commentCount}</span>
          <RelativeTimeText value={project.updated_at || project.created_at} />
          {project.demo_url && <Badge tone="sky">데모 있음</Badge>}
          {files.length > 0 && <Badge tone="mint">파일 첨부</Badge>}
        </div>
      </div>
    </article>
  );
}

function ProjectCreatePage({ isBusy, onSubmit }) {
  return (
    <div className="narrow-page">
      <PageHeader
        description="파일이 있다면 첫 버전 정보까지 함께 남겨 주세요."
        title="새 프로젝트 등록"
      />
      <ProjectForm isBusy={isBusy} onSubmit={onSubmit} />
    </div>
  );
}

function ProjectForm({ isBusy, onSubmit }) {
  const [form, setForm] = useState({
    title: "",
    builder_name: "",
    description: "",
    category: "Web",
    thumbnailFile: null,
    thumbnailPreview: "",
    demo_url: "",
    github_url: "",
    files: [],
    version_label: "",
    change_summary: "",
  });

  const filesNeedVersion = form.files.length > 0;
  const versionReady = !filesNeedVersion || (form.version_label.trim() && form.change_summary.trim());
  const isReady =
    form.title.trim() &&
    form.builder_name.trim() &&
    form.description.trim() &&
    versionReady &&
    !isBusy;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleThumbnail(file) {
    if (!file) return;
    update("thumbnailFile", file);
    update("thumbnailPreview", URL.createObjectURL(file));
  }

  function handleFiles(fileList) {
    update("files", Array.from(fileList || []));
  }

  function submit(event) {
    event.preventDefault();
    if (!isReady) return;
    onSubmit(form);
  }

  return (
    <form className="project-form" onSubmit={submit}>
      <label className="field thumbnail-field">
        <span>썸네일</span>
        <img
          alt="프로젝트 썸네일 미리보기"
          className={form.thumbnailPreview ? "thumbnail-image" : "thumbnail-image thumbnail-image--fallback"}
          src={form.thumbnailPreview || defaultProjectThumbnail}
        />
        <input accept="image/*" type="file" onChange={(event) => handleThumbnail(event.target.files?.[0])} />
        <small>업로드하지 않으면 A&I 기본 썸네일을 사용합니다.</small>
      </label>

      <div className="form-grid">
        <TextField label="프로젝트 이름" value={form.title} onChange={(value) => update("title", value)} />
        <TextField label="빌더 이름" value={form.builder_name} onChange={(value) => update("builder_name", value)} />
        <label className="field">
          <span>카테고리</span>
          <select value={form.category} onChange={(event) => update("category", event.target.value)}>
            {categoryTabs.slice(1).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="field span-2">
          <span>설명</span>
          <textarea
            rows="5"
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="무엇을 만들었고, 다른 빌더가 어떻게 실행하면 되는지 적어 주세요."
          />
        </label>
        <TextField label="데모 URL" optional value={form.demo_url} onChange={(value) => update("demo_url", value)} />
        <TextField label="GitHub URL" optional value={form.github_url} onChange={(value) => update("github_url", value)} />
        <label className="field span-2 file-picker">
          <span>첫 버전 파일</span>
          <input multiple type="file" onChange={(event) => handleFiles(event.target.files)} />
          <strong>
            <Upload size={17} />
            파일 선택
          </strong>
          <small>{form.files.length ? `${form.files.length}개 파일 선택됨` : "코드, 문서, 이미지, 압축 파일을 올릴 수 있습니다."}</small>
        </label>
        <TextField
          label="버전 라벨"
          optional={!filesNeedVersion}
          placeholder="예: v1.0"
          value={form.version_label}
          onChange={(value) => update("version_label", value)}
        />
        <label className="field">
          <span>
            변경 요약
            {!filesNeedVersion && <em>선택</em>}
          </span>
          <textarea
            rows="3"
            value={form.change_summary}
            onChange={(event) => update("change_summary", event.target.value)}
            placeholder="이번 버전에서 바뀐 점을 짧게 적어 주세요."
          />
        </label>
        {filesNeedVersion && !versionReady && (
          <p className="form-helper span-2">파일을 올릴 때는 버전 라벨과 변경 요약이 필요합니다.</p>
        )}
        <div className="form-actions span-2">
          <button className="primary-button" disabled={!isReady} type="submit">
            <Plus size={17} />
            프로젝트 등록
          </button>
        </div>
      </div>
    </form>
  );
}

function ProjectDetailPage({
  data,
  detailTab,
  navigate,
  onCreateComment,
  onCreateVersion,
  onDeleteProject,
  onDownloadVersion,
  onEditProject,
  onSetDetailTab,
  projectId,
}) {
  const project = data.projects.find((item) => item.id === projectId);

  if (!project) {
    return <EmptyState title="프로젝트를 찾을 수 없습니다" body="삭제되었거나 주소가 잘못되었을 수 있습니다." />;
  }

  const versions = getVersionsForProject(data, project.id);
  const latestVersion = versions[0] || null;
  const comments = getProjectComments(data, project.id);

  return (
    <div className="page-stack">
      <button className="text-button" type="button" onClick={() => navigate("/projects")}>
        <ChevronRight className="flip-icon" size={16} />
        프로젝트로 돌아가기
      </button>
      <ProjectDetailHeader
        comments={comments}
        data={data}
        latestVersion={latestVersion}
        onDeleteProject={onDeleteProject}
        onDownloadVersion={onDownloadVersion}
        onEditProject={onEditProject}
        onSetDetailTab={onSetDetailTab}
        project={project}
      />
      <ProjectTabsSection active={detailTab} onChange={onSetDetailTab} />
      {detailTab === "intro" && <ProjectIntro project={project} />}
      {detailTab === "files" && (
        <ProjectVersionsList
          data={data}
          onCreateVersion={(form) => onCreateVersion(project.id, form)}
          onDownloadVersion={(version) => onDownloadVersion(project, version)}
          project={project}
          versions={versions}
        />
      )}
      {detailTab === "feedback" && (
        <section className="content-section" id="project-feedback">
          <SectionHeading title="피드백" description="다운로드하거나 데모를 본 뒤 짧게 남겨 주세요." />
          <CommentComposer onSubmit={(payload) => onCreateComment(project.id, payload)} />
          <CommentThread comments={comments} onReply={(payload) => onCreateComment(project.id, payload)} />
        </section>
      )}
      {detailTab === "updates" && <ProjectUpdates data={data} project={project} versions={versions} />}
    </div>
  );
}

function ProjectDetailHeader({
  comments,
  data,
  latestVersion,
  onDeleteProject,
  onDownloadVersion,
  onEditProject,
  onSetDetailTab,
  project,
}) {
  const fileCount = latestVersion ? getFilesForVersion(data, latestVersion.id).length : 0;

  return (
    <section className="detail-header">
      <img
        alt=""
        className={project.thumbnail_url ? "detail-thumb" : "detail-thumb detail-thumb--fallback"}
        src={project.thumbnail_url || defaultProjectThumbnail}
      />
      <div className="detail-copy">
        <div className="detail-meta-line">
          <InitialAvatar name={project.builder_name} />
          <span>{project.builder_name}</span>
          <Badge>{project.category}</Badge>
          <RelativeTimeText value={project.updated_at || project.created_at} />
        </div>
        <h1>{project.title}</h1>
        <p>{project.description}</p>
        <ProjectActionBar
          fileCount={fileCount}
          latestVersion={latestVersion}
          onDeleteProject={() => onDeleteProject(project.id)}
          onDownload={() => onDownloadVersion(project, latestVersion)}
          onEditProject={() => onEditProject(project)}
          onFeedback={() => onSetDetailTab("feedback")}
          project={project}
        />
      </div>
      <div className="detail-counts">
        <InfoStat label="댓글" value={comments.length} />
        <InfoStat label="버전" value={getVersionsForProject(data, project.id).length} />
        <InfoStat label="최신 파일" value={fileCount} />
      </div>
    </section>
  );
}

function ProjectActionBar({
  fileCount,
  latestVersion,
  onDeleteProject,
  onDownload,
  onEditProject,
  onFeedback,
  project,
}) {
  const runnableLabel = getRunnableLabel(project);

  return (
    <div className="action-bar">
      <button className="primary-button" type="button" onClick={onDownload}>
        <Download size={17} />
        다운로드
      </button>
      <button className="secondary-button" type="button" onClick={onFeedback}>
        <MessageCircle size={17} />
        피드백 남기기
      </button>
      {project.demo_url && (
        <a className="secondary-button" href={project.demo_url} target="_blank" rel="noreferrer">
          <ExternalLink size={17} />
          {runnableLabel}
        </a>
      )}
      {project.category === "Prompt" && (
        <button className="secondary-button" disabled type="button">
          <Copy size={17} />
          프롬프트 복사
        </button>
      )}
      {!project.demo_url && ["Tool", "Game"].includes(project.category) && (
        <button className="secondary-button" type="button" onClick={onDownload}>
          <Download size={17} />
          다운로드
        </button>
      )}
      <button className="ghost-button" type="button" onClick={onEditProject}>
        수정
      </button>
      <button className="danger-text-button" type="button" onClick={onDeleteProject}>
        삭제
      </button>
      {latestVersion && <span className="action-note">{latestVersion.version_label} · 파일 {fileCount}개</span>}
    </div>
  );
}

function ProjectTabsSection({ active, onChange }) {
  return (
    <div className="detail-tabs" role="tablist" aria-label="프로젝트 상세 탭">
      {projectTabs.map((tab) => (
        <button
          aria-selected={active === tab.id}
          className={active === tab.id ? "active" : ""}
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ProjectIntro({ project }) {
  return (
    <section className="content-section prose-section">
      <SectionHeading title="소개" description="프로젝트를 이해하고 실행하기 위한 기본 정보입니다." />
      <p>{project.description}</p>
      <dl className="info-list">
        <div>
          <dt>빌더</dt>
          <dd>{project.builder_name}</dd>
        </div>
        <div>
          <dt>카테고리</dt>
          <dd>{project.category}</dd>
        </div>
        {project.demo_url && (
          <div>
            <dt>데모</dt>
            <dd>
              <a href={project.demo_url} target="_blank" rel="noreferrer">
                {project.demo_url}
              </a>
            </dd>
          </div>
        )}
        {project.github_url && (
          <div>
            <dt>GitHub</dt>
            <dd>
              <a href={project.github_url} target="_blank" rel="noreferrer">
                {project.github_url}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function ProjectVersionsList({ data, onCreateVersion, onDownloadVersion, project, versions }) {
  const [openUpload, setOpenUpload] = useState(false);
  const latest = versions[0];
  const previous = versions.slice(1);

  return (
    <section className="content-section">
      <div className="section-head-row">
        <SectionHeading title="파일" description="버전마다 파일을 분리해 다운로드할 수 있습니다." />
        <button className="secondary-button" type="button" onClick={() => setOpenUpload((value) => !value)}>
          <Upload size={17} />
          새 버전 업로드
        </button>
      </div>
      {openUpload && (
        <VersionUploadForm
          onCancel={() => setOpenUpload(false)}
          onSubmit={async (form) => {
            await onCreateVersion(form);
            setOpenUpload(false);
          }}
        />
      )}
      {!latest && <EmptyState title="아직 파일 버전이 없습니다" body="새 버전을 올려 다운로드 루프를 시작해 보세요." />}
      {latest && (
        <div className="version-stack">
          <div>
            <h3 className="version-group-title">최신 버전</h3>
            <ProjectVersionCard
              files={getFilesForVersion(data, latest.id)}
              isLatest
              onDownload={() => onDownloadVersion(latest)}
              project={project}
              version={latest}
            />
          </div>
          {previous.length > 0 && (
            <div>
              <h3 className="version-group-title">이전 버전</h3>
              {previous.map((version) => (
                <ProjectVersionCard
                  files={getFilesForVersion(data, version.id)}
                  key={version.id}
                  onDownload={() => onDownloadVersion(version)}
                  project={project}
                  version={version}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function VersionUploadForm({ onCancel, onSubmit }) {
  const [form, setForm] = useState({ version_label: "", change_summary: "", files: [] });
  const ready = form.version_label.trim() && form.change_summary.trim() && form.files.length > 0;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (ready) onSubmit(form);
  }

  return (
    <form className="version-upload" onSubmit={submit}>
      <TextField label="버전 라벨" placeholder="예: v1.1" value={form.version_label} onChange={(value) => update("version_label", value)} />
      <label className="field">
        <span>변경 요약</span>
        <textarea
          rows="3"
          value={form.change_summary}
          onChange={(event) => update("change_summary", event.target.value)}
          placeholder="이번 버전에서 바뀐 점을 적어 주세요."
        />
      </label>
      <label className="field file-picker">
        <span>업로드 파일</span>
        <input multiple type="file" onChange={(event) => update("files", Array.from(event.target.files || []))} />
        <strong>
          <Upload size={17} />
          파일 선택
        </strong>
        <small>{form.files.length ? `${form.files.length}개 파일 선택됨` : "새 버전에 포함할 파일을 선택해 주세요."}</small>
      </label>
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          닫기
        </button>
        <button className="primary-button" disabled={!ready} type="submit">
          버전 업로드
        </button>
      </div>
    </form>
  );
}

function ProjectVersionCard({ files, isLatest = false, onDownload, version }) {
  return (
    <article className={`version-card ${isLatest ? "latest" : ""}`}>
      <div className="version-card-head">
        <div>
          <strong>{version.version_label}</strong>
          <small>
            <RelativeTimeText value={version.created_at} /> · 파일 {files.length}개
          </small>
        </div>
        <button className="secondary-button" type="button" onClick={onDownload}>
          <Download size={16} />
          다운로드
        </button>
      </div>
      <p>{version.change_summary}</p>
      <ul className="file-list">
        {files.length ? (
          files.map((file) => (
            <li key={file.id}>
              <FileText size={16} />
              <span>{file.file_name}</span>
              <small>{formatBytes(file.file_size)}</small>
            </li>
          ))
        ) : (
          <li>
            <FileText size={16} />
            <span>첨부 파일 없음</span>
            <small>0 B</small>
          </li>
        )}
      </ul>
    </article>
  );
}

function CommentComposer({ feedbackEnabled = true, onSubmit, parent = null }) {
  const [authorName, setAuthorName] = useState(localStorage.getItem("a-and-i-commenter") || "");
  const [feedbackType, setFeedbackType] = useState(feedbackTypes[0]);
  const [body, setBody] = useState("");
  const isReply = Boolean(parent);
  const showFeedbackSelector = feedbackEnabled && !isReply;

  function submit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextAuthorName = String(formData.get("author_name") || "").trim();
    const nextBody = String(formData.get("body") || "").trim();
    if (!nextAuthorName || !nextBody) return;
    localStorage.setItem("a-and-i-commenter", nextAuthorName);
    onSubmit({
      author_name: nextAuthorName,
      body: nextBody,
      feedback_type: showFeedbackSelector ? feedbackType : null,
      parent,
    });
    setBody("");
  }

  return (
    <form className={`comment-composer ${isReply ? "reply" : ""}`} onSubmit={submit}>
      {showFeedbackSelector && (
        <div className="feedback-selector" aria-label="피드백 유형">
          {feedbackTypes.map((type) => (
            <button
              className={feedbackType === type ? "active" : ""}
              key={type}
              type="button"
              onClick={() => setFeedbackType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      )}
      <div className="comment-fields">
        <input
          aria-label="작성자 이름"
          name="author_name"
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder="이름"
          required
          value={authorName}
        />
        <textarea
          aria-label={isReply ? "답글" : feedbackEnabled ? "피드백" : "댓글"}
          name="body"
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            isReply
              ? "답글을 남겨 주세요."
              : feedbackEnabled
                ? "실행해 본 점, 버그, 제안을 남겨 주세요."
                : "댓글을 남겨 주세요."
          }
          required
          rows={isReply ? 2 : 4}
          value={body}
        />
      </div>
      <div className="comment-actions">
        <button className="primary-button" type="submit">
          <Send size={16} />
          {isReply ? "답글 등록" : feedbackEnabled ? "피드백 등록" : "댓글 등록"}
        </button>
      </div>
    </form>
  );
}

function CommentThread({
  comments,
  emptyBody = "첫 피드백을 남겨 프로젝트를 함께 다듬어 보세요.",
  emptyTitle = "아직 피드백이 없습니다",
  feedbackEnabled = true,
  onReply,
}) {
  const tree = useMemo(() => buildCommentTree(comments), [comments]);

  if (!comments.length) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <div className="comment-thread">
      {tree.map((comment) => (
        <CommentItem comment={comment} feedbackEnabled={feedbackEnabled} key={comment.id} onReply={onReply} />
      ))}
    </div>
  );
}

function CommentItem({ comment, feedbackEnabled, onReply }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const canReply = Number(comment.depth || 0) < 2;

  return (
    <article className={`comment-item depth-${comment.depth || 0}`}>
      <div className="comment-main">
        <InitialAvatar name={comment.author_name} />
        <div>
          <div className="comment-meta">
            <strong>{comment.author_name}</strong>
            <RelativeTimeText value={comment.created_at} />
            {comment.feedback_type && <Badge tone="sky">{comment.feedback_type}</Badge>}
          </div>
          <p>{comment.body}</p>
          {canReply && (
            <button className="text-button" type="button" onClick={() => setReplyOpen((value) => !value)}>
              <Reply size={15} />
              답글
            </button>
          )}
          {replyOpen && (
            <CommentComposer
              feedbackEnabled={feedbackEnabled}
              parent={comment}
              onSubmit={(payload) => {
                onReply(payload);
                setReplyOpen(false);
              }}
            />
          )}
        </div>
      </div>
      {comment.children?.length > 0 && (
        <div className="comment-children">
          {comment.children.map((child) => (
            <CommentItem comment={child} feedbackEnabled={feedbackEnabled} key={child.id} onReply={onReply} />
          ))}
        </div>
      )}
    </article>
  );
}

function ProjectUpdates({ data, project, versions }) {
  const items = [
    {
      key: "created",
      time: project.created_at,
      title: "프로젝트 생성",
      body: `${project.builder_name}님이 프로젝트를 등록했습니다.`,
    },
    ...versions.map((version) => {
      const files = getFilesForVersion(data, version.id);
      return {
        key: version.id,
        time: version.created_at,
        title: `${version.version_label} 업로드`,
        body: `${version.change_summary} · 파일 ${files.length}개 추가`,
      };
    }),
  ].sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));

  return (
    <section className="content-section">
      <SectionHeading title="업데이트" description="버전 업로드와 주요 변경 흐름을 시간순으로 보여 줍니다." />
      <div className="timeline">
        {items.map((item) => (
          <article className="timeline-item" key={item.key}>
            <span className="timeline-dot" />
            <div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              <small>{formatAbsoluteDate(item.time)}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CommunityListPage({ data, navigate }) {
  const posts = useMemo(() => sortByRecent(data.communityPosts), [data.communityPosts]);

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <button className="primary-button" type="button" onClick={() => navigate("/community/new")}>
            <Plus size={17} />
            글 작성
          </button>
        }
        description="AI 라이프, 질문, 작은 발견, 생각을 자유롭게 나누세요."
        title="커뮤니티"
      />
      {posts.length ? (
        <div className="community-list">
          {posts.map((post) => (
            <CommunityPostCard data={data} key={post.id} navigate={navigate} post={post} />
          ))}
        </div>
      ) : (
        <EmptyState title="아직 커뮤니티 글이 없습니다" body="자유롭게 첫 글을 남겨보세요." />
      )}
    </div>
  );
}

function CommunityPostCard({ data, navigate, post }) {
  const comments = getCommunityComments(data, post.id);

  return (
    <article className="community-card">
      <button type="button" onClick={() => navigate(`/community/${post.id}`)}>
        <span className="community-card-main">
          <span className="community-title-line">
            <strong>{post.title}</strong>
            {post.category && <Badge tone="sky">{post.category}</Badge>}
          </span>
          <em>{excerpt(post.body)}</em>
          <span className="meta-row">
            <span>{post.author_name}</span>
            <RelativeTimeText value={post.updated_at || post.created_at} />
            <span>댓글 {comments.length}</span>
          </span>
        </span>
        <ChevronRight size={17} />
      </button>
    </article>
  );
}

function CommunityPostFormPage({ data, isBusy, mode, navigate, onSubmit, postId }) {
  const post = mode === "edit" ? data.communityPosts.find((item) => item.id === postId) : null;

  if (mode === "edit" && !post) {
    return <EmptyState title="커뮤니티 글을 찾을 수 없습니다" body="목록에서 다시 선택해 주세요." />;
  }

  return (
    <div className="narrow-page">
      <PageHeader
        description="가볍게 남겨도 괜찮습니다. 질문, 발견, 생각을 빌더들과 나눠 보세요."
        title={mode === "edit" ? "커뮤니티 글 수정" : "커뮤니티 글 작성"}
      />
      <CommunityPostForm
        initialPost={post}
        isBusy={isBusy}
        mode={mode}
        onCancel={() => navigate("/community")}
        onSubmit={onSubmit}
      />
    </div>
  );
}

function CommunityPostForm({ initialPost = null, isBusy, mode, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    title: initialPost?.title || "",
    author_name: initialPost?.author_name || localStorage.getItem("a-and-i-builder-name") || "",
    body: initialPost?.body || "",
    category: initialPost?.category || communityCategories[0],
  });
  const isEdit = mode === "edit";

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextForm = {
      title: String(formData.get("title") || "").trim(),
      author_name: String(formData.get("author_name") || "").trim(),
      body: String(formData.get("body") || "").trim(),
      category: String(formData.get("category") || communityCategories[0]),
    };
    if (!nextForm.title || !nextForm.author_name || !nextForm.body || isBusy) return;
    localStorage.setItem("a-and-i-builder-name", nextForm.author_name);
    onSubmit(nextForm);
  }

  return (
    <form className="community-form" onSubmit={submit}>
      <TextField label="제목" name="title" required value={form.title} onChange={(value) => update("title", value)} />
      <label className="field">
        <span>작성자 이름</span>
        <input
          name="author_name"
          readOnly={isEdit}
          required
          value={form.author_name}
          onChange={(event) => update("author_name", event.target.value)}
        />
      </label>
      <label className="field">
        <span>카테고리</span>
        <select name="category" value={form.category} onChange={(event) => update("category", event.target.value)}>
          {communityCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>내용</span>
        <textarea
          name="body"
          required
          rows="8"
          value={form.body}
          onChange={(event) => update("body", event.target.value)}
          placeholder="AI와 함께 만들며 떠오른 질문, 발견, 생각을 자유롭게 적어 주세요."
        />
      </label>
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          목록으로
        </button>
        <button className="primary-button" disabled={isBusy} type="submit">
          {isEdit ? "수정" : "작성"}
        </button>
      </div>
    </form>
  );
}

function CommunityPostDetailPage({ data, navigate, onCreateComment, onDeletePost, postId }) {
  const post = data.communityPosts.find((item) => item.id === postId);

  if (!post) {
    return <EmptyState title="커뮤니티 글을 찾을 수 없습니다" body="목록에서 다시 선택해 주세요." />;
  }

  const comments = getCommunityComments(data, post.id);

  return (
    <div className="page-stack">
      <button className="text-button" type="button" onClick={() => navigate("/community")}>
        <ChevronRight className="flip-icon" size={16} />
        커뮤니티로 돌아가기
      </button>
      <article className="post-detail community-detail">
        <div className="detail-meta-line">
          <InitialAvatar name={post.author_name} />
          <span>{post.author_name}</span>
          {post.category && <Badge tone="sky">{post.category}</Badge>}
          <RelativeTimeText value={post.updated_at || post.created_at} />
        </div>
        <h1>{post.title}</h1>
        <p>{post.body}</p>
        <div className="action-bar">
          <button className="secondary-button" type="button" onClick={() => navigate(`/community/${post.id}/edit`)}>
            수정
          </button>
          <button className="danger-text-button" type="button" onClick={() => onDeletePost(post.id)}>
            삭제
          </button>
          <span className="action-note">댓글 {comments.length}개</span>
        </div>
      </article>
      <section className="content-section">
        <SectionHeading title="댓글" description="피드백 유형 없이 자유롭게 이야기할 수 있습니다." />
        <CommentComposer feedbackEnabled={false} onSubmit={(payload) => onCreateComment(post.id, payload)} />
        <CommentThread
          comments={comments}
          emptyBody="첫 댓글로 대화를 열어 보세요."
          emptyTitle="아직 댓글이 없습니다"
          feedbackEnabled={false}
          onReply={(payload) => onCreateComment(post.id, payload)}
        />
      </section>
    </div>
  );
}

function ChatPage({ data, isBusy, onIncomingMessage, onSendMessage }) {
  const [authorName, setAuthorName] = useState(localStorage.getItem("a-and-i-chat-author") || "");
  const [body, setBody] = useState("");
  const bottomRef = useRef(null);
  const messages = useMemo(
    () => [...data.chatMessages].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)),
    [data.chatMessages],
  );

  useEffect(() => {
    const unsubscribe = subscribeToChatMessages(onIncomingMessage);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [onIncomingMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function submit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextAuthorName = String(formData.get("author_name") || "").trim();
    const nextBody = String(formData.get("body") || "").trim();
    if (!nextAuthorName || !nextBody || isBusy) return;

    localStorage.setItem("a-and-i-chat-author", nextAuthorName);
    const saved = await onSendMessage({ author_name: nextAuthorName, body: nextBody });
    if (saved) setBody("");
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="지금 접속한 빌더들과 가볍게 이야기해보세요."
        title="채팅방"
      />
      <section className="chat-room">
        <ChatMessageList bottomRef={bottomRef} messages={messages} />
        <form className="chat-composer" onSubmit={submit}>
          <input
            aria-label="빌더 이름"
            name="author_name"
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder="빌더 이름"
            required
            value={authorName}
          />
          <textarea
            aria-label="메시지"
            name="body"
            onChange={(event) => setBody(event.target.value)}
            placeholder="메시지를 입력해 주세요."
            required
            rows="3"
            value={body}
          />
          <button className="primary-button" disabled={isBusy} type="submit">
            <Send size={16} />
            전송
          </button>
        </form>
      </section>
    </div>
  );
}

function ChatMessageList({ bottomRef, messages }) {
  if (!messages.length) {
    return (
      <div className="chat-message-list">
        <EmptyState title="아직 메시지가 없습니다" body="첫 대화를 시작해보세요." compact />
        <span ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="chat-message-list">
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} />
      ))}
      <span ref={bottomRef} />
    </div>
  );
}

function ChatMessageItem({ message }) {
  return (
    <article className="chat-message-item">
      <InitialAvatar name={message.author_name} />
      <div>
        <div className="comment-meta">
          <strong>{message.author_name}</strong>
          <RelativeTimeText value={message.created_at} />
        </div>
        <p>{message.body}</p>
      </div>
    </article>
  );
}

function ContentListPage({ collection, data, navigate }) {
  const config = contentConfig[collection];
  const items = sortByRecent(data[collection]);

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <button className="primary-button" type="button" onClick={() => navigate(`/${collection}/new`)}>
            <Plus size={17} />
            {config.ctaLabel}
          </button>
        }
        description={config.definition}
        title={config.title}
      />
      {items.length ? (
        <div className="feed-list">
          {items.map((item) => (
            <ContentPostCard collection={collection} data={data} item={item} key={item.id} navigate={navigate} />
          ))}
        </div>
      ) : (
        <EmptyState title={config.emptyTitle} body={config.emptyBody} />
      )}
    </div>
  );
}

function ContentPostCard({ collection, data, item, navigate }) {
  const config = contentConfig[collection];
  const comments = getContentComments(data, collection, item.id);

  return (
    <FeedItemRow
      item={{
        key: `${collection}-${item.id}`,
        type: collection,
        badge: config.badge,
        title: item.title,
        excerpt: excerpt(item.body),
        author: item.author_name,
        time: item.updated_at || item.created_at,
        commentCount: comments.length,
        path: `/${collection}/${item.id}`,
        sourceUrl: config.hasSourceUrl ? item.source_url : "",
      }}
      navigate={navigate}
    />
  );
}

function ContentFormPage({ collection, data, isBusy, mode, navigate, onSubmit, postId }) {
  const config = contentConfig[collection];
  const item = mode === "edit" ? data[collection].find((candidate) => candidate.id === postId) : null;

  if (mode === "edit" && !item) {
    return <EmptyState title="게시글을 찾을 수 없습니다" body="목록에서 다시 선택해 주세요." />;
  }

  return (
    <div className="narrow-page">
      <PageHeader
        description={config.formDescription}
        title={mode === "edit" ? config.editTitle : config.createTitle}
      />
      <ContentForm
        collection={collection}
        initialItem={item}
        isBusy={isBusy}
        mode={mode}
        onCancel={() => navigate(`/${collection}`)}
        onSubmit={onSubmit}
      />
    </div>
  );
}

function ContentForm({ collection, initialItem = null, isBusy, mode, onCancel, onSubmit }) {
  const config = contentConfig[collection];
  const [form, setForm] = useState({
    title: initialItem?.title || "",
    author_name: initialItem?.author_name || localStorage.getItem("a-and-i-builder-name") || "",
    body: initialItem?.body || "",
    source_url: initialItem?.source_url || "",
  });
  const isEdit = mode === "edit";

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextForm = {
      title: String(formData.get("title") || "").trim(),
      author_name: String(formData.get("author_name") || "").trim(),
      body: String(formData.get("body") || "").trim(),
      source_url: String(formData.get("source_url") || "").trim(),
    };
    if (!nextForm.title || !nextForm.author_name || !nextForm.body || isBusy) return;
    localStorage.setItem("a-and-i-builder-name", nextForm.author_name);
    onSubmit(nextForm);
  }

  return (
    <form className="community-form" onSubmit={submit}>
      <TextField label="제목" name="title" required value={form.title} onChange={(value) => update("title", value)} />
      <label className="field">
        <span>작성자 이름</span>
        <input
          name="author_name"
          required
          value={form.author_name}
          onChange={(event) => update("author_name", event.target.value)}
        />
      </label>
      {config.hasSourceUrl && (
        <TextField
          label="출처 URL"
          name="source_url"
          optional
          placeholder="https://"
          value={form.source_url}
          onChange={(value) => update("source_url", value)}
        />
      )}
      <label className="field">
        <span>내용</span>
        <textarea
          name="body"
          required
          rows="8"
          value={form.body}
          onChange={(event) => update("body", event.target.value)}
          placeholder="내용을 입력해 주세요."
        />
      </label>
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          목록으로
        </button>
        <button className="primary-button" disabled={isBusy} type="submit">
          {isEdit ? "수정" : "작성"}
        </button>
      </div>
    </form>
  );
}

function ContentDetailPage({ collection, data, id, navigate, onCreateComment, onDelete }) {
  const config = contentConfig[collection];
  const item = data[collection].find((candidate) => candidate.id === id);

  if (!item) {
    return <EmptyState title="게시글을 찾을 수 없습니다" body="목록에서 다시 선택해 주세요." />;
  }

  const comments = getContentComments(data, collection, item.id);

  return (
    <div className="page-stack">
      <button className="text-button" type="button" onClick={() => navigate(`/${collection}`)}>
        <ChevronRight className="flip-icon" size={16} />
        {config.detailBackLabel}
      </button>
      <article className="post-detail content-detail">
        <div className="detail-meta-line">
          <InitialAvatar name={item.author_name} />
          <span>{item.author_name}</span>
          <Badge>{config.badge}</Badge>
          <RelativeTimeText value={item.created_at} />
        </div>
        <h1>{item.title}</h1>
        <p>{item.body}</p>
        {config.hasSourceUrl && item.source_url && (
          <a className="source-link" href={item.source_url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            출처 열기
          </a>
        )}
        <div className="action-bar">
          <button className="secondary-button" type="button" onClick={() => navigate(`/${collection}/${item.id}/edit`)}>
            수정
          </button>
          <button className="danger-text-button" type="button" onClick={onDelete}>
            삭제
          </button>
          <span className="action-note">댓글 {comments.length}개</span>
        </div>
      </article>
      <section className="content-section">
        <SectionHeading title="댓글" description="피드백 유형 없이 자유롭게 의견을 남길 수 있습니다." />
        <CommentComposer feedbackEnabled={false} onSubmit={onCreateComment} />
        <CommentThread
          comments={comments}
          emptyBody="첫 댓글을 남겨 대화를 시작해 보세요."
          emptyTitle="아직 댓글이 없습니다"
          feedbackEnabled={false}
          onReply={onCreateComment}
        />
      </section>
    </div>
  );
}

function SearchResultsPage({ data, navigate, query }) {
  const results = useMemo(() => searchWorkspace(data, query), [data, query]);

  return (
    <div className="page-stack">
      <PageHeader
        description="프로젝트, 아이디어, 인사이트 안에서만 검색합니다."
        title={query ? `"${query}" 검색 결과` : "검색"}
      />
      <SearchGroup
        badge="프로젝트"
        items={results.projects}
        navigate={navigate}
        pathFor={(item) => `/projects/${item.id}`}
      />
      <SearchGroup
        badge="아이디어"
        items={results.ideas}
        navigate={navigate}
        pathFor={(item) => `/ideas/${item.id}`}
      />
      <SearchGroup
        badge="인사이트"
        items={results.insights}
        navigate={navigate}
        pathFor={(item) => `/insights/${item.id}`}
      />
    </div>
  );
}

function SearchGroup({ badge, items, navigate, pathFor }) {
  return (
    <section className="content-section">
      <SectionHeading title={badge} description={`${items.length}개 결과`} />
      {items.length ? (
        <div className="feed-list">
          {items.map((item) => (
            <button className="feed-row" key={item.id} type="button" onClick={() => navigate(pathFor(item))}>
              <span className="type-dot search" />
              <span className="feed-main">
                <strong>{item.title}</strong>
                <small>
                  <Badge>{badge}</Badge>
                  {item.author_name || item.builder_name}
                  <span aria-hidden="true">·</span>
                  <RelativeTimeText value={item.updated_at || item.created_at} />
                </small>
                <em>{excerpt(item.description || item.body)}</em>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="결과 없음" body="다른 검색어를 입력해 보세요." compact />
      )}
    </section>
  );
}

function EditProjectDialog({ isBusy, onClose, onSubmit, project }) {
  const [form, setForm] = useState({
    title: project.title,
    builder_name: project.builder_name,
    description: project.description,
    category: project.category,
    demo_url: project.demo_url || "",
    github_url: project.github_url || "",
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.builder_name.trim() || !form.description.trim()) return;
    onSubmit({
      title: form.title.trim(),
      builder_name: form.builder_name.trim(),
      description: form.description.trim(),
      category: form.category,
      demo_url: form.demo_url.trim(),
      github_url: form.github_url.trim(),
    });
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="프로젝트 수정">
      <form className="edit-dialog" onSubmit={submit}>
        <div className="dialog-head">
          <h2>프로젝트 수정</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>
        <TextField label="프로젝트 이름" value={form.title} onChange={(value) => update("title", value)} />
        <TextField label="빌더 이름" value={form.builder_name} onChange={(value) => update("builder_name", value)} />
        <label className="field">
          <span>카테고리</span>
          <select value={form.category} onChange={(event) => update("category", event.target.value)}>
            {categoryTabs.slice(1).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>설명</span>
          <textarea rows="4" value={form.description} onChange={(event) => update("description", event.target.value)} />
        </label>
        <TextField label="데모 URL" optional value={form.demo_url} onChange={(value) => update("demo_url", value)} />
        <TextField label="GitHub URL" optional value={form.github_url} onChange={(value) => update("github_url", value)} />
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            취소
          </button>
          <button className="primary-button" disabled={isBusy} type="submit">
            저장
          </button>
        </div>
      </form>
    </div>
  );
}

function PageHeader({ action, description, title }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}

function SectionHeading({ description, title }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

function TextField({ label, name, onChange, optional = false, placeholder = "", required = false, value }) {
  return (
    <label className="field">
      <span>
        {label}
        {optional && <em>선택</em>}
      </span>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function InitialAvatar({ name = "A&I" }) {
  return <span className="initial-avatar">{initials(name)}</span>;
}

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function EmptyState({ body, compact = false, title }) {
  return (
    <div className={`empty-state ${compact ? "compact" : ""}`}>
      <Sparkles size={20} />
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function RelativeTimeText({ value }) {
  return <span>{formatRelativeTime(value)}</span>;
}

function InfoStat({ label, value }) {
  return (
    <div className="info-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Toast({ body, onClose, title, tone }) {
  return (
    <div className={`toast ${tone}`} role="status">
      <CheckCircle size={18} />
      <div>
        <strong>{title}</strong>
        {body && <span>{body}</span>}
      </div>
      <button type="button" onClick={onClose} aria-label="알림 닫기">
        <X size={14} />
      </button>
    </div>
  );
}

function readRoute() {
  const { pathname, search } = window.location;
  return {
    pathname,
    search,
    query: new URLSearchParams(search),
    segments: pathname.split("/").filter(Boolean),
  };
}

function buildMixedFeed(data) {
  const projects = data.projects.map((project) => ({
    key: `project-${project.id}`,
    type: "project",
    badge: "프로젝트",
    title: project.title,
    excerpt: excerpt(project.description),
    author: project.builder_name,
    time: project.updated_at || project.created_at,
    commentCount: getProjectComments(data, project.id).length,
    path: `/projects/${project.id}`,
  }));
  const ideas = data.ideas.map((item) => toFeedItem(data, item, "ideas", "아이디어"));
  const communityPosts = data.communityPosts.map((item) => ({
    ...toFeedItem(data, item, "community", "커뮤니티"),
    commentCount: getCommunityComments(data, item.id).length,
  }));
  const insights = data.insights.map((item) => toFeedItem(data, item, "insights", "인사이트"));
  const announcements = data.announcements.map((item) => toFeedItem(data, item, "announcements", "공지사항"));

  return [...projects, ...ideas, ...communityPosts, ...insights, ...announcements].sort(
    (a, b) => new Date(b.time || 0) - new Date(a.time || 0),
  );
}

function toFeedItem(data, item, collection, badge) {
  return {
    key: `${collection}-${item.id}`,
    type: collection,
    badge,
    title: item.title,
    excerpt: excerpt(item.body),
    author: item.author_name,
    time: item.updated_at || item.created_at,
    commentCount: contentConfig[collection] ? getContentComments(data, collection, item.id).length : undefined,
    path: `/${collection}/${item.id}`,
    sourceUrl: item.source_url || "",
  };
}

function getVersionsForProject(data, projectId) {
  return data.projectVersions
    .filter((version) => version.project_id === projectId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function getFilesForVersion(data, versionId) {
  if (!versionId) return [];
  return data.projectFiles
    .filter((file) => file.version_id === versionId)
    .sort((a, b) => (a.file_name || "").localeCompare(b.file_name || ""));
}

function getProjectComments(data, projectId) {
  return data.comments
    .filter((comment) => comment.target_type === "project" && comment.target_id === projectId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function getCommunityComments(data, postId) {
  return data.comments
    .filter((comment) => comment.target_type === "community" && comment.target_id === postId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function getContentComments(data, collection, itemId) {
  const targetType = contentConfig[collection]?.targetType;
  if (!targetType) return [];

  return data.comments
    .filter((comment) => comment.target_type === targetType && comment.target_id === itemId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function buildContentPayload(collection, form) {
  const payload = {
    title: form.title.trim(),
    body: form.body.trim(),
    author_name: form.author_name.trim(),
  };

  if (contentConfig[collection]?.hasSourceUrl) {
    payload.source_url = String(form.source_url || "").trim();
  }

  return payload;
}

function buildCommentTree(comments) {
  const byParent = new Map();
  const cloned = comments.map((comment) => ({ ...comment, children: [] }));

  cloned.forEach((comment) => {
    const key = comment.parent_id || "root";
    byParent.set(key, [...(byParent.get(key) || []), comment]);
  });

  function attach(parentId = "root") {
    return (byParent.get(parentId) || []).map((comment) => ({
      ...comment,
      children: attach(comment.id),
    }));
  }

  return attach();
}

function sortByRecent(items) {
  return [...items].sort(
    (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0),
  );
}

function searchWorkspace(data, query) {
  const term = query.trim().toLowerCase();
  if (!term) return { projects: [], ideas: [], insights: [] };

  return {
    projects: data.projects.filter((project) =>
      [project.title, project.description, project.builder_name, project.category].join(" ").toLowerCase().includes(term),
    ),
    ideas: data.ideas.filter((item) => [item.title, item.body, item.author_name].join(" ").toLowerCase().includes(term)),
    insights: data.insights.filter((item) =>
      [item.title, item.body, item.author_name, item.source_url].join(" ").toLowerCase().includes(term),
    ),
  };
}

async function downloadVersion(project, version, files) {
  const entries = [];

  for (const file of files) {
    entries.push({
      name: file.file_name || "download",
      blob: await getProjectFileBlob(file),
      date: file.created_at || version?.created_at || new Date(),
    });
  }

  if (!entries.length) {
    entries.push({
      name: "README.txt",
      blob: new Blob([`${project.title}\n\n${project.description}`], { type: "text/plain" }),
      date: new Date(),
    });
  }

  if (entries.length === 1 && files.length === 1) {
    downloadBlob(entries[0].blob, entries[0].name);
    return;
  }

  const zipBlob = await createZipBlob(entries);
  downloadBlob(zipBlob, `${slugify(project.title)}-${version?.version_label || "files"}.zip`);
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

function getRunnableLabel(project) {
  if (project.category === "Web") return "데모 보기";
  if (["Tool", "Game"].includes(project.category)) return "실행하기";
  return "데모 보기";
}

function formatRelativeTime(value) {
  if (!value) return "방금 전";
  const diffMs = Date.now() - new Date(value).getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  if (seconds < 60) return "방금 전";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return formatAbsoluteDate(value);
}

function formatAbsoluteDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function excerpt(value = "") {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 92 ? `${clean.slice(0, 92)}...` : clean;
}

function initials(value = "A&I") {
  const cleaned = value.trim();
  if (!cleaned) return "AI";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function slugify(value = "project") {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "project"
  );
}

export default App;
