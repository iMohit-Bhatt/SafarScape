import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const notice = sp.expired
    ? "Your session ended. Sign in again to pick up where you left off."
    : sp.reset
      ? "Password updated. Sign in with your new password."
      : sp.signedout
        ? "You've signed out."
        : undefined;
  return <LoginForm next={sp.next} notice={notice} />;
}
