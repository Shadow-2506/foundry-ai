import { supabase } from '@/lib/supabase';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Failed to fetch notifications from Supabase. Falling back to local storage:', err);
      try {
        const stored = localStorage.getItem('foundry_notifications');
        return stored ? JSON.parse(stored) : this.getSeedNotifications();
      } catch (e) {
        return this.getSeedNotifications();
      }
    }
  },

  async addNotification(title: string, message: string, type: string): Promise<NotificationItem> {
    const newNotification: NotificationItem = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
      is_read: false,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          title,
          message,
          type,
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      
      // Dispatch custom event to notify UI components
      window.dispatchEvent(new CustomEvent('foundry_notification_added'));
      return data;
    } catch (err) {
      console.warn('Failed to save notification to Supabase. Saving to local storage:', err);
      try {
        const stored = localStorage.getItem('foundry_notifications');
        const list = stored ? JSON.parse(stored) : this.getSeedNotifications();
        const updatedList = [newNotification, ...list];
        localStorage.setItem('foundry_notifications', JSON.stringify(updatedList));
        window.dispatchEvent(new CustomEvent('foundry_notification_added'));
      } catch (e) {
        console.error('Failed to save notification to local storage:', e);
      }
      return newNotification;
    }
  },

  async markAllAsRead(): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
    } catch (err) {
      console.warn('Failed to mark notifications as read in Supabase. Updating local storage:', err);
      try {
        const stored = localStorage.getItem('foundry_notifications');
        if (stored) {
          const list: NotificationItem[] = JSON.parse(stored);
          const updatedList = list.map(item => ({ ...item, is_read: true }));
          localStorage.setItem('foundry_notifications', JSON.stringify(updatedList));
        }
      } catch (e) {
        console.error(e);
      }
    }
    window.dispatchEvent(new CustomEvent('foundry_notification_added'));
  },

  getSeedNotifications(): NotificationItem[] {
    const seed = [
      {
        id: 'seed-1',
        title: 'Memory Added',
        message: 'Successfully stored "Adopt React 19" in the Memory Vault.',
        type: 'success',
        is_read: false,
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      },
      {
        id: 'seed-2',
        title: 'AI Analysis Finished',
        message: 'Time Machine successfully synthesized historical context for "Why did we choose React?".',
        type: 'info',
        is_read: false,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ];
    localStorage.setItem('foundry_notifications', JSON.stringify(seed));
    return seed;
  }
};