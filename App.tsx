
import React, { useState, useEffect, useCallback } from 'react';

// --- CONSTANTS ---
const API_URL = 'https://api.frankfurter.app/latest?from=SGD&to=MYR';
// CHECK_INTERVAL_MS is now dynamic based on user state
const SOUNDS: Record<string, string> = {
  'Default': '',
  'Chime': 'https://soundbible.com/grab.php?id=1954&type=mp3',
  'Alert': 'https://soundbible.com/grab.php?id=1793&type=mp3',
  'Beep': 'https://soundbible.com/grab.php?id=1211&type=mp3',
};


// --- SVG ICONS ---
const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 10M20 20l-1.5-1.5A9 9 0 003.5 14" />
    </svg>
);

// --- HELPER COMPONENTS (Defined outside App to prevent re-creation on re-render) ---

interface StatusIndicatorProps {
  isLoading: boolean;
  error: string | null;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isLoading, error }) => {
  let statusColor = 'bg-gray-400';
  let statusText = 'Initializing...';
  let animate = false;

  if (isLoading) {
    statusColor = 'bg-blue-500';
    statusText = 'Checking...';
    animate = true;
  } else if (error) {
    statusColor = 'bg-red-500';
    statusText = 'Error';
  } else {
    statusColor = 'bg-green-500';
    statusText = 'Monitoring';
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${statusColor} ${animate ? 'animate-pulse' : ''}`}></div>
      <span className="text-sm text-slate-500 dark:text-slate-400">{statusText}</span>
    </div>
  );
};

interface RateDisplayProps {
  rate: number | null;
  isLoading: boolean;
}

const RateDisplay: React.FC<RateDisplayProps> = ({ rate, isLoading }) => {
  if (isLoading && rate === null) {
    return (
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
      </div>
    );
  }

  return (
    <div className="text-center my-4">
      <p className="text-slate-600 dark:text-slate-400 text-lg">1 SGD equals</p>
      <h2 className="text-5xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
        {rate ? rate.toFixed(4) : '-.----'}
      </h2>
      <p className="text-slate-600 dark:text-slate-400 text-lg">MYR</p>
    </div>
  );
};


interface NotificationBannerProps {
  permission: NotificationPermission;
  onRequest: () => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ permission, onRequest }) => {
  if (permission === 'granted') {
    return null;
  }
  
  return (
    <div className="bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded-md flex items-center justify-between">
      <div className="flex items-center">
        <BellIcon className="h-6 w-6 mr-3"/>
        <p className="font-semibold">
          {permission === 'denied' ? 'Notifications are blocked' : 'Enable notifications for alerts'}
        </p>
      </div>
      {permission === 'default' && (
        <button 
          onClick={onRequest}
          className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-200"
        >
          Enable
        </button>
      )}
    </div>
  );
};


// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [rate, setRate] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  // Settings State
  const [threshold, setThreshold] = useState<number>(3.20);
  const [inputThreshold, setInputThreshold] = useState<string>('3.20');
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  const [checkInterval, setCheckInterval] = useState<number>(10); // minutes
  const [inputCheckInterval, setInputCheckInterval] = useState<string>('10');
  const [intervalError, setIntervalError] = useState<string | null>(null);
  
  const [notificationSound, setNotificationSound] = useState<string>('');

  useEffect(() => {
    // Set initial permission state from browser
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);
  
  const requestNotificationPermission = useCallback(() => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    Notification.requestPermission().then((permission) => {
      setNotificationPermission(permission);
    });
  }, []);
  
  const fetchRate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText} (${response.status})`);
      }
      const data = await response.json();
      const newRate = data.rates.MYR;
      
      setRate(newRate);
      setLastChecked(new Date());

      if (newRate > threshold && Notification.permission === 'granted') {
        const notificationOptions: NotificationOptions = {
          body: `SGD is now ${newRate.toFixed(4)} MYR, exceeding the ${threshold} threshold.`,
        };

        if (notificationSound) {
          const audio = new Audio(notificationSound);
          audio.play().catch(e => console.error("Error playing audio:", e));
          notificationOptions.silent = true;
        }

        new Notification('SGD to MYR Rate Alert!', notificationOptions);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch exchange rate:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [threshold, notificationSound]);

  useEffect(() => {
    fetchRate();
    const intervalMs = checkInterval * 60 * 1000;
    const intervalId = setInterval(fetchRate, intervalMs);
    
    return () => clearInterval(intervalId);
  }, [fetchRate, checkInterval]);

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputThreshold(e.target.value);
    if (thresholdError) {
      setThresholdError(null);
    }
  };

  const handleSetThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    const newThreshold = parseFloat(inputThreshold);
    if (!isNaN(newThreshold) && newThreshold > 0) {
      setThreshold(newThreshold);
      setInputThreshold(newThreshold.toString());
      setThresholdError(null);
    } else {
      setThresholdError('Please enter a valid positive number.');
    }
  };

  const handleCheckIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputCheckInterval(e.target.value);
    if (intervalError) {
      setIntervalError(null);
    }
  };

  const handleSetCheckInterval = (e: React.FormEvent) => {
    e.preventDefault();
    const newInterval = parseInt(inputCheckInterval, 10);
    if (!isNaN(newInterval) && newInterval > 0) {
      setCheckInterval(newInterval);
      setInputCheckInterval(newInterval.toString());
      setIntervalError(null);
    } else {
      setIntervalError('Please enter a valid positive number (minutes).');
    }
  };

  const handleSoundChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNotificationSound(e.target.value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-800 shadow-2xl rounded-2xl overflow-hidden">
        <div className="p-6 md:p-8">
          <header className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">SGD to MYR Monitor</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Alert: &gt; {threshold.toFixed(2)} | Check: Every {checkInterval}m
              </p>
            </div>
            <button onClick={fetchRate} disabled={isLoading} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
              <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </header>
          
          <main className="space-y-5">
            {/* Threshold Form */}
            <form onSubmit={handleSetThreshold} className="space-y-2">
              <label htmlFor="threshold-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Alert Threshold (MYR)
              </label>
              <div className="flex items-center space-x-2">
                  <input
                      id="threshold-input"
                      type="number"
                      step="0.01"
                      value={inputThreshold}
                      onChange={handleThresholdChange}
                      className="block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400
                                text-slate-900 dark:text-slate-100
                                focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      aria-describedby="threshold-error"
                  />
                  <button
                      type="submit"
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                      Set
                  </button>
              </div>
              {thresholdError && <p id="threshold-error" className="text-xs text-red-500">{thresholdError}</p>}
            </form>

            {/* Check Interval Form */}
            <form onSubmit={handleSetCheckInterval} className="space-y-2">
              <label htmlFor="interval-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Check Interval (minutes)
              </label>
              <div className="flex items-center space-x-2">
                  <input
                      id="interval-input"
                      type="number"
                      min="1"
                      step="1"
                      value={inputCheckInterval}
                      onChange={handleCheckIntervalChange}
                      className="block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400
                                text-slate-900 dark:text-slate-100
                                focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      aria-describedby="interval-error"
                  />
                  <button
                      type="submit"
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                      Set
                  </button>
              </div>
              {intervalError && <p id="interval-error" className="text-xs text-red-500">{intervalError}</p>}
            </form>

            <div className="space-y-2">
              <label htmlFor="sound-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Notification Sound
              </label>
              <select
                id="sound-select"
                value={notificationSound}
                onChange={handleSoundChange}
                className="block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm
                           text-slate-900 dark:text-slate-100
                           focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(SOUNDS).map(([name, url]) => (
                  <option key={name} value={url}>{name}</option>
                ))}
              </select>
            </div>

            <RateDisplay rate={rate} isLoading={isLoading} />
            <div className="text-center text-xs text-slate-400 dark:text-slate-500">
              {lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : 'Waiting for first check...'}
            </div>
            <NotificationBanner permission={notificationPermission} onRequest={requestNotificationPermission} />
          </main>
        </div>
        <footer className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 px-6 py-3">
          <StatusIndicator isLoading={isLoading} error={error} />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </footer>
      </div>
    </div>
  );
};

export default App;
