import type { Request, Response } from "express";

export async function getHealth(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    status: "success",
    data: {
      service: "apms-api",
      uptime: process.uptime(),
    },
  });
}
