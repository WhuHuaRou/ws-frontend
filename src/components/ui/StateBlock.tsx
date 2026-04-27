type StateBlockProps = {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
};

export function StateBlock({ title, description, action, onAction }: StateBlockProps) {
  return (
    <div className="state-block">
      <span className="state-glyph" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? (
        <button className="primary-button" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  );
}
