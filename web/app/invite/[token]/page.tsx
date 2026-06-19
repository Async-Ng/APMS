"use client";

import "@/lib/amplify";
import { signInWithRedirect } from "aws-amplify/auth";
import { FileText, Folder } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

import { BrutalCard } from "@/components/ui/BrutalCard";
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton";
import { getUserErrorMessage } from "@/lib/errors";
import { setPendingInviteToken } from "@/lib/inviteStorage";
import { useInvitePreview } from "@/lib/queries/shares";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function InvitePage({ params }: PageProps) {
  const { token } = use(params);
  const { data: invite, isLoading, error } = useInvitePreview(token);
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    setPendingInviteToken(token);
    try {
      await signInWithRedirect({ provider: "Google" });
    } catch {
      setIsSigningIn(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brutal-bg px-4">
      <BrutalCard className="max-w-md text-center">
        {isLoading ? (
          <p className="py-2 text-sm text-brutal-muted">Đang tải lời mời…</p>
        ) : error || !invite ? (
          <div className="space-y-4">
            <p className="rounded-lg border-2 border-brutal-ink bg-brutal-accent/30 px-3 py-2 text-sm font-medium text-brutal-ink">
              {getUserErrorMessage(error)}
            </p>
            <Link
              href="/login"
              className="focus-brutal inline-block font-heading font-bold underline underline-offset-4"
            >
              Về trang đăng nhập
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-brutal-ink bg-brutal-primary text-brutal-on-brand">
                {invite.resourceType === "folder" ? (
                  <Folder className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <FileText className="h-6 w-6" aria-hidden="true" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-extrabold">
                {invite.sharerName} đã chia sẻ với bạn
              </h1>
              <p className="text-sm text-brutal-muted">
                {invite.resourceType === "folder" ? "Thư mục" : "Tài liệu"}{" "}
                <span className="font-bold text-brutal-ink">&ldquo;{invite.resourceName}&rdquo;</span>{" "}
                trên APMS. Đăng nhập bằng Google ({invite.email}) để xem ngay.
              </p>
            </div>
            <GoogleSignInButton
              onClick={() => void handleGoogleSignIn()}
              loading={isSigningIn}
              className="w-full"
            />
          </div>
        )}
      </BrutalCard>
    </main>
  );
}
