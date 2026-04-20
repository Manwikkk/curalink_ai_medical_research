import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  upload,
  uploadReport,
  getReportStatus,
  listReports,
  deleteReport,
} from "../controllers/reportController.js";

const router = Router();

router.use(requireAuth);

router.post("/", upload.single("report"), uploadReport);
router.get("/", listReports);
router.get("/:reportId", getReportStatus);
router.delete("/:reportId", deleteReport);

export default router;
