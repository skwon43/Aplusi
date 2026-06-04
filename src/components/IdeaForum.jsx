import { useState } from "react";
import { MessageCircle, Plus, ThumbsUp } from "lucide-react";

const emptyIdea = { title: "", category: "아이디어", body: "" };

function IdeaForum({ currentUser, data, isBusy, onCreateIdea, onPostIdeaComment, onUpvoteIdea }) {
  const [ideaForm, setIdeaForm] = useState(emptyIdea);
  const [commentDrafts, setCommentDrafts] = useState({});

  return (
    <section className="forum-grid">
      <div className="panel">
        <div className="panel-title">
          <p>Idea Base</p>
          <h2>아이디어 공유하기</h2>
        </div>
        <div className="form-stack">
          <input
            value={ideaForm.title}
            onChange={(event) => setIdeaForm({ ...ideaForm, title: event.target.value })}
            placeholder="아이디어 제목"
          />
          <input
            value={ideaForm.category}
            onChange={(event) => setIdeaForm({ ...ideaForm, category: event.target.value })}
            placeholder="카테고리"
          />
          <textarea
            value={ideaForm.body}
            onChange={(event) => setIdeaForm({ ...ideaForm, body: event.target.value })}
            placeholder="어떤 문제를 해결하고 싶나요?"
            rows="5"
          />
          <button
            className="primary-action"
            disabled={isBusy || !ideaForm.title.trim()}
            onClick={async () => {
              await onCreateIdea(ideaForm);
              setIdeaForm(emptyIdea);
            }}
          >
            <Plus size={16} />
            아이디어 올리기
          </button>
        </div>
      </div>

      <div className="idea-list">
        {data.ideas.map((idea) => {
          const comments = data.ideaComments.filter((comment) => comment.idea_id === idea.id);
          return (
            <article className="panel idea-card" key={idea.id}>
              <div className="idea-head">
                <span>{idea.category}</span>
                <strong>{idea.title}</strong>
                <small>{idea.author_name}</small>
              </div>
              <p>{idea.body}</p>
              <div className="idea-actions">
                <button onClick={() => onUpvoteIdea(idea)}>
                  <ThumbsUp size={16} />
                  {idea.upvotes ?? 0}
                </button>
                <span>
                  <MessageCircle size={16} />
                  {comments.length}
                </span>
              </div>
              <div className="comment-list">
                {comments.map((comment) => (
                  <article key={comment.id}>
                    <strong>{comment.author_name}</strong>
                    <p>{comment.body}</p>
                  </article>
                ))}
              </div>
              <div className="inline-comment">
                <input
                  value={commentDrafts[idea.id] ?? ""}
                  onChange={(event) =>
                    setCommentDrafts({ ...commentDrafts, [idea.id]: event.target.value })
                  }
                  placeholder={`${currentUser}님의 의견`}
                />
                <button
                  disabled={!commentDrafts[idea.id]?.trim()}
                  onClick={async () => {
                    await onPostIdeaComment(idea.id, commentDrafts[idea.id]);
                    setCommentDrafts({ ...commentDrafts, [idea.id]: "" });
                  }}
                >
                  댓글
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default IdeaForum;
