import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { notificationsAPI } from '../services/api';

export const useWebSocket = (onMessageReceived) => {
  const { isAuthenticated, token } = useSelector((state) => state.auth);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const seenNotificationIds = useRef(new Set());

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
    
    // Convert HTTP base to WS base automatically
    let wsBaseUrl = apiBase
      .replace('http://', 'ws://')
      .replace('https://', 'wss://')
      .replace('/api', '');

    const wsUrl = `${wsBaseUrl}/ws/notifications/?token=${token}`;

    const initializeSeenNotifications = async () => {
      try {
        const res = await notificationsAPI.getList();
        const list = res.data || [];
        list.forEach(n => seenNotificationIds.current.add(n.id));
      } catch (err) {
        console.error("Failed to pre-populate seen notifications:", err);
      }
    };

    const startPollingFallback = () => {
      if (pollingIntervalRef.current) return;
      console.log("WebSocket connection failed/offline. Starting HTTP polling fallback...");
      
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const res = await notificationsAPI.getList();
          const list = res.data || [];
          
          // Filter to find any notifications we haven't seen yet
          // Process from oldest to newest so they appear in chronological order
          [...list].reverse().forEach(n => {
            if (!seenNotificationIds.current.has(n.id)) {
              seenNotificationIds.current.add(n.id);
              if (onMessageReceived) {
                onMessageReceived(n);
              }
            }
          });
        } catch (err) {
          console.error("Notification polling fallback failed:", err);
        }
      }, 30000); // Poll every 30 seconds
    };

    const stopPollingFallback = () => {
      if (pollingIntervalRef.current) {
        console.log("WebSocket connected. Stopping HTTP polling fallback.");
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    // Pre-populate already existing notifications to avoid duplicate alerts on load
    initializeSeenNotifications();

    const connect = () => {
      console.log("Connecting to notifications WebSocket: ", wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected successfully.");
        stopPollingFallback();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Add to seen notifications set
          if (data && data.id) {
            seenNotificationIds.current.add(data.id);
          }
          if (onMessageReceived) {
            onMessageReceived(data);
          }
        } catch (err) {
          console.error("Failed to parse WebSocket JSON payload:", err);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log("WebSocket disconnected. Code: ", event.code);
        
        // Start HTTP polling fallback as a backup
        startPollingFallback();

        // Automatic reconnection delay
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isAuthenticated) {
            console.log("Attempting to reconnect WebSocket...");
            connect();
          }
        }, 5000);
      };

      wsRef.current.onerror = (err) => {
        console.error("WebSocket error occurred: ", err);
        startPollingFallback();
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, token, onMessageReceived]);

  return wsRef;
};
