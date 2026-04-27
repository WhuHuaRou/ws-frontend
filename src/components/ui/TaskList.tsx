import type { TaskSummary } from "../../types/dashboard";

export function TaskList({ tasks }: { tasks: TaskSummary[] }) {
  return (
    <section className="panel task-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">待办</p>
          <h2>今日重点任务</h2>
        </div>
      </div>
      <div className="task-list">
        {tasks.map((task) => (
          <article className="task-item" key={task.id}>
            <div>
              <strong>{task.title}</strong>
              <span>
                {task.owner} / {task.dueAt}
              </span>
            </div>
            <div className="progress-track" aria-label={`${task.title} 进度 ${task.progress}%`}>
              <span style={{ width: `${task.progress}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
