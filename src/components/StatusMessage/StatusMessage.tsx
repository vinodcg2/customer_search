import './StatusMessage.scss';

type StatusMessageProps =
  | { readonly variant: 'loading'; readonly title: string }
  | { readonly variant: 'empty'; readonly title: string; readonly message?: string }
  | {
      readonly variant: 'error';
      readonly title: string;
      readonly message?: string;
      readonly onRetry: () => void;
    };

/** Full-panel message for the loading, empty and error states. */
export function StatusMessage(props: StatusMessageProps) {
  return (
    <div
      className={`status-message status-message--${props.variant}`}
      // Errors interrupt; loading and empty are announced by the dashboard's polite live region.
      role={props.variant === 'error' ? 'alert' : undefined}
    >
      {props.variant === 'loading' && <span className="status-message__spinner" aria-hidden="true" />}
      <p className="status-message__title">{props.title}</p>
      {props.variant !== 'loading' && props.message !== undefined && (
        <p className="status-message__text">{props.message}</p>
      )}
      {props.variant === 'error' && (
        <button type="button" className="status-message__retry" onClick={props.onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
