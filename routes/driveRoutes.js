import express from "express";
import { readDriveLinks } from "../utils/readLinks.js";

const router = express.Router();

router.get("/read-drive-links", async (_req, res) => {
  try {
    const links = await readDriveLinks("data/drive_links.txt");
    res.json({ count: links.length, links });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

