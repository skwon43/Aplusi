import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GalleryHorizontalEnd,
  Lightbulb,
  Loader2,
  MessageSquare,
  Users,
} from "lucide-react";
import AppLayout from "./components/AppLayout";
import IdeaForum from "./components/IdeaForum";
import ProjectHub from "./components/ProjectHub";
import ShowcaseGallery from "./components/ShowcaseGallery";
import {
  createProjectLink,
  createRecord,
  deleteRecord,
  getProjectFileContent,
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
  { id: "ideas", label: "아이디어 베이스", icon: Lightbulb },
  { id: "showcase", label: "쇼케이스", icon: GalleryHorizontalEnd },
];

function App() {
  const [activeSection, setActiveSection] = useState("projects");
  const [data, setData] = useState(null);
  const [dataSource, setDataSource] = useState("local");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedFileId, setSelectedFileId] = useState("");
  const [filePreview, setFilePreview] = useState("");
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [presence, setPresence] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    return window.localStorage.getItem("a-and-i-user-name") || "익명 메이커";
  });

  const refreshData = useCallback(async () => {
    const { data: nextData, source } = await loadAllData();
    setData(nextData);
    setDataSource(source);
    return nextData;
  }, []);

  useEffect(() => {
    refreshData().catch((error) => {
      setNotice(`데이터를 불러오지 못했습니다: ${error.message}`);
      setData(emptyData);
    });
  }, [refreshData]);

  useEffect(() => {
    return subscribeWorkspace(() => {
      refreshData().catch((error) => setNotice(`실시간 동기화 실패: ${error.message}`));
    });
  }, [refreshData]);

  useEffect(() => {
    window.localStorage.setItem("a-and-i-user-name", currentUser);
    return subscribePresence(currentUser, setPresence);
  }, [currentUser]);

  useEffect(() => {
    if (!data?.projects.length) return;
    const selectedExists = data.projects.some((project) => project.id === selectedProjectId);
    if (!selectedProjectId || !selectedExists) {
      setSelectedProjectId(data.projects[0].id);
    }
  }, [data, selectedProjectId]);

  const selectedProject = useMemo(() => {
    return data?.projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [data, selectedProjectId]);

  const selectedFile = useMemo(() => {
    return data?.projectFiles.find((file) => file.id === selectedFileId) ?? null;
  }, [data, selectedFileId]);

  useEffect(() => {
    if (!selectedFile) {
      setFilePreview("");
      return;
    }

    setIsFileLoading(true);
    getProjectFileContent(selectedFile)
      .then(setFilePreview)
      .catch((error) => setFilePreview(`파일을 불러오지 못했습니다: ${error.message}`))
       .finally(() => setIsFileLoading(false));
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
  return (
     <AppLayout
      activeSection={activeSection}
      currentUser={currentUser}
      dataSource={dataSource}
      isSupabaseReady={isSupabaseReady}
      notice={notice}
      presence={presence}
      sections={sections}
      stats={stats}
      onSectionChange={setActiveSection}
      onUserChange={setCurrentUser}
    >
      {activeSection === "projects" && (
        <ProjectHub
          data={data}
          filePreview={filePreview}
          isBusy={isBusy}
          isFileLoading={isFileLoading}
          selectedFile={selectedFile}
          selectedProject={selectedProject}
          selectedProjectId={selectedProjectId}
          onAddFileComment={handleAddFileComment}
          onAddLink={handleAddLink}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          onPostProjectComment={handlePostProjectComment}
          onPostUpdate={handlePostUpdate}
          onSelectFile={setSelectedFileId}
          onSelectProject={(projectId) => {
            setSelectedProjectId(projectId);
            const firstFile = data.projectFiles.find((file) => file.project_id === projectId);
            setSelectedFileId(firstFile?.id ?? "");
          }}
          onSendChat={handleSendChat}
          onUploadFiles={handleUploadFiles}
        />
      )}
  {activeSection === "ideas" && (
        <IdeaForum
          currentUser={currentUser}
          data={data}
          isBusy={isBusy}
          onCreateIdea={handleCreateIdea}
          onPostIdeaComment={handlePostIdeaComment}
          onUpvoteIdea={handleUpvoteIdea}
        />
      )}
  {activeSection === "showcase" && (
        <ShowcaseGallery
          currentUser={currentUser}
          data={data}
          isBusy={isBusy}
          onLikeShowcase={handleLikeShowcase}
          onPostFeedback={handlePostShowcaseFeedback}
          onPublishShowcase={handlePublishShowcase}
        />
      )}
    </AppLayout>
  );async function runTask(task, successMessage) {
    setIsBusy(true);
    try { await task();
      await refreshData();
      setNotice(successMessage);
    } catch (error) {  setNotice(`작업 실패: ${error.message}`);
    } finally { setIsBusy(false);
    }
  }
 async function logActivity(projectId, actionType, message) {
    await createRecord("activityLogs", {
      project_id: projectId,
      actor_name: currentUser,
      action_type: actionType,
      message,
    });
  }

 function handleCreateProject(form) {
    return runTask(async () => {
      const project = await createRecord("projects", {
        ...form,
        owner_name: currentUser,
        status: "진행 중",
      });
      await logActivity(project.id, "project_created", "프로젝트를 만들었습니다.");
      setSelectedProjectId(project.id);
      setSelectedFileId("");
    }, "프로젝트가 생성되었습니다.");
  }
  function handleDeleteProject(projectId) {
    return runTask(async () => {
      await deleteRecord("projects", projectId);
    }, "프로젝트가 삭제되었습니다.");
  }
  function handleUploadFiles(files) {
    if (!selectedProject) return null;
    return runTask(async () => {
      const fileList = Array.from(files);
      for (const file of fileList) {
        const versionNumber =
          data.projectFiles.filter(
            (item) => item.project_id === selectedProject.id && item.version_group === file.name,
          ).length + 1;
        const savedFile = await uploadProjectFile({
          projectId: selectedProject.id,
          file,
          versionNumber,
          actorName: currentUser,
        });
        setSelectedFileId(savedFile.id);
        await logActivity(selectedProject.id, "file_uploaded", `${file.name} 파일을 업로드했습니다.`);
      }
    }, "파일이 업로드되었습니다.");
  }
  function handleAddLink(form) {
    if (!selectedProject) return null;
    return runTask(async () => {
      await createProjectLink({
        projectId: selectedProject.id,
        title: form.title,
        url: form.url,
        actorName: currentUser,
      });
      await logActivity(selectedProject.id, "link_added", `${form.title} 링크를 추가했습니다.`);
    }, "링크가 추가되었습니다.");
  }
  function handlePostProjectComment(body) {
    if (!selectedProject) return null;
    return runTask(async () => {
      await createRecord("projectComments", {
        project_id: selectedProject.id,
        author_name: currentUser,
        body,
      });
      await logActivity(selectedProject.id, "project_comment", "프로젝트 댓글을 남겼습니다.");
    }, "댓글이 저장되었습니다.");
  }
  function handleAddFileComment(body) {
    if (!selectedProject || !selectedFile) return null;
    return runTask(async () => {
      await createRecord("fileComments", {
        project_id: selectedProject.id,
        file_id: selectedFile.id,
        author_name: currentUser,
        body,
      });
      await logActivity(
        selectedProject.id,
        "file_comment",
        `${selectedFile.original_name} 파일에 피드백을 남겼습니다.`,
      );
    }, "파일 피드백이 저장되었습니다.");
  }
  function handlePostUpdate(form) {
    if (!selectedProject) return null;
    return runTask(async () => {
      await createRecord("projectUpdates", {
        project_id: selectedProject.id,
        author_name: currentUser,
        title: form.title,
        body: form.body,
      });
      await logActivity(selectedProject.id, "project_update", `${form.title} 업데이트를 게시했습니다.`);
    }, "프로젝트 업데이트가 게시되었습니다.");
  }function handleSendChat(body) {
    if (!selectedProject) return null;
    return runTask(async () => {
      await createRecord("chatMessages", {
        project_id: selectedProject.id,
        author_name: currentUser,
        body,
      });
    }, "메시지를 보냈습니다.");
  } function handleCreateIdea(form) {
    return runTask(async () => {
      await createRecord("ideas", {
        ...form,
        author_name: currentUser,
        upvotes: 0,
      });
    }, "아이디어가 게시되었습니다.");
  }
function handleUpvoteIdea(idea) {
    return runTask(async () => {
      await updateRecord("ideas", idea.id, { upvotes: Number(idea.upvotes ?? 0) + 1 });
    }, "추천했습니다.");
  }
 function handlePostIdeaComment(ideaId, body) {
    return runTask(async () => {
      await createRecord("ideaComments", {
        idea_id: ideaId,
        author_name: currentUser,
        body,
      });
    }, "토론 댓글이 저장되었습니다.");
  }function handlePublishShowcase(form) {
    return runTask(async () => {
      const screenshot = await uploadShowcaseScreenshot(form.screenshot);
      await createRecord("showcases", {
        project_id: form.project_id || null,
        title: form.title,
        description: form.description,
        demo_url: form.demo_url,
        likes: 0,
        ...screenshot,
      });
    }, "쇼케이스에 공개되었습니다.");
  }function handleLikeShowcase(showcase) {
    return runTask(async () => {
      await updateRecord("showcases", showcase.id, { likes: Number(showcase.likes ?? 0) + 1 });
    }, "좋아요를 남겼습니다.");
  } function handlePostShowcaseFeedback(showcaseId, body) {
    return runTask(async () => {
      await createRecord("showcaseFeedback", {
        showcase_id: showcaseId,
        author_name: currentUser,
        body,
      });
    }, "쇼케이스 피드백이 저장되었습니다.");
  }
}

export default App;