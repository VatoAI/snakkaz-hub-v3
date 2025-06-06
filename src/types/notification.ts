
export interface NotificationSettings {
  soundEnabled: boolean;
  soundVolume: number;
  vibrationEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  notify: (title: string, options?: NotificationOptions) => void;
}

