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
      title: "AI Campus Meal Picker",
      description: "A small student web app made with AI. Upload files and collect feedback.",
      category: "Web App",
      owner_name: "Mina",
      status: "In Progress",
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
      size_bytes: 86,
      storage_path: null,
      public_url: null,
      external_url: null,
      version_group: "App.jsx",
      version_number: 1,
      created_by: "Mina",
      content: "function App() {\n  return <main>Hello A&I</main>;\n}\n\nexport default App;\n",
      created_at: now,
    },
  ],
  projectComments: [],
  fileComments: [],
  projectUpdates: [],
  chatMessages: [],
  activityLogs: [
    {
      id: "activity-1",
      project_id: "project-1",
      actor_name: "Mina",
      action_type: "project_created",
      message: "Project created",
      created_at: now,
    },
  ],
  ideas: [
    {
      id: "idea-1",
      title: "Campus AI build room",
      category: "Community",
      author_name: "Jiwon",
      body: "A place where students can upload AI-made projects and improve them together.",
      upvotes: 12,
      created_at: now,
    },
  ],
  ideaComments: [],
  showcases: [],
  showcaseFeedback: [],
};
