/**
 * Sends OS-level notifications to the user.
 *
 * Electron implementation: use Electron's built-in Notification API.
 */
export interface INotifier {
  notify(title: string, body: string): void;
}
