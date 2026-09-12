import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";

export const weatherRouter = Router();
weatherRouter.use(requireAuth);

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

// Forecast for the job site, used to flag likely rain-out days.
// Cached per job since a free-tier weather API key has tight rate limits.
weatherRouter.get("/:jobId", async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.lat == null || job.lng == null) {
    return res.status(400).json({ error: "Job has no site location set" });
  }

  const cached = await prisma.weatherCache.findUnique({ where: { jobId: job.id } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return res.json({ jobId: job.id, fetchedAt: cached.fetchedAt, forecast: cached.forecastJson });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    if (cached) {
      return res.json({ jobId: job.id, fetchedAt: cached.fetchedAt, forecast: cached.forecastJson, stale: true });
    }
    return res.status(503).json({ error: "Weather integration not configured (OPENWEATHER_API_KEY missing)" });
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${job.lat}&lon=${job.lng}&units=metric&appid=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    if (cached) {
      return res.json({ jobId: job.id, fetchedAt: cached.fetchedAt, forecast: cached.forecastJson, stale: true });
    }
    return res.status(502).json({ error: "Failed to fetch weather forecast" });
  }
  const forecastJson = (await response.json()) as Prisma.InputJsonValue;

  const updated = await prisma.weatherCache.upsert({
    where: { jobId: job.id },
    create: { jobId: job.id, forecastJson },
    update: { forecastJson, fetchedAt: new Date() },
  });

  res.json({ jobId: job.id, fetchedAt: updated.fetchedAt, forecast: forecastJson });
});
