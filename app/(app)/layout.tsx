import { NavBar } from "@/components/layout/NavBar";
import { InstallPrompt } from "@/components/layout/InstallPrompt";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <InstallPrompt />
      <NavBar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
