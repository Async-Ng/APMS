"use client";

import { redirect } from "next/navigation";

import { CurriculumDetailPanel } from "@/components/app/admin/CurriculumDetailPanel";
import { useAuthStore } from "@/stores/auth-store";

interface PageProps {
  params: { curriculumId: string };
}

export default function CurriculumDetailPage({ params }: PageProps) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (!isLoading && user && user.role !== "admin") {
    redirect("/drive");
  }

  return (
    <>
      <main className="admin-density flex-1" id="main-content">
        <CurriculumDetailPanel curriculumId={params.curriculumId} />
      </main>
    </>
  );
}

