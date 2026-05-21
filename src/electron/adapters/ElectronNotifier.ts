import { Notification } from 'electron';
import { INotifier } from '../../core/application/ports/INotifier.js';

export class ElectronNotifier implements INotifier {
  notify(title: string, body: string): void {
    new Notification({ title, body }).show();
  }
}
