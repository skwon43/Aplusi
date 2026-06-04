export const seedData = {
  projects: [
    {
      id: "project-1",
      title: "바이브 CRM 런칭",
      description: "비개발자 창업자를 위한 고객관리 SaaS MVP",
      status: "출시 준비",
      updates: 7,
    },
    {
      id: "project-2",
      title: "캠퍼스 창업 키트",
      description: "학생 창업팀이 아이디어를 검증하고 데모를 만드는 워크스페이스",
      status: "검증 중",
      updates: 12,
    },
  ],
  conversations: [
    {
      id: "chat-1",
      provider: "ChatGPT",
      title: "온보딩 UX 개선",
      prompt: "비개발자 창업자를 위한 SaaS 온보딩 흐름을 설계해줘.",
      output: "첫 화면에서 목표, 사용 경험, 만들고 싶은 결과물을 선택하게 하세요.",
    },
  ],
  ideas: [
    {
      id: "idea-1",
      title: "혼자 만드는 사람을 위한 AI 공동창업자 룸",
      category: "창업",
      body: "아이디어 검증, 시장 조사, 랜딩페이지 생성, 피드백 수집을 한 번에 처리한다.",
      upvotes: 241,
    },
  ],
  prompts: [
    {
      id: "prompt-1",
      title: "시장 검증 인터뷰 질문 생성기",
      category: "시장 조사",
      content: "내 아이디어와 타깃 고객을 바탕으로 검증 인터뷰 질문 12개를 만들어줘.",
      rating: 4.9,
    },
  ],
  logs: [
    {
      id: "log-1",
      title: "프로토타입 공개",
      body: "첫 데모를 공유하고 커뮤니티 피드백 18개를 수집했다.",
      log_date: new Date().toISOString().slice(0, 10),
    },
  ],
  showcases: [
    {
      id: "showcase-1",
      title: "캠퍼스 파운더 키트",
      description: "데모 링크, 스크린샷, 좋아요, 커뮤니티 피드백을 모은 공개 페이지",
      demo_url: "https://example.com",
      likes: 86,
    },
  ],
};
