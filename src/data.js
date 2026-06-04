const now = new Date().toISOString();

export const emptyData = {
  projects: [],
  projectFiles: [],
  projectComments: [],
  fileComments: [],
  projectUpdates: [],
  chatMessages: [],
  activityLogs: [],
  ideas: [],
  ideaComments: [],
  showcases: [],
  showcaseFeedback: [],
};

export const seedData = {
  projects: [
    {
      id: "project-1",
      title: "AI 학식 추천 웹",
      description:
        "학교 주변 식당과 학식 메뉴를 모아 친구들과 고르는 시간을 줄이는 학생용 웹앱입니다.",
      category: "웹앱",
      owner_name: "민지",
      status: "진행 중",
      created_at: now,
    },
    {
      id: "project-2",
      title: "동아리 모집 페이지",
      description: "비개발자 운영진도 수정할 수 있는 동아리 소개와 지원 폼 페이지입니다.",
      category: "커뮤니티",
      owner_name: "준호",
      status: "피드백 요청",
      created_at: now,
    },
  ],
  projectFiles: [
    {
      id: "file-1",
      project_id: "project-1",
      resource_type: "file",
      original_name: "App.jsx",
      file_name: "App.jsx",
      mime_type: "text/jsx",
      size_bytes: 612,
      storage_path: null,
      public_url: null,
      external_url: null,
      version_group: "App.jsx",
      version_number: 1,
      content:
        "function App() {\n  return <main>오늘 뭐 먹지?</main>;\n}\n\nexport default App;\n",
      created_at: now,
    },
    {
      id: "file-2",
      project_id: "project-1",
      resource_type: "link",
      original_name: "Vercel 데모",
      file_name: "Vercel 데모",
      mime_type: "text/uri-list",
      size_bytes: 0,
      storage_path: null,
      public_url: null,
      external_url: "https://example.com",
      version_group: "Vercel 데모",
      version_number: 1,
      content: "",
      created_at: now,
    },
  ],
  projectComments: [
    {
      id: "project-comment-1",
      project_id: "project-1",
      author_name: "서연",
      body: "처음 들어온 사람이 바로 메뉴를 고를 수 있게 첫 화면을 더 단순하게 만들면 좋겠어요.",
      created_at: now,
    },
  ],
  fileComments: [
    {
      id: "file-comment-1",
      project_id: "project-1",
      file_id: "file-1",
      author_name: "현우",
      body: "여기에 메뉴 데이터를 배열로 분리하면 나중에 Supabase로 옮기기 쉬울 것 같아요.",
      created_at: now,
    },
  ],
  projectUpdates: [
    {
      id: "update-1",
      project_id: "project-1",
      author_name: "민지",
      title: "첫 데모 업로드",
      body: "기본 화면과 음식 카드 UI를 올렸습니다. 모바일에서 보기 좋은지 피드백 부탁해요.",
      created_at: now,
    },
  ],
  chatMessages: [
    {
      id: "chat-1",
      project_id: "project-1",
      author_name: "민지",
      body: "오늘은 파일 구조랑 댓글 흐름을 먼저 정리해볼게요.",
      created_at: now,
    },
  ],
  activityLogs: [
    {
      id: "activity-1",
      project_id: "project-1",
      actor_name: "민지",
      action_type: "project_created",
      message: "프로젝트를 만들었습니다.",
      created_at: now,
    },
  ],
  ideas: [
    {
      id: "idea-1",
      title: "AI로 만든 결과물을 서로 리뷰하는 캠퍼스 빌드룸",
      category: "교육",
      author_name: "지우",
      body: "코딩 고수가 아니어도 파일을 올리고 피드백을 받을 수 있는 학교별 작업 공간이 있으면 좋겠습니다.",
      upvotes: 18,
      created_at: now,
    },
  ],
  ideaComments: [
    {
      id: "idea-comment-1",
      idea_id: "idea-1",
      author_name: "태민",
      body: "프로젝트별 파일 뷰어와 댓글이 있으면 바로 써보고 싶어요.",
      created_at: now,
    },
  ],
  showcases: [
    {
      id: "showcase-1",
      project_id: "project-1",
      title: "AI 학식 추천 웹",
      description: "친구들과 오늘 먹을 메뉴를 빠르게 고르는 작은 웹앱입니다.",
      demo_url: "https://example.com",
      screenshot_path: null,
      screenshot_url: null,
      likes: 12,
      created_at: now,
    },
  ],
  showcaseFeedback: [
    {
      id: "showcase-feedback-1",
      showcase_id: "showcase-1",
      author_name: "나연",
      body: "학생들이 바로 이해할 수 있는 주제라 좋아요. 실제 메뉴 데이터가 붙으면 더 강해질 듯합니다.",
      created_at: now,
    },
  ],
};
