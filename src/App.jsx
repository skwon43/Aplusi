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