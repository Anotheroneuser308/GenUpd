import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {
  STORAGE_KEY,
  STORAGE_BACKUP_KEY,
  STORAGE_PREV_BACKUP_KEY,
} from './constants/initialState';

// Emergency recovery: add ?wipeSave=1 to this URL to clear a corrupted save
// before React loads it (useful when the broken save makes the game unusably slow).
const emergencyWipeRequested =
  new URLSearchParams(window.location.search).get('wipeSave') === '1';

if (emergencyWipeRequested) {
  try {
    [
      STORAGE_KEY,
      STORAGE_BACKUP_KEY,
      STORAGE_PREV_BACKUP_KEY,
      'generators_save_bank_previous_v1',
    ].forEach((key) => window.localStorage.removeItem(key));

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('wipeSave');
    window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
  } catch (error) {
    console.error('Emergency save wipe failed. You may need to clear this app’s site storage manually.', error);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
