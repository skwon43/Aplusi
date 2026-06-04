import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  FolderKanban,
  GalleryHorizontalEnd,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Plus,
  Search,
  Send,
  Store,
  Trash2,
  Users,
} from "lucide-react";
import heroImage from "./assets/hero.png";
import { createRecord, deleteRecord, loadAllData, updateRecord } from "./db";
import { isSupabaseReady } from "./supabaseClient";
import "./App.css";

const modules = [
  { id: "projects", title: "프로젝트 허브", icon: FolderKanban },
  { id: "collab", title: "실시간 협업", icon: Users },
  { id: "conversations", title: "AI 대화 공유", icon: MessageSquareText },
  { id: "ideas", title: "아이디어 포럼", icon: Lightbulb },
  { id: "showcases", title: "쇼케이스 갤러리", icon: GalleryHorizontalEnd },
  { id: "prompts", title: "프롬프트 마켓", icon: Store },
  { id: "mentor", title: "AI 멘토", icon: Bot },
];

const emptyForms = {
  projects: { title: "", description: "", status: "기획 중" },
  conversations: { provider: "ChatGPT", title: "", prompt: "", output: "" },
  ideas: { title: "", category: "창업", body: "" },
  prompts: { title: "", category: "시장 조사", content: "" },
  logs: { title: "", body: "", log_date: new Date().toISOString().slice(0, 10) },
  showcases: { title: "", description: "", demo_url: "" },
};

function App() {
  const [activeModule, setActiveModule] = useState("projects");
  const [records, setRecords] = useState(null);
  const [forms, setForms] = useState(emptyForms);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAllData()
      .then(({ data, source }) => {
        setRecords(data);
        setNotice(source === "supabase" ? "Supabase DB 연결됨" : "로컬 저장소 모드");
      })
      .catch((error) => {
        setNotice(`데이터 로드 실패: ${error.message}`);
        setRecords({
          projects: [],
          conversations: [],
          ideas: [],
          prompts: [],
          logs: [],
          showcases: [],
        });
      });
  }, []);

  const activeConfig = modules.find((item) => item.id === activeModule);
  const filteredConversations = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return records?.conversations ?? [];
    return (records?.conversations ?? []).filter((item) =>
      [item.provider, item.title, item.prompt, item.output].some((value) =>
        String(value ?? "").toLowerCase().includes(keyword),
      ),
    );
  }, [query, records]);

  if (!records) {
    return (
      <main id="center">
        <Loader2 className="spin" />
        <p>A&I를 불러오는 중입니다.</p>
      </main>
    );
  }

  const totalCount =
    records.projects.length +
    records.conversations.length +
    records.ideas.length +
    records.prompts.length +
    records.showcases.length;

  return (
    <>
      <main id="center">
        <div className="hero" aria-label="A&I">
          <img className="base" src={heroImage} alt="A&I 워크스페이스 미리보기" />
          <div className="framework">A&I</div>
          <div className="vite">IDIDIT</div>
        </div>

        <button className="counter" onClick={() => setActiveModule("projects")}>
          저장된 창작 자산 {totalCount}개 / {notice}
        </button>

        <section className="intro">
          <p>GitHub + Cursor + ChatGPT + Discord의 중간지점</p>
          <h1>AI로 만드는 사람들을 위한 한글 크리에이터 운영체제</h1>
          <label className="search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveModule("conversations");
              }}
              placeholder="AI 대화와 프롬프트를 검색하세요"
            />
          </label>
        </section>
      </main>

      <div className="ticks" />

      <section id="next-steps">
        <div id="docs">
          <div className="section-title">
            {activeConfig && <activeConfig.icon className="icon" />}
            <div>
              <p>{isSupabaseReady ? "Supabase 저장 활성" : "Supabase 설정 전 로컬 저장"}</p>
              <h2>{activeConfig?.title}</h2>
            </div>
          </div>
          <ModuleView
            activeModule={activeModule}
            records={records}
            forms={forms}
            filteredConversations={filteredConversations}
            isSaving={isSaving}
            onFormChange={updateForm}
            onCreate={handleCreate}
            onDelete={handleDelete}
            onBump={bump}
            onQuickLog={quickLog}
          />
        </div>

        <div>
          <div className="section-title">
            <Users className="icon" />
            <div>
              <p>기능 모듈</p>
              <h2>IDIDIT 구조에 맞춘 A&I</h2>
            </div>
          </div>
          <ul>
            {modules.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    className={activeModule === item.id ? "module-link active" : "module-link"}
                    onClick={() => setActiveModule(item.id)}
                  >
                    <Icon className="button-icon" />
                    {item.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div id="spacer" />
    </>
  );

  function updateForm(collection, field, value) {
    setForms((current) => ({
      ...current,
      [collection]: { ...current[collection], [field]: value },
    }));
  }

  async function refresh() {
    const { data } = await loadAllData();
    setRecords(data);
  }

  async function handleCreate(collection, payloadBuilder) {
    setIsSaving(true);
    try {
      await createRecord(collection, payloadBuilder(forms[collection]));
      setForms((current) => ({ ...current, [collection]: emptyForms[collection] }));
      await refresh();
      setNotice("저장 완료");
    } catch (error) {
      setNotice(`저장 실패: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(collection, id) {
    setIsSaving(true);
    try {
      await deleteRecord(collection, id);
      await refresh();
      setNotice("삭제 완료");
    } catch (error) {
      setNotice(`삭제 실패: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function bump(collection, item, field) {
    await updateRecord(collection, item.id, { [field]: Number(item[field] ?? 0) + 1 });
    await refresh();
  }

  async function quickLog(title, body) {
    await createRecord("logs", {
      title,
      body,
      log_date: new Date().toISOString().slice(0, 10),
    });
    await refresh();
    setNotice("활동 로그 저장 완료");
  }
}

function ModuleView(props) {
  const {
    activeModule,
    records,
    forms,
    filteredConversations,
    isSaving,
    onFormChange,
    onCreate,
    onDelete,
    onBump,
    onQuickLog,
  } = props;

  if (activeModule === "projects") {
    return (
      <>
        <Editor>
          <Input label="프로젝트명" value={forms.projects.title} onChange={(value) => onFormChange("projects", "title", value)} />
          <Input label="상태" value={forms.projects.status} onChange={(value) => onFormChange("projects", "status", value)} />
          <Textarea label="설명" value={forms.projects.description} onChange={(value) => onFormChange("projects", "description", value)} />
          <Submit disabled={isSaving} onClick={() => onCreate("projects", (form) => ({ ...form, updates: 0 }))}>프로젝트 저장</Submit>
        </Editor>
        <Cards items={records.projects} collection="projects" onDelete={onDelete} render={(item) => <p>{item.description}</p>} />
      </>
    );
  }

  if (activeModule === "collab") {
    return (
      <div className="live-room">
        <p><strong>민아</strong> 가격 페이지를 먼저 검증해볼까요?</p>
        <p><strong>AI 멘토</strong> 유료 컨시어지 제안 하나로 수요를 확인해보세요.</p>
        <p><strong>준</strong> 체크아웃 프롬프트를 공유했습니다.</p>
        <button onClick={() => onQuickLog("라이브 협업", "실시간 채팅과 프롬프트 공유 활동을 기록했습니다.")}>
          활동 로그 저장
        </button>
      </div>
    );
  }

  if (activeModule === "conversations") {
    return (
      <>
        <Editor>
          <Input label="AI 도구" value={forms.conversations.provider} onChange={(value) => onFormChange("conversations", "provider", value)} />
          <Input label="제목" value={forms.conversations.title} onChange={(value) => onFormChange("conversations", "title", value)} />
          <Textarea label="프롬프트" value={forms.conversations.prompt} onChange={(value) => onFormChange("conversations", "prompt", value)} />
          <Textarea label="출력" value={forms.conversations.output} onChange={(value) => onFormChange("conversations", "output", value)} />
          <Submit disabled={isSaving} onClick={() => onCreate("conversations", (form) => form)}>AI 대화 저장</Submit>
        </Editor>
        <Cards
          items={filteredConversations}
          collection="conversations"
          onDelete={onDelete}
          render={(item) => (
            <>
              <p>{item.prompt}</p>
              <small>{item.output}</small>
            </>
          )}
        />
      </>
    );
  }

  if (activeModule === "ideas") {
    return (
      <>
        <Editor>
          <Input label="아이디어명" value={forms.ideas.title} onChange={(value) => onFormChange("ideas", "title", value)} />
          <Input label="카테고리" value={forms.ideas.category} onChange={(value) => onFormChange("ideas", "category", value)} />
          <Textarea label="내용" value={forms.ideas.body} onChange={(value) => onFormChange("ideas", "body", value)} />
          <Submit disabled={isSaving} onClick={() => onCreate("ideas", (form) => ({ ...form, upvotes: 0 }))}>아이디어 게시</Submit>
        </Editor>
        <Cards
          items={records.ideas}
          collection="ideas"
          onDelete={onDelete}
          render={(item) => (
            <>
              <p>{item.body}</p>
              <button onClick={() => onBump("ideas", item, "upvotes")}>{item.upvotes ?? 0} 추천</button>
            </>
          )}
        />
      </>
    );
  }

  if (activeModule === "showcases") {
    return (
      <>
        <Editor>
          <Input label="프로젝트명" value={forms.showcases.title} onChange={(value) => onFormChange("showcases", "title", value)} />
          <Input label="데모 링크" value={forms.showcases.demo_url} onChange={(value) => onFormChange("showcases", "demo_url", value)} />
          <Textarea label="소개" value={forms.showcases.description} onChange={(value) => onFormChange("showcases", "description", value)} />
          <Submit disabled={isSaving} onClick={() => onCreate("showcases", (form) => ({ ...form, likes: 0 }))}>쇼케이스 공개</Submit>
        </Editor>
        <Cards
          items={records.showcases}
          collection="showcases"
          onDelete={onDelete}
          render={(item) => (
            <>
              <p>{item.description}</p>
              <button onClick={() => onBump("showcases", item, "likes")}>{item.likes ?? 0} 좋아요</button>
            </>
          )}
        />
      </>
    );
  }

  if (activeModule === "prompts") {
    return (
      <>
        <Editor>
          <Input label="프롬프트명" value={forms.prompts.title} onChange={(value) => onFormChange("prompts", "title", value)} />
          <Input label="카테고리" value={forms.prompts.category} onChange={(value) => onFormChange("prompts", "category", value)} />
          <Textarea label="내용" value={forms.prompts.content} onChange={(value) => onFormChange("prompts", "content", value)} />
          <Submit disabled={isSaving} onClick={() => onCreate("prompts", (form) => ({ ...form, rating: 5 }))}>프롬프트 등록</Submit>
        </Editor>
        <Cards items={records.prompts} collection="prompts" onDelete={onDelete} render={(item) => <p>{item.content}</p>} />
      </>
    );
  }

  return (
    <div className="mentor">
      <strong>사업 가능성 점수 82</strong>
      <p>초기 타깃은 학생 창업팀, 비개발자 메이커, 바이브 코더입니다.</p>
      <p>수익 모델은 팀 워크스페이스 구독, 프롬프트 마켓 수수료, 검증 스프린트 패키지가 자연스럽습니다.</p>
    </div>
  );
}

function Editor({ children }) {
  return <div className="editor">{children}</div>;
}

function Input({ label, value, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label className="wide">
      <span>{label}</span>
      <textarea value={value} rows="4" onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Submit({ children, disabled, onClick }) {
  return (
    <button className="submit wide" disabled={disabled} onClick={onClick}>
      {disabled ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
      {children}
    </button>
  );
}

function Cards({ items, collection, onDelete, render }) {
  return (
    <div className="cards">
      {items.map((item) => (
        <article className="item-card" key={item.id}>
          <div>
            <strong>{item.title}</strong>
            <button aria-label="삭제" onClick={() => onDelete(collection, item.id)}>
              <Trash2 size={15} />
            </button>
          </div>
          {render(item)}
        </article>
      ))}
    </div>
  );
}

export default App;
