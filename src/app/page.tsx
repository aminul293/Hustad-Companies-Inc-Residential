import { SessionProvider } from "@/components/SessionProvider";
import { ScreenRouter } from "@/components/ScreenRouter";
import { AuthProvider } from "@/components/AuthProvider";

export default function Home() {
  return (
    <AuthProvider>
      <SessionProvider>
        <div className="h-screen w-screen overflow-hidden">
          <ScreenRouter />
        </div>
      </SessionProvider>
    </AuthProvider>
  );
}
