"use client";

import "@/lib/amplify";
import { signInWithRedirect, signOut } from "aws-amplify/auth";
import {
  BookOpen,
  Bot,
  CheckCircle2,
  Database,
  FileSearch,
  FileText,
  FolderTree,
  GraduationCap,
  Library,
  LockKeyhole,
  MessageSquareQuote,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LoginNavbar } from "@/components/landing/LoginNavbar";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";

const heroFacts = [
  "Upload PDF, DOCX, PPTX gắn với môn học",
  "Tìm kiếm ngữ nghĩa trong tài liệu được phép xem",
  "Chat AI có trích dẫn mở về đúng nguồn",
] as const;

const workflowSteps: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: FileText,
    title: "Tải tài liệu theo môn",
    description: "Mỗi file mới được gắn với course slot trong curriculum của sinh viên.",
  },
  {
    icon: Database,
    title: "Xử lý và đánh chỉ mục",
    description: "Hệ thống trích xuất nội dung, chia chunk và tạo embedding bằng Gemini.",
  },
  {
    icon: Search,
    title: "Tìm hoặc hỏi bằng ngôn ngữ tự nhiên",
    description: "Atlas Vector Search truy xuất nguồn theo đúng quyền đọc của người dùng.",
  },
  {
    icon: MessageSquareQuote,
    title: "Mở lại nguồn trích dẫn",
    description: "Citation đưa người học về đúng tài liệu, trang hoặc đoạn nguồn khi metadata có sẵn.",
  },
];

const featureCards: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "primary" | "secondary" | "accent" | "surface";
}> = [
  {
    icon: FolderTree,
    title: "Tài liệu cá nhân",
    description: "Quản lý file và thư mục, đánh dấu sao, thùng rác và khôi phục.",
    tone: "secondary",
  },
  {
    icon: FileSearch,
    title: "Semantic Search",
    description: "Tìm theo ý nghĩa nội dung thay vì chỉ phụ thuộc tên file.",
    tone: "accent",
  },
  {
    icon: Bot,
    title: "Chat AI có nguồn",
    description: "Trả lời dựa trên tài liệu trong ngữ cảnh, có citation và evidence gate.",
    tone: "primary",
  },
  {
    icon: Library,
    title: "Tài liệu công khai",
    description: "Khám phá tài liệu public theo curriculum, học kỳ và môn học.",
    tone: "surface",
  },
  {
    icon: Share2,
    title: "Chia sẻ chỉ đọc",
    description: "Chia sẻ tài liệu hoặc thư mục cho người khác mà không cấp quyền chỉnh sửa.",
    tone: "surface",
  },
  {
    icon: GraduationCap,
    title: "Hồ sơ học vụ",
    description: "Gắn tài liệu với chương trình đào tạo để Drive sắp xếp đúng môn.",
    tone: "surface",
  },
];

const ruleItems = [
  "Đăng nhập bằng Google qua Amazon Cognito",
  "Email thuộc fpt.edu.vn, fe.edu.vn hoặc danh sách ngoại lệ",
  "Hỗ trợ PDF, DOCX, PPTX tối đa 50 MB mỗi file",
  "Quota mặc định 500 MB mỗi người dùng",
  "Chat AI tối đa 50 lượt mỗi ngày",
  "Tài liệu private mặc định; public cần gắn môn học",
] as const;

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
          <p className="text-sm text-brutal-muted">Bạn đã đăng nhập và sẵn sàng vào Drive.</p>
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
        <h2 className="font-heading text-2xl font-extrabold">Vào APMS</h2>
        <p className="text-sm text-brutal-muted">
          Dùng tài khoản Google được phép để tiếp tục quản lý tài liệu học tập.
        </p>
      </div>
      <GoogleSignInButton onClick={onGoogleSignIn} loading={isLoading} />
      <p className="text-center text-xs text-brutal-muted">
        Hệ thống xác thực qua Amazon Cognito và kiểm tra domain/email được phép.
      </p>
    </>
  );
}

function ProductPreview() {
  return (
    <BrutalCard id="overview" hover className="scroll-mt-28 p-0">
      <div className="border-b-2 border-brutal-ink bg-brutal-secondary px-5 py-4 text-brutal-on-brand sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide opacity-90">Product preview</p>
            <h2 className="font-heading text-2xl font-extrabold">Một workspace cho tài liệu và AI</h2>
          </div>
          <span className="rounded-full border-2 border-brutal-ink bg-brutal-surface px-3 py-1 text-xs font-bold text-brutal-ink">
            Documents + Chat
          </span>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4 border-b-2 border-brutal-ink p-5 sm:p-6 lg:border-b-0 lg:border-r-2">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-brutal-secondary" aria-hidden="true" />
            <h3 className="font-heading text-xl font-extrabold">Drive theo môn học</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["WDP301", "8 tài liệu", "PDF, slide, báo cáo"],
              ["PRN212", "5 tài liệu", "Bài giảng và lab"],
              ["CCM301", "3 tài liệu", "DOCX case study"],
              ["Shared", "Read-only", "Tài liệu được chia sẻ"],
            ].map(([title, meta, detail]) => (
              <div
                key={title}
                className="rounded-lg border-2 border-brutal-ink bg-brutal-bg p-4 shadow-[2px_2px_0_0_#1A1A1A]"
              >
                <p className="font-heading text-lg font-extrabold">{title}</p>
                <p className="text-sm font-bold text-brutal-secondary">{meta}</p>
                <p className="mt-2 text-xs text-brutal-muted">{detail}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border-2 border-brutal-ink bg-brutal-surface p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-1 h-5 w-5 shrink-0 text-brutal-primary" aria-hidden="true" />
              <div>
                <p className="font-bold">Slot4,5_Bootstrap.pptx</p>
                <p className="text-sm text-brutal-muted">
                  Ready · 55 slides · gắn với môn WDP301 · có thể dùng cho Search/Chat
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-brutal-primary" aria-hidden="true" />
            <h3 className="font-heading text-xl font-extrabold">Chat có citation mở nguồn</h3>
          </div>
          <div className="space-y-3 rounded-lg border-2 border-brutal-ink bg-brutal-bg p-4">
            <div className="ml-auto max-w-[85%] rounded-lg border-2 border-brutal-ink bg-brutal-primary px-4 py-3 text-sm font-bold text-brutal-on-brand shadow-[2px_2px_0_0_#1A1A1A]">
              data-* là gì trong Bootstrap?
            </div>
            <div className="rounded-lg border-2 border-brutal-ink bg-brutal-surface px-4 py-3 text-sm leading-relaxed">
              `data-*` cho phép dùng JavaScript components của Bootstrap mà không cần viết
              JavaScript thủ công{" "}
              <span className="rounded border border-brutal-ink bg-brutal-accent px-1 font-bold text-brutal-on-brand">
                [1]
              </span>
              .
            </div>
          </div>
          <div className="rounded-lg border-2 border-brutal-ink bg-brutal-surface p-4 shadow-[2px_2px_0_0_#1A1A1A]">
            <p className="text-xs font-bold uppercase text-brutal-muted">Nguồn trích dẫn</p>
            <p className="mt-1 font-heading text-lg font-extrabold">Slide 35 — Bootstrap</p>
            <p className="mt-2 text-sm text-brutal-muted">
              Mở tài liệu từ citation để về đúng slide/trang khi metadata khả dụng.
            </p>
          </div>
        </div>
      </div>
    </BrutalCard>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  tone,
}: (typeof featureCards)[number]) {
  const toneClass = {
    primary: "bg-brutal-primary text-brutal-on-brand",
    secondary: "bg-brutal-secondary text-brutal-on-brand",
    accent: "bg-brutal-accent text-brutal-on-brand",
    surface: "bg-brutal-surface text-brutal-ink",
  }[tone];

  return (
    <article className={cn("brutal-card brutal-card-hover flex h-full flex-col gap-4 p-5", toneClass)}>
      <Icon className="h-6 w-6" aria-hidden="true" />
      <div className="space-y-2">
        <h3 className="font-heading text-xl font-extrabold">{title}</h3>
        <p className={cn("text-sm leading-relaxed", tone === "surface" ? "text-brutal-muted" : "opacity-95")}>
          {description}
        </p>
      </div>
    </article>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { user, isLoading: isAuthLoading, error: authError, fetchMe, clearUser } = useAuthStore();

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
          className="scroll-mt-28 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12"
        >
          <div className="space-y-6 text-center lg:text-left">
            <span className="brutal-badge mx-auto lg:mx-0">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              Academic Personal Management System
            </span>
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                APMS — trung tâm tài liệu học tập cá nhân
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-brutal-muted lg:mx-0">
                Gom tài liệu theo môn học, tìm kiếm bằng ngữ nghĩa và hỏi AI dựa trên
                chính nguồn bạn được phép xem, kèm citation mở về tài liệu gốc.
              </p>
            </div>
            <div className="mx-auto grid max-w-2xl gap-3 text-left sm:grid-cols-3 lg:mx-0">
              {heroFacts.map((fact) => (
                <div
                  key={fact}
                  className="rounded-lg border-2 border-brutal-ink bg-brutal-surface p-3 text-sm font-bold shadow-[2px_2px_0_0_#1A1A1A]"
                >
                  <CheckCircle2 className="mb-2 h-5 w-5 text-brutal-accent" aria-hidden="true" />
                  {fact}
                </div>
              ))}
            </div>
          </div>

          <section className="mx-auto w-full max-w-md">
            <BrutalCard hover>
              <div className="space-y-6">
                {!isAuthLoading && !user && authError && <ErrorAlert message={authError} />}
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

        <ProductPreview />

        <section id="workflow" className="scroll-mt-28 space-y-6">
          <div className="max-w-3xl space-y-2">
            <h2 className="font-heading text-3xl font-extrabold sm:text-4xl">
              Luồng học tập có căn cứ
            </h2>
            <p className="text-brutal-muted">
              APMS không thay tài liệu bằng câu trả lời AI. Hệ thống giữ nguồn gốc tài liệu ở trung tâm,
              rồi dùng search và RAG để giúp sinh viên quay lại đúng đoạn cần học.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {workflowSteps.map((step, index) => (
              <article key={step.title} className="brutal-card brutal-card-hover p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <step.icon className="h-6 w-6 text-brutal-secondary" aria-hidden="true" />
                  <span className="rounded-full border-2 border-brutal-ink bg-brutal-primary px-2 py-0.5 text-xs font-extrabold text-brutal-on-brand">
                    {index + 1}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-extrabold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brutal-muted">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="scroll-mt-28 space-y-6">
          <div className="max-w-3xl space-y-2">
            <h2 className="font-heading text-3xl font-extrabold sm:text-4xl">
              Tính năng đúng với hệ thống
            </h2>
            <p className="text-brutal-muted">
              Các điểm dưới đây là capability hiện có trong SRS và source code, không dùng metric hay testimonial giả.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section id="rules" className="scroll-mt-28">
          <BrutalCard hover className="bg-brutal-surface">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3">
                <span className="brutal-badge">
                  <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                  Quy tắc rõ ràng
                </span>
                <h2 className="font-heading text-3xl font-extrabold sm:text-4xl">
                  Được thiết kế cho tài liệu học tập có quyền truy cập
                </h2>
                <p className="text-brutal-muted">
                  Landing page chỉ nói những gì hệ thống đang hỗ trợ: loại file, quota, quyền đọc,
                  public/private và giới hạn chat.
                </p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {ruleItems.map((rule) => (
                  <li
                    key={rule}
                    className="flex items-start gap-3 rounded-lg border-2 border-brutal-ink bg-brutal-bg p-3 text-sm font-bold"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brutal-accent" aria-hidden="true" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </BrutalCard>
        </section>

        {showEnrollmentCta && (
          <BrutalCard hover className="bg-brutal-primary p-6 text-brutal-on-brand sm:p-8">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
              <div className="space-y-2">
                <h2 className="font-heading text-3xl font-extrabold sm:text-4xl">
                  Bắt đầu từ tài liệu bạn đang học
                </h2>
                <p className="text-sm opacity-95">
                  Đăng nhập bằng Google để vào Drive, chọn hồ sơ học vụ và tải tài liệu theo môn.
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
