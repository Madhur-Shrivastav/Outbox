import { Router } from "express";
import multer from "multer";
import fs from "fs";
import { parse } from "csv-parse/sync";
import {
  requireAuth,
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

router.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "CSV file is required",
        });
      }

      const filePath = req.file.path;

      const csvContent = fs.readFileSync(filePath, "utf-8");

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];

      fs.unlinkSync(filePath);

      if (!records.length) {
        return res.status(400).json({
          message: "CSV file contains no leads",
        });
      }

      // Accept common column names.
      const leads = records
        .map((row: Record<string, string>) => ({
          email:
            row.email ||
            row.Email ||
            row.EMAIL ||
            row["email address"] ||
            row["Email Address"],
          name: row.name || row.Name || row.NAME || "",
        }))
        .filter((lead: { email?: string }) => lead.email);

      return res.json({
        message: "CSV uploaded successfully",
        detectedCount: leads.length,
        leads,
      });
    } catch (error) {
      console.error("CSV upload failed:", error);

      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(400).json({
        message: "Invalid CSV file",
      });
    }
  },
);

export default router;
