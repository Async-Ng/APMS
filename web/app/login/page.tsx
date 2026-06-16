"use client";

import "@/lib/amplify";
import { signInWithRedirect, signOut } from "aws-amplify/auth";
import { BookOpen, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CatalogPreviewCard } from "@/components/landing/CatalogPreviewCard";
import { LoginNavbar } from "@/components/landing/LoginNavbar";
import { ProgressDemoCard } from "@/components/landing/ProgressDemoCard";
import { TestimonialCard } from "@/components/landing/TestimonialCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton";
import { catalogItems, testimonials } from "@/lib/landing-mock";
import { useAuthStore } from "@/stores/auth-store";

function SignInPanel({
  isAuthLoading,
  user,
  isLoading,
  onGoogleSignIn,
  onContinue,
  onSignOut,
}: {
  isAuthLoading: boolean;
  user: { displayName: string } | null;
  isLoading: boolean;
  onGoogleSignIn: () => void;
  onContinue: () => void;
  onSignOut: () => void;
}) {
  if (isAuthLoading) {
    return <p className="text-center text-sm text-brutal-muted">Đang tải...</p>;
  }

  if (user) {
    return (
      <div className="space-y-4 text-center">
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-extrabold">Chào mừng trở lại</h2>
          <p className="text-sm text-brutal-muted">Bạn đã đăng nhập và sẵn sàng.</p>
        </div>
        <BrutalButton variant="primary" className="w-full" onClick={onContinue}>
          Tiếp tục với <span className="font-bold">{user.displayName}</span>
        </BrutalButton>
        <BrutalButton variant="secondary" className="w-full" onClick={onSignOut}>
          Đăng xuất
        </BrutalButton>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 text-center">
        <h2 className="font-heading text-2xl font-extrabold">Chào mừng trở lại</h2>
        <p className="text-sm text-brutal-muted">Dùng tài khoản Google để tiếp tục.</p>
      </div>
      <GoogleSignInButton onClick={onGoogleSignIn} loading={isLoading} />
      <p className="text-center text-xs text-brutal-muted">Đăng nhập bảo mật qua Amazon Cognito</p>
    </>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { user, isLoading: isAuthLoading, fetchMe, clearUser } = useAuthStore();

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace("/drive");
    }
  }, [isAuthLoading, user, router]);

  async function handleGoogleSignIn() {
    setIsLoading(true);
    try {
      await signInWithRedirect({ provider: "Google" });
    } catch {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    clearUser();
  }

  function handleContinue() {
    router.push("/drive");
  }

  const showEnrollmentCta = !isAuthLoading && !user;

  return (
    <main className="min-h-screen bg-brutal-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-12">
        <LoginNavbar
          user={user}
          isAuthLoading={isAuthLoading}
          onSignOut={() => void handleSignOut()}
        />

        <section
          id="hero"
          className="scroll-mt-28 grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
        >
          <div className="space-y-6 text-center lg:text-left">
            <span className="brutal-badge mx-auto lg:mx-0">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Quản lý học tập cá nhân
            </span>
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Học thông minh hơn với{" "}
                <span className="text-brutal-primary">tài liệu của bạn</span>
              </h1>
              <p className="mx-auto max-w-lg text-base text-brutal-muted lg:mx-0">
                Đăng nhập Google để quản lý tài liệu học tập và trò chuyện với trợ lý AI
                dựa trên file của bạn.
              </p>
            </div>
            <ul className="mx-auto hidden max-w-md space-y-4 text-left lg:mx-0 lg:block">
              <li className="flex items-start gap-3 rounded-xl border-2 border-brutal-ink bg-brutal-secondary p-4 text-brutal-on-brand shadow-[3px_3px_0_0_#1A1A1A]">
                <BookOpen className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">
                  Sắp xếp PDF, DOCX và slide trong thư mục lồng nhau
                </span>
              </li>
              <li className="flex items-start gap-3 rounded-xl border-2 border-brutal-ink bg-brutal-accent p-4 text-brutal-on-brand shadow-[3px_3px_0_0_#1A1A1A]">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">
                  Đặt câu hỏi và nhận câu trả lời có trích dẫn từ tài liệu
                </span>
              </li>
            </ul>
          </div>

          <section className="mx-auto w-full max-w-md">
            <BrutalCard hover>
              <div className="space-y-6">
                <SignInPanel
                  isAuthLoading={isAuthLoading}
                  user={user}
                  isLoading={isLoading}
                  onGoogleSignIn={() => void handleGoogleSignIn()}
                  onContinue={handleContinue}
                  onSignOut={() => void handleSignOut()}
                />
              </div>
            </BrutalCard>
          </section>
        </section>

        <section id="catalog" className="scroll-mt-28 space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="font-heading text-3xl font-extrabold sm:text-4xl">
              Xem trước danh mục tài liệu
            </h2>
            <p className="text-brutal-muted">
              Gợi ý cách khóa học và tài liệu có thể trông trong APMS.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalogItems.map((item) => (
              <CatalogPreviewCard key={item.id} {...item} />
            ))}
          </div>
        </section>

        <section id="progress" className="scroll-mt-28">
          <ProgressDemoCard />
        </section>

        <section id="testimonials" className="scroll-mt-28 space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="font-heading text-3xl font-extrabold sm:text-4xl">
              Học viên nói gì
            </h2>
            <p className="text-brutal-muted">Trải nghiệm thực tế từ sinh viên FPT University.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <TestimonialCard key={item.id} {...item} />
            ))}
          </div>
        </section>

        {showEnrollmentCta && (
          <BrutalCard hover className="bg-brutal-primary p-6 text-brutal-on-brand sm:p-8">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
              <div className="space-y-2">
                <h2 className="font-heading text-3xl font-extrabold sm:text-4xl">
                  Sẵn sàng bắt đầu học?
                </h2>
                <p className="text-sm opacity-95">
                  Tham gia APMS bằng tài khoản Google và biến tài liệu thành trung tâm
                  học tập cá nhân.
                </p>
              </div>
              <GoogleSignInButton
                onClick={() => void handleGoogleSignIn()}
                loading={isLoading}
                className="max-w-sm"
              />
            </div>
          </BrutalCard>
        )}
      </div>
    </main>
  );
}
