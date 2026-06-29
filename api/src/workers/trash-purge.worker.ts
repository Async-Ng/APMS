import { loadEnv } from "../config/env";
import { purgeExpiredTrash } from "../services/trash-purge.service";

let running = false;

async function runOnce(): Promise<void> {
  const { documents, folders } = await purgeExpiredTrash();

  if (documents > 0 || folders > 0) {
    console.log(
      `[trash-purge] Permanently deleted ${documents} document(s) and ${folders} folder(s) past retention`,
    );
  }
}

async function loop(intervalMs: number): Promise<void> {
  while (running) {
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));

    if (!running) return;

    try {
      await runOnce();
    } catch (error) {
      console.error("[trash-purge] Unexpected error in purge loop:", error);
    }
  }
}

export function startTrashPurgeWorker(): void {
  if (running) return;
  running = true;

  const intervalMs = loadEnv().TRASH_PURGE_INTERVAL_MS;
  console.log(`[trash-purge] Trash purge worker started (interval: ${intervalMs}ms)`);

  void runOnce().catch((error) => {
    console.error("[trash-purge] Unexpected error on initial run:", error);
  });
  void loop(intervalMs);
}

export function stopTrashPurgeWorker(): void {
  running = false;
}
