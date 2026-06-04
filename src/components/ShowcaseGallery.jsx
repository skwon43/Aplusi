import { useState } from "react";
import { ExternalLink, Heart, MessageCircle, Plus } from "lucide-react";
import heroImage from "../assets/hero.png";

const emptyShowcase = {
  project_id: "",
  title: "",
  description: "",
  demo_url: "",
  screenshot: null,
};

function ShowcaseGallery({
  currentUser,
  data,
  isBusy,
  onLikeShowcase,
  onPostFeedback,
  onPublishShowcase,
}) {
  const [form, setForm] = useState(emptyShowcase);
  const [feedbackDrafts, setFeedbackDrafts] = useState({});

  return (
    <section className="showcase-layout">
      <div className="panel">
        <div className="panel-title">
          <p>Showcase</p>
          <h2>완성작 공개하기</h2>
        </div>
        <div className="form-stack">
          <select
            value={form.project_id}
            onChange={(event) => {
              const project = data.projects.find((item) => item.id === event.target.value);
              setForm({
                ...form,
                project_id: event.target.value,
                title: project?.title ?? form.title,
                description: project?.description ?? form.description,
              });
            }}
          >
            <option value="">프로젝트 선택 안 함</option>
            {data.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="쇼케이스 제목"
          />
          <input
            value={form.demo_url}
            onChange={(event) => setForm({ ...form, demo_url: event.target.value })}
            placeholder="데모 링크"
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="무엇을 만들었고 어떤 반응을 받고 싶나요?"
            rows="4"
          />
          <label className="file-input-label">
            스크린샷 업로드
            <input
              accept="image/*"
              type="file"
              onChange={(event) => setForm({ ...form, screenshot: event.target.files?.[0] ?? null })}
            />
          </label>
          <button
            className="primary-action"
            disabled={isBusy || !form.title.trim()}
            onClick={async () => {
              await onPublishShowcase(form);
              setForm(emptyShowcase);
            }}
          >
            <Plus size={16} />
            쇼케이스 공개
          </button>
        </div>
      </div>

      <div className="showcase-grid">
        {data.showcases.map((showcase) => {
          const feedback = data.showcaseFeedback.filter(
            (item) => item.showcase_id === showcase.id,
          );
          return (
            <article className="panel showcase-card" key={showcase.id}>
              <img src={showcase.screenshot_url || heroImage} alt={`${showcase.title} 스크린샷`} />
              <div className="showcase-body">
                <span>완성작</span>
                <strong>{showcase.title}</strong>
                <p>{showcase.description}</p>
                <div className="idea-actions">
                  <button onClick={() => onLikeShowcase(showcase)}>
                    <Heart size={16} />
                    {showcase.likes ?? 0}
                  </button>
                  <span>
                    <MessageCircle size={16} />
                    {feedback.length}
                  </span>
                  {showcase.demo_url && (
                    <a href={showcase.demo_url} target="_blank" rel="noreferrer">
                      <ExternalLink size={16} />
                      데모
                    </a>
                  )}
                </div>
                <div className="comment-list">
                  {feedback.map((item) => (
                    <article key={item.id}>
                      <strong>{item.author_name}</strong>
                      <p>{item.body}</p>
                    </article>
                  ))}
                </div>
                <div className="inline-comment">
                  <input
                    value={feedbackDrafts[showcase.id] ?? ""}
                    onChange={(event) =>
                      setFeedbackDrafts({
                        ...feedbackDrafts,
                        [showcase.id]: event.target.value,
                      })
                    }
                    placeholder={`${currentUser}님의 피드백`}
                  />
                  <button
                    disabled={!feedbackDrafts[showcase.id]?.trim()}
                    onClick={async () => {
                      await onPostFeedback(showcase.id, feedbackDrafts[showcase.id]);
                      setFeedbackDrafts({ ...feedbackDrafts, [showcase.id]: "" });
                    }}
                  >
                    남기기
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ShowcaseGallery;
