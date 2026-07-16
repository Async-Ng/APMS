"use client";

import "@/lib/amplify";
import { signInWithRedirect, signOut } from "aws-amplify/auth";
import {
  BookOpen,
  Bot,
  CheckCircle2,
  Clock3,
  FileSearch,
  FileText,
  FolderTree,
  GraduationCap,
  Library,
  LockKeyhole,
  MessageSquareQuote,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  UploadCloud,
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

const heroBenefits = [
  "Tài liệu được xếp theo môn học",
  "Tìm lại đúng phần cần ôn",
  "Hỏi AI và mở lại nguồn gốc",
] as const;

const quickActions: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "primary" | "secondary" | "accent" | "surface";
}> = [
  {
    icon: UploadCloud,
    title: "Tải tài liệu lên",
    description: "Thêm PDF, DOCX hoặc PPTX vào đúng môn học đang theo học.",
    tone: "secondary",
  },
  {
    icon: Search,
    title: "Tìm trong nội dung",
    description: "Gõ điều bạn nhớ, APMS giúp tìm lại tài liệu liên quan.",
    tone: "accent",
  },
  {
    icon: Bot,
    title: "Hỏi trợ lý AI",
    description: "Nhận câu trả lời dựa trên tài liệu bạn có quyền xem.",
    tone: "primary",
  },
  {
    icon: Share2,
    title: "Chia sẻ chỉ đọc",
    description: "Gửi tài liệu hoặc thư mục cho bạn học mà không lo bị sửa nhầm.",
    tone: "surface",
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
    title: "Drive học tập cá nhân",
    description: "Gom slide, bài tập, báo cáo và tài liệu tham khảo vào một nơi dễ nhìn.",
    tone: "secondary",
  },
  {
    icon: BookOpen,
    title: "Sắp xếp theo môn",
    description: "Mỗi tài liệu gắn với môn học để bạn không phải tự nhớ file nằm ở đâu.",
    tone: "surface",
  },
  {
    icon: FileSearch,
    title: "Tìm đúng ý cần học",
    description: "Tìm theo nội dung và ngữ cảnh, không chỉ theo tên file.",
    tone: "accent",
  },
  {
    icon: MessageSquareQuote,
    title: "Câu trả lời có nguồn",
    description: "Khi hỏi AI, bạn có thể quay lại tài liệu gốc để kiểm tra và học tiếp.",
    tone: "primary",
  },
  {
    icon: Library,
    title: "Khám phá tài liệu công khai",
    description: "Xem tài liệu public theo chương trình, học kỳ và môn học phù hợp.",
    tone: "surface",
  },
  {
    icon: Star,
    title: "Giữ lại phần quan trọng",
    description: "Gắn sao tài liệu hay dùng để mở lại nhanh trước buổi học hoặc deadline.",
    tone: "surface",
  },
];

const studyDaySteps: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: UploadCloud,
    title: "Sau buổi học",
    description: "Tải slide, đề lab hoặc ghi chú lên APMS và chọn đúng môn.",
  },
  {
    icon: FolderTree,
    title: "Khi cần ôn",
    description: "Mở môn học, xem lại tài liệu đã lưu hoặc tài liệu bạn bè chia sẻ.",
  },
  {
    icon: Search,
    title: "Khi quên chi tiết",
    description: "Tìm bằng câu hỏi tự nhiên như: phần Bootstrap data attribute ở đâu?",
  },
  {
    icon: Sparkles,
    title: "Trước deadline",
    description: "Hỏi AI để tóm ý, rồi mở nguồn gốc để kiểm tra trước khi dùng.",
  },
];

const trustItems = [
  "Tài liệu mới tải lên mặc định là riêng tư.",
  "Chỉ công khai tài liệu khi tài liệu đã gắn với môn học.",
  "Chia sẻ tài liệu hoặc thư mục ở mức chỉ đọc.",
  "Hỗ trợ PDF, DOCX, PPTX tối đa 50 MB mỗi tệp.",
  "Mỗi người dùng có 500 MB dung lượng mặc định.",
  "Trợ lý AI giới hạn 50 lượt hỏi mỗi ngày để dùng công bằng.",
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
    return <p className="text-center text-sm text-brutal-muted">Đang chuẩn bị không gian học tập...</p>;
  }

  if (user) {
    return (
      <div className="space-y-4 text-center">
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-extrabold">Chào mừng trở lại</h2>
          <p className="text-sm text-brutal-muted">Tài liệu của bạn đã sẵn sàng trong Drive.</p>
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
        <h2 className="font-heading text-2xl font-extrabold">Bắt đầu học gọn hơn</h2>
        <p className="text-sm text-brutal-muted">
          Đăng nhập bằng Google để lưu tài liệu, tìm lại nội dung và hỏi AI từ nguồn của bạn.
        </p>
      </div>
      <GoogleSignInButton onClick={onGoogleSignIn} loading={isLoading} />
      <p className="text-center text-xs leading-relaxed text-brutal-muted">
        Dùng tài khoản thuộc domain được phép hoặc email đã được duyệt truy cập.
      </p>
    </>
  );
}

function StudentWorkspacePreview() {
  return (
    <BrutalCard id="overview" hover className="scroll-mt-28 overflow-hidden p-0">
      <div className="border-b-2 border-brutal-ink bg-brutal-secondary px-5 py-4 text-brutal-on-brand sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase opacity-90">Góc học tập của bạn</p>
            <h2 className="font-heading text-2xl font-extrabold text-brutal-on-brand">
              Tài liệu, tìm kiếm và AI trong cùng một nơi
            </h2>
          </div>
          <span className="rounded-full border-2 border-brutal-ink bg-brutal-surface px-3 py-1 text-xs font-bold text-brutal-ink">
            Drive + AI
          </span>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4 border-b-2 border-brutal-ink p-5 sm:p-6 lg:border-b-0 lg:border-r-2">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-brutal-secondary" aria-hidden="true" />
            <h3 className="font-heading text-xl font-extrabold">Môn học trong kỳ</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["WDP301", "8 tài liệu", "Slide, lab, báo cáo"],
              ["PRN212", "5 tài liệu", "Bài giảng và bài tập"],
              ["CCM301", "3 tài liệu", "Case study DOCX"],
              ["Được chia sẻ", "Chỉ đọc", "Tài liệu từ bạn học"],
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
                <p className="font-bold">Slot4_Responsive_UI.pptx</p>
                <p className="text-sm text-brutal-muted">
                  WDP301 · sẵn sàng để tìm kiếm · chỉ mình bạn xem
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-brutal-primary" aria-hidden="true" />
            <h3 className="font-heading text-xl font-extrabold">Hỏi và kiểm tra lại nguồn</h3>
          </div>
          <div className="space-y-3 rounded-lg border-2 border-brutal-ink bg-brutal-bg p-4">
            <div className="ml-auto max-w-[85%] rounded-lg border-2 border-brutal-ink bg-brutal-primary px-4 py-3 text-sm font-bold text-brutal-on-brand shadow-[2px_2px_0_0_#1A1A1A]">
              Nhắc lại ý chính phần responsive UI?
            </div>
            <div className="rounded-lg border-2 border-brutal-ink bg-brutal-surface px-4 py-3 text-sm leading-relaxed">
              Responsive UI giúp giao diện tự thích nghi với màn hình điện thoại, tablet và laptop. Mở nguồn{" "}
              <span className="rounded border border-brutal-ink bg-brutal-accent px-1 font-bold text-brutal-on-brand">
                [1]
              </span>{" "}
              để xem lại slide liên quan.
            </div>
          </div>
          <div className="rounded-lg border-2 border-brutal-ink bg-brutal-surface p-4 shadow-[2px_2px_0_0_#1A1A1A]">
            <p className="text-xs font-bold uppercase text-brutal-muted">Nguồn gốc</p>
            <p className="mt-1 font-heading text-lg font-extrabold">Slide 12 - Responsive Layout</p>
            <p className="mt-2 text-sm text-brutal-muted">
              Câu trả lời luôn đi kèm đường quay lại tài liệu để bạn tự kiểm chứng.
            </p>
          </div>
        </div>
      </div>
    </BrutalCard>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "primary" | "secondary" | "accent" | "surface";
}) {
  const toneClass = {
    primary: "bg-brutal-primary text-brutal-on-brand",
    secondary: "bg-brutal-secondary text-brutal-on-brand",
    accent: "bg-brutal-accent text-brutal-on-brand",
    surface: "bg-brutal-surface text-brutal-ink",
  }[tone];

  return (
    <article className={cn("brutal-card brutal-card-hover flex h-full flex-col gap-4 p-5", toneClass)}>
      <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
      <div className="space-y-2">
        <h3 className={cn("font-heading text-xl font-extrabold", tone !== "surface" && "text-brutal-on-brand")}>
          {title}
        </h3>
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
          className="scroll-mt-28 grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12"
        >
          <div className="space-y-6 text-center lg:text-left">
            <span className="brutal-badge mx-auto lg:mx-0">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              Dành cho sinh viên FPT
            </span>
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                APMS - học liệu gọn hơn, ôn bài nhanh hơn
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-brutal-muted lg:mx-0">
                Lưu tài liệu theo môn, tìm lại đúng phần cần học và hỏi AI từ chính nguồn bạn được phép xem.
                Mọi thứ nằm trong một workspace riêng cho việc học.
              </p>
            </div>
            <div className="mx-auto grid max-w-2xl gap-3 text-left sm:grid-cols-3 lg:mx-0">
              {heroBenefits.map((benefit) => (
                <div
                  key={benefit}
                  className="rounded-lg border-2 border-brutal-ink bg-brutal-surface p-3 text-sm font-bold shadow-[2px_2px_0_0_#1A1A1A]"
                >
                  <CheckCircle2 className="mb-2 h-5 w-5 text-brutal-accent" aria-hidden="true" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          <section className="mx-auto w-full max-w-md" aria-label="Đăng nhập APMS">
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

        <StudentWorkspacePreview />

        <section id="workflow" className="scroll-mt-28 space-y-6">
          <div className="max-w-3xl space-y-2">
            <h2 className="font-heading text-3xl font-extrabold sm:text-4xl">
              Một ngày học với APMS
            </h2>
            <p className="text-brutal-muted">
              Từ lúc nhận slide đến lúc ôn deadline, APMS giúp bạn giữ tài liệu đúng chỗ và mở lại nguồn khi cần.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {studyDaySteps.map((step, index) => (
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
              Bạn có thể làm gì với APMS?
            </h2>
            <p className="text-brutal-muted">
              Các tính năng tập trung vào việc học hằng ngày: lưu, tìm, hỏi, kiểm tra nguồn và chia sẻ an toàn.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <ActionCard key={action.title} {...action} />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <ActionCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section id="rules" className="scroll-mt-28">
          <BrutalCard hover className="bg-brutal-surface">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3">
                <span className="brutal-badge">
                  <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                  Quyền riêng tư rõ ràng
                </span>
                <h2 className="font-heading text-3xl font-extrabold sm:text-4xl">
                  Bạn kiểm soát tài liệu học tập của mình
                </h2>
                <p className="text-brutal-muted">
                  APMS ưu tiên tài liệu riêng tư, quyền xem rõ ràng và giới hạn sử dụng minh bạch để việc học an tâm hơn.
                </p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {trustItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-lg border-2 border-brutal-ink bg-brutal-bg p-3 text-sm font-bold"
                  >
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brutal-accent" aria-hidden="true" />
                    <span>{item}</span>
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
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-brutal-ink bg-brutal-surface text-brutal-primary shadow-[2px_2px_0_0_#1A1A1A]">
                  <Clock3 className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 className="font-heading text-3xl font-extrabold text-brutal-on-brand sm:text-4xl">
                  Bắt đầu từ tài liệu bạn đang học
                </h2>
                <p className="text-sm opacity-95">
                  Đăng nhập bằng Google, chọn hồ sơ học tập và đưa tài liệu theo môn vào Drive của bạn.
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
