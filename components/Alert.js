import { XCircleIcon, ExclamationIcon } from "@heroicons/react/solid";
import { Show } from "./Show";

export const Alert = ({ style, title, messages }) => {
  const styles = { danger: "red", alert: "yellow" };

  return (
    <div className={`rounded-md bg-${styles[style]}-50 p-4`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Show when={style === "danger"}>
            <XCircleIcon className={`h-5 w-5 text-${styles[style]}-400`} aria-hidden="true" />
          </Show>

          <Show when={style === "alert"}>
            <ExclamationIcon className={`h-5 w-5 text-${styles[style]}-400`} aria-hidden="true" />
          </Show>
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium text-${styles[style]}-800`}>{title}</h3>

          <Show when={messages.length > 0}>
            <div className={`mt-2 text-sm text-${styles[style]}-700`}>
              <ul className="list-disc pl-5 space-y-1">
                {messages.map((message, key) => (
                  <li key={key}>{message}</li>
                ))}
              </ul>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

Alert.defaultProps = {
  style: "danger",
  title: "Please insert a title",
  messages: [],
};
