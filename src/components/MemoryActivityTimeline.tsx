import React, { useState, useEffect } from 'react';
import { activityService, MemoryActivity } from '@/services/activityService';

export default function MemoryActivityTimeline() {
  const [activities, setActivities] = useState<MemoryActivity[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await activityService.getRecentActivities(10);
      setActivities(data);
    };
    load();
  }, []);

  return (
    <div className="activity-timeline space-y-4 p-4 border rounded-lg bg-card">
      <h3 className="font-semibold text-lg">Memory Activity</h3>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent memory activities.</p>
      ) : (
        <div className="space-y-2">
          {activities.map(activity => (
            <div key={activity.id} className="activity-item flex items-center justify-between p-2 border-b last:border-0">
              <div className="flex flex-col">
                <span className={`text-xs font-medium uppercase ${activity.action === 'store' ? 'text-emerald-500' : 'text-blue-500'}`}>
                  {activity.action}
                </span>
                <span className="text-sm">{activity.content}</span>
              </div>
              <div className="flex flex-col items-end text-xs text-muted-foreground">
                <span className="capitalize">{activity.source}</span>
                <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}