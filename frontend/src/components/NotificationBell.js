import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const typeIcons = {
  new_booking: "bg-amber-500/10 text-amber-500",
  booking_update: "bg-blue-500/10 text-blue-500",
  new_review: "bg-green-500/10 text-green-500",
  referral_credit: "bg-purple-500/10 text-purple-500",
};

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API}/notifications/unread-count`, { withCredentials: true });
      setUnread(res.data.count);
    } catch { /* ignore */ }
  }, [user]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API}/notifications`, { withCredentials: true });
      setNotifications(res.data);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const handleOpen = () => {
    setOpen(!open);
    if (!open) fetchAll();
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`, {}, { withCredentials: true });
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        data-testid="notification-bell"
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-zinc-800 transition-colors"
      >
        <Bell className="w-5 h-5 text-zinc-400" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 max-h-96 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">Notificaciones</h3>
              {unread > 0 && (
                <button
                  data-testid="mark-all-read"
                  onClick={markAllRead}
                  className="text-xs text-amber-500 hover:underline"
                >
                  Marcar todas como leidas
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-6">Sin notificaciones</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.notification_id}
                  data-testid={`notification-${n.notification_id}`}
                  className={`p-3 border-b border-zinc-800/50 last:border-0 ${
                    !n.read ? "bg-zinc-800/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${typeIcons[n.type] || "bg-zinc-800 text-zinc-400"}`}>
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{n.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-zinc-600 mt-1">
                        {new Date(n.created_at).toLocaleDateString("es-ES", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
