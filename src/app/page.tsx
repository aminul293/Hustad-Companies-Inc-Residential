import { SessionProvider } from "@/components/SessionProvider";
import { ScreenRouter } from "@/components/ScreenRouter";

export default function Home() {
  return (
    <div className="w-screen h-screen bg-[#06090F] flex items-center justify-center">
      <SessionProvider>
        <div className="relative w-full max-w-[1024px] h-full overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_32px_80px_rgba(0,0,0,0.6)]">
          <ScreenRouter />
        </div>
      </SessionProvider>
    </div>
  );
}
