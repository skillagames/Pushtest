import { useState, useEffect } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Bell, Smartphone, Send, ShieldAlert, List, Copy, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [isNative, setIsNative] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev]);
  };

  useEffect(() => {
    const checkPlatform = async () => {
      const native = Capacitor.isNativePlatform();
      setIsNative(native);
      addLog(`Platform initialized. Native app: ${native}`);

      if (native) {
        await setupPush();
        await setupLocalNotifications();
      } else {
        addLog("Running on Web. Push notifications require iOS/Android.");
      }
    };
    
    checkPlatform();
  }, []);

  const setupPush = async () => {
    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        addLog('User denied push permission');
        return;
      }
      
      await PushNotifications.register();
      addLog('Push permission granted & registered');
    } catch (error: any) {
      addLog(`Error requesting push permission: ${error.message}`);
    }
  }

  const setupLocalNotifications = async () => {
    try {
        let permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display === 'prompt') {
            await LocalNotifications.requestPermissions();
        }
    } catch (error: any) {
        addLog(`Error requesting local notification permission: ${error.message}`);
    }
  }

  useEffect(() => {
    if (!isNative) return;

    PushNotifications.addListener('registration',
      (token: Token) => {
        setPushToken(token.value);
        addLog(`Push registration success.`);
      }
    );

    PushNotifications.addListener('registrationError',
      (error: any) => {
        addLog('Error on registration: ' + JSON.stringify(error));
      }
    );

    PushNotifications.addListener('pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        setNotifications(prev => [notification, ...prev]);
        addLog(`Push received: ${notification.title || "No Title"}`);
      }
    );

    PushNotifications.addListener('pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        setNotifications(prev => [notification.notification, ...prev]);
        addLog(`Push action: ${notification.actionId}`);
      }
    );

    LocalNotifications.addListener('localNotificationReceived', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        addLog(`Local received: ${notification.title}`);
    });

    LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        setNotifications(prev => [notificationAction.notification, ...prev]);
        addLog(`Local action: ${notificationAction.actionId}`);
    });


    return () => {
      PushNotifications.removeAllListeners();
      LocalNotifications.removeAllListeners();
    }
  }, [isNative]);

  const triggerLocalNotification = async () => {
    try {
        addLog("Triggering local notification...");
        
        let permStatus = await LocalNotifications.checkPermissions();

        if (permStatus.display === 'prompt') {
            permStatus = await LocalNotifications.requestPermissions();
        }
        
        if (permStatus.display !== 'granted') {
            addLog('Local notification permission denied');
            // Check if we are on web, we might fall back to browser Notification API
            if (!Capacitor.isNativePlatform() && 'Notification' in window) {
              addLog('Falling back to web notifications...');
              const webPerm = await window.Notification.requestPermission();
              if (webPerm === 'granted') {
                new window.Notification("Test Local Web Notification", { body: "This works on web too!" });
                addLog('Web notification sent immediately.');
              }
            }
            return;
        }

        await LocalNotifications.schedule({
            notifications: [
                {
                    title: "Test Local Notification",
                    body: "This is a local notification triggered just now!",
                    id: Math.floor(Math.random() * 100000),
                    schedule: { at: new Date(Date.now() + 3000) }, // 3 seconds from now
                    sound: undefined,
                    attachments: undefined,
                    actionTypeId: "",
                    extra: null
                }
            ]
        });
        
        addLog('Local notification scheduled in 3 seconds');
    } catch (e: any) {
        addLog(`Local notification error: ${e.message}`);
    }
  }

  const copyToken = () => {
    if (pushToken) {
      navigator.clipboard.writeText(pushToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans sm:p-6 md:p-8 flex justify-center">
      <div className="w-full max-w-md bg-white sm:rounded-3xl sm:shadow-xl overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:min-h-[800px] border border-neutral-200">
        
        {/* Header */}
        <header className="bg-indigo-600 text-white p-6 pb-8 rounded-b-3xl shadow-md z-10 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <Smartphone className="w-6 h-6 text-indigo-200" />
            <h1 className="text-xl font-bold tracking-tight">Notification Tester</h1>
          </div>
          <p className="text-indigo-100 text-sm">Capacitor Push & Local API</p>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-neutral-50" style={{ marginTop: '-1rem' }}>
          
          {/* Status Card */}
          <section className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 mt-2">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Environment
            </h2>
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
              <span className="text-sm font-medium">Native Platform</span>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${isNative ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {isNative ? 'TRUE' : 'FALSE (WEB)'}
              </span>
            </div>
            
            <div className="mt-3">
              <span className="text-sm font-medium block mb-1">Push Token</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-neutral-100 p-2 rounded-lg truncate text-xs text-neutral-600 font-mono">
                  {pushToken || 'Waiting for token...'}
                </div>
                <button 
                  onClick={copyToken}
                  disabled={!pushToken}
                  className="p-2 bg-indigo-50 text-indigo-600 rounded-lg disabled:opacity-50 hover:bg-indigo-100 transition-colors"
                  title="Copy Token"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2 ml-1">Actions</h2>
            <button 
              onClick={triggerLocalNotification}
              className="w-full relative overflow-hidden group bg-indigo-600 hover:bg-indigo-700 text-white font-medium p-4 rounded-2xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Bell className="w-5 h-5" />
              <span>Trigger Local Notification (3s)</span>
            </button>
            {!isNative && (
              <p className="text-xs text-neutral-500 text-center px-4">
                Note: Remote push notifications cannot be triggered from the web app directly. They must be sent via FCM/APNS to a native device.
              </p>
            )}
          </section>

          {/* Received Notifications */}
          <section>
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2 ml-1">
              <List className="w-4 h-4" /> Received ({notifications.length})
            </h2>
            {notifications.length === 0 ? (
              <div className="text-center p-6 bg-transparent border-2 border-dashed border-neutral-200 rounded-2xl text-neutral-400">
                <p className="text-sm">No notifications received yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100">
                    <p className="font-semibold text-neutral-900 mb-1">{notif.title || 'Notification'}</p>
                    <p className="text-sm text-neutral-600 mb-3">{notif.body}</p>
                    <div className="bg-neutral-50 p-2 rounded-lg overflow-hidden">
                       <pre className="text-[10px] text-neutral-500 font-mono whitespace-pre-wrap word-break">
                         {JSON.stringify(notif.data || notif.extra || {}, null, 2)}
                       </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Logs */}
          <section className="pb-8">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2 ml-1">
              <Send className="w-4 h-4" /> Debug Logs
            </h2>
            <div className="bg-neutral-900 text-green-400 font-mono text-[11px] p-4 rounded-2xl h-48 overflow-y-auto no-scrollbar shadow-inner">
              {logs.length === 0 && <span className="text-neutral-500">Waiting for events...</span>}
              {logs.map((log, i) => (
                <div key={i} className="mb-1 border-b border-neutral-800 pb-1 break-words">
                  {log}
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
