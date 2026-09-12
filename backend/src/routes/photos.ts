import { Router } from "express";
import { z } from "zod";
import { PhotoCategory } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth, MANAGER_ROLES } from "../middleware/auth";
import { upload, uploadedFileUrl } from "../middleware/upload";

export const photosRouter = Router();
photosRouter.use(requireAuth);

photosRouter.get("/", async (req, res) => {
  const isManager = MANAGER_ROLES.includes(req.auth!.role);
  const { jobId, category } = req.query as Record<string, string | undefined>;

  const photos = await prisma.photo.findMany({
    where: {
      jobId: jobId || undefined,
      category: (category as PhotoCategory) || undefined,
      // Field roles only see photos for jobs they're assigned to.
      job: isManager ? undefined : { assignments: { some: { userId: req.auth!.userId } } },
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { takenAt: "desc" },
  });
  res.json(photos);
});

const createPhotoSchema = z.object({
  jobId: z.string().uuid(),
  clientEntryId: z.string().min(1),
  category: z.nativeEnum(PhotoCategory).optional(),
  caption: z.string().optional(),
  takenAt: z.string().datetime(),
});

photosRouter.post("/", upload.single("photo"), async (req, res) => {
  const parsed = createPhotoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  if (!req.file) {
    return res.status(400).json({ error: "photo file is required" });
  }
  const { jobId, clientEntryId, category, caption, takenAt } = parsed.data;

  const photo = await prisma.photo.upsert({
    where: { clientEntryId },
    create: {
      jobId,
      userId: req.auth!.userId,
      clientEntryId,
      category,
      caption,
      takenAt: new Date(takenAt),
      url: uploadedFileUrl(req.file.filename),
    },
    update: {},
  });
  res.status(201).json(photo);
});
