import { Database, HardDrive, Radio, Search } from "lucide-react";

function AppLayout({
  activeSection,
  children,
  currentUser,
  dataSource,
  isSupabaseReady,
  notice,
  onSectionChange,
  onUserChange,
  presence,
  sections,
  stats,
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand-button" onClick={() => onSectionChange("projects")}>
          <span className="brand-mark">A&I</span>
          <span>
            <strong>AI 빌더 협업실</strong>
            <small>파일을 올리고 함께 개선하는 공간</small>
          </span>
        </button>

        <nav className="nav-list" aria-label="주요 메뉴">
          {sections.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${activeSection === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => onSectionChange(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="status-card">
          <p>저장 상태</p>
          <strong>{isSupabaseReady ? "Supabase 연결됨" : "로컬 데모 저장"}</strong>
          <span>{notice || (dataSource === "supabase" ? "실시간 DB 동기화 중" : "환경변수 설정 전입니다.")}</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Korean student friendly collaboration platform</p>
            <h1>A&I</h1>
          </div>
          <div className="topbar-tools">
            <label className="user-name-field">
              <span>내 이름</span>
              <input value={currentUser} onChange={(event) => onUserChange(event.target.value)} />
            </label>
          </div>
        </header>

        <section className="hero-strip">
          <div>
            <p className="eyebrow">코딩 고수 커뮤니티가 아닙니다</p>
            <h2>AI로 만든 파일, 링크, 이미지를 올리고 친구들과 바로 피드백하세요.</h2>
            <p>
              프로젝트마다 공유 작업실, 파일 뷰어, 댓글, 업데이트, 라이브 채팅, 활동 로그가
              붙어 있어 결과물을 계속 개선할 수 있습니다.
            </p>
          </div>
          <div className="stat-grid">
            <Stat label="프로젝트" value={stats.projects} />
            <Stat label="업로드" value={stats.files} />
            <Stat label="댓글" value={stats.comments} />
            <Stat label="쇼케이스" value={stats.showcases} />
          </div>
        </section>

        <section className="presence-row" aria-label="접속자">
          <div>
            <Radio size={16} />
            <strong>실시간 공유</strong>
            <span>Google Workspace처럼 같은 프로젝트를 보며 대화하는 MVP 흐름</span>
          </div>
          <div className="presence-list">
            {presence.slice(0, 5).map((user, index) => (
              <span className="presence-pill" key={`${user.user_name}-${index}`}>
                {user.user_name || "익명"}
              </span>
            ))}
          </div>
        </section>

        <section className="quick-note">
          {isSupabaseReady ? <Database size={16} /> : <HardDrive size={16} />}
          <span>
            {isSupabaseReady
              ? "Supabase Database, Storage, Realtime을 사용합니다."
              : "Supabase 설정 전에는 로컬 저장소로 같은 흐름을 미리 볼 수 있습니다."}
          </span>
          <Search size={16} />
        </section>

        {children}
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default AppLayout;
