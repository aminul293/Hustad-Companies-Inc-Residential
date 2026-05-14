import { SessionProvider } from "@/components/SessionProvider";
import { ScreenRouter } from "@/components/ScreenRouter";

export default function Home() {
  return (
    <SessionProvider>
      <div className="w-screen bg-[#0A0A0A]">
        <ScreenRouter />
      </div>
    </SessionProvider>
  );
}
