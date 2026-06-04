# A&I

AI 창작자를 위한 협업형 SaaS 웹앱입니다. 기존 IDIDIT Vite/React 구조에 맞게 `src/App.jsx`, `src/App.css`, `src/index.css`, Supabase 연동 파일을 중심으로 구성했습니다.

## 실행

```bash
npm install
npm run dev
```

## Supabase 연결

1. Supabase SQL Editor에서 `supabase/schema.sql`을 실행합니다.
2. `.env.local.example`을 참고해 `.env.local`을 만듭니다.
3. 아래 값을 채웁니다.

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

환경변수가 없으면 브라우저 로컬 저장소로 데모 데이터가 저장됩니다.
