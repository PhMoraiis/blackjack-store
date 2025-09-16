"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import Loader from "@/components/ui/loader";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { isPending } = authClient.useSession();

  const githubSignIn = async () => {
    await authClient.signIn.social(
      {
        provider: "github",
      },
      {
        onSuccess: () => {
          router.push("/dashboard");
          toast.success("Sign in successful");
        },
        onError: (error) => {
          toast.error(error.error.message || error.error.statusText);
        },
      },
    );
  };

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="mb-6 text-center font-bold text-3xl">Welcome Back</h1>
      <Button onClick={githubSignIn}>Continuar com Github</Button>
    </div>
  );
}
