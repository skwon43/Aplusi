const now = new Date().toISOString();
const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const dataUrl = (text) => `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;

export const emptyData = {
  projects: [],
  projectVersions: [],
  projectFiles: [],
  comments: [],
  communityPosts: [],
  chatMessages: [],
  ideas: [],
  insights: [],
  announcements: [],
};

export const seedData = {
  projects: [
    {
      id: "project-ai-landing",
      title: "AI Landing Page Builder",
      description:
        "아이디어 문장 하나를 입력하면 브랜드 톤, 섹션 구성, CTA까지 가볍게 정리해 주는 랜딩 페이지 빌더입니다.",
      builder_name: "Mina",
      category: "Web",
      thumbnail_url: null,
      demo_url: "https://example.com/ai-landing-builder",
      github_url: "https://github.com/example/ai-landing-builder",
      created_at: hoursAgo(28),
      updated_at: hoursAgo(3),
    },
    {
      id: "project-prompt-library",
      title: "Prompt Library for Makers",
      description:
        "VibeCoding 과정에서 반복해서 쓰는 프롬프트를 프로젝트 유형별로 모아 두는 작은 메이커 도구입니다.",
      builder_name: "Joon",
      category: "Prompt",
      thumbnail_url: null,
      demo_url: "",
      github_url: "https://github.com/example/prompt-library",
      created_at: hoursAgo(54),
      updated_at: hoursAgo(8),
    },
  ],
  projectVersions: [
    {
      id: "version-landing-11",
      project_id: "project-ai-landing",
      version_label: "v1.1",
      change_summary: "프로젝트 타입별 추천 섹션과 데모 링크를 추가했습니다.",
      created_at: hoursAgo(3),
    },
    {
      id: "version-landing-10",
      project_id: "project-ai-landing",
      version_label: "v1.0",
      change_summary: "첫 공유 버전입니다. 기본 입력 폼과 결과 미리보기를 포함했습니다.",
      created_at: hoursAgo(28),
    },
    {
      id: "version-prompt-10",
      project_id: "project-prompt-library",
      version_label: "v1.0",
      change_summary: "메이커용 프롬프트 12개와 README를 정리했습니다.",
      created_at: hoursAgo(54),
    },
  ],
  projectFiles: [
    {
      id: "file-landing-readme",
      version_id: "version-landing-11",
      file_name: "README.md",
      file_url: dataUrl(
        "# AI Landing Page Builder\n\n아이디어를 입력하고 랜딩 페이지 초안을 만드는 실험입니다.\n",
      ),
      file_size: 96,
      created_at: hoursAgo(3),
    },
    {
      id: "file-landing-spec",
      version_id: "version-landing-11",
      file_name: "section-spec.json",
      file_url: dataUrl('{"sections":["hero","feed","cta"],"tone":"friendly"}\n'),
      file_size: 58,
      created_at: hoursAgo(3),
    },
    {
      id: "file-landing-v1",
      version_id: "version-landing-10",
      file_name: "prototype-notes.txt",
      file_url: dataUrl("첫 번째 프로토타입 노트입니다.\n"),
      file_size: 42,
      created_at: hoursAgo(28),
    },
    {
      id: "file-prompt-readme",
      version_id: "version-prompt-10",
      file_name: "maker-prompts.md",
      file_url: dataUrl("# Prompt Library for Makers\n\n- 프로젝트 설명 정리\n- 오류 원인 추정\n"),
      file_size: 88,
      created_at: hoursAgo(54),
    },
  ],
  comments: [
    {
      id: "comment-landing-1",
      target_type: "project",
      target_id: "project-ai-landing",
      parent_id: null,
      depth: 0,
      author_name: "Harin",
      body: "데모를 실행해 보니 섹션 추천 흐름이 이해하기 쉬웠어요. 결과를 바로 복사하는 버튼도 있으면 좋겠습니다.",
      feedback_type: "제안",
      created_at: hoursAgo(2),
    },
    {
      id: "comment-landing-1-reply",
      target_type: "project",
      target_id: "project-ai-landing",
      parent_id: "comment-landing-1",
      depth: 1,
      author_name: "Mina",
      body: "좋아요. 다음 버전에 복사 액션을 넣어 보겠습니다.",
      feedback_type: null,
      created_at: hoursAgo(1),
    },
    {
      id: "comment-prompt-1",
      target_type: "project",
      target_id: "project-prompt-library",
      parent_id: null,
      depth: 0,
      author_name: "Seoyeon",
      body: "README에 상황별 사용 예시가 있어서 바로 써 보기 좋았습니다.",
      feedback_type: "유용해요",
      created_at: hoursAgo(7),
    },
  ],
  communityPosts: [],
  chatMessages: [],
  ideas: [
    {
      id: "idea-brief-to-demo",
      title: "아이디어 한 줄에서 데모 체크리스트 만들기",
      body: "새 프로젝트를 시작할 때 꼭 확인해야 하는 입력값, 파일, 데모 링크, 피드백 질문을 자동으로 만들어 주는 흐름입니다.",
      author_name: "Sumin",
      created_at: hoursAgo(5),
      updated_at: hoursAgo(5),
    },
  ],
  insights: [
    {
      id: "insight-small-loops",
      title: "작은 루프가 VibeCoding 속도를 만든다",
      body: "프로젝트를 크게 완성한 뒤 공유하기보다, 파일과 버전을 작게 나누어 올리면 피드백이 훨씬 빨리 돌아옵니다.",
      author_name: "A&I Team",
      source_url: "https://openai.com/",
      created_at: hoursAgo(10),
      updated_at: hoursAgo(10),
    },
  ],
  announcements: [
    {
      id: "announcement-phase-1",
      title: "A&I 커뮤니티 Phase 1 오픈",
      body: "프로젝트 등록, 파일 버전, 다운로드, 피드백 댓글을 중심으로 첫 번째 빌더 루프를 열었습니다.",
      author_name: "A&I Team",
      created_at: now,
      updated_at: now,
    },
  ],
};
