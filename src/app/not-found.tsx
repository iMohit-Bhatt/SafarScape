import { connection } from "next/server";
import SiteLayout from "./(site)/layout";
import NotFound from "./(site)/not-found";

export default async function GlobalNotFound() {
  // Render on request, not at build time: the site chrome reads agency settings from the database,
  // and builds (e.g. on Render/Vercel) must not depend on the database being reachable.
  await connection();
  return (
    <SiteLayout>
      <NotFound />
    </SiteLayout>
  );
}
