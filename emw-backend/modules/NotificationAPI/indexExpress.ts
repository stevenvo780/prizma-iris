export const NotificationAPI = {
  endpoints: [
    {
      method: 'POST',
      path: '/api/notifications',
      handler: undefined as any,
      description: 'Create and send a new notification',
    },
    {
      method: 'POST',
      path: '/api/templates/send',
      handler: undefined as any,
      description: 'Send a template message',
    },
    {
      method: 'GET',
      path: '/api/notifications/:id/status',
      handler: undefined as any,
      description: 'Get notification status by ID',
    },
    {
      method: 'GET',
      path: '/api/notifications/health',
      handler: undefined as any,
      description: 'Health check for notification service',
    },
  ],
};
