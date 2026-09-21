import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { PageContainer } from "@/components/layout/page-container";
import { getOptionalSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getOptionalSession();

  if (session?.user) {
    redirect("/wake-up");
  }

  return (
    <PageContainer centered narrow>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </PageContainer>
  );
}
