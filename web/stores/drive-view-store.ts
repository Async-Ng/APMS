import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DriveViewSemesterId = string | "all";

interface DriveViewState {
  driveViewSemesterId: DriveViewSemesterId | null;
  setDriveViewSemesterId: (id: DriveViewSemesterId) => void;
  resetDriveViewSemesterId: () => void;
}

export const useDriveViewStore = create<DriveViewState>()(
  persist(
    (set) => ({
      driveViewSemesterId: null,
      setDriveViewSemesterId: (id) => set({ driveViewSemesterId: id }),
      resetDriveViewSemesterId: () => set({ driveViewSemesterId: null }),
    }),
    { name: "apms-drive-view-semester" },
  ),
);
