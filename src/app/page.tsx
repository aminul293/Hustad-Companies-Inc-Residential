import { SessionProvider } from "@/components/SessionProvider";
import { ScreenRouter } from "@/components/ScreenRouter";

export default function Home() {
  return (
    <SessionProvider>
      <div className="w-screen">
        <ScreenRouter />
      </div>
    </SessionProvider>
  );
}
