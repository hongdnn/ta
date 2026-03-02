import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { CommandPalette } from './CommandPalette';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  );
}
