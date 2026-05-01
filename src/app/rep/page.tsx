import { SessionProvider } from "@/components/SessionProvider";
import { ScreenRouter } from "@/components/ScreenRouter";

export default function RepPortalPage() {
  return (
    <SessionProvider>
      <ScreenRouter />
    </SessionProvider>
  );
}
