import { SessionProvider } from "@/components/SessionProvider";
import { ScreenRouter } from "@/components/ScreenRouter";

export default function Home() {
  return (
    <SessionProvider>
      <div className="h-screen w-screen overflow-hidden">
        <ScreenRouter />
      </div>
    </SessionProvider>
  );
}
