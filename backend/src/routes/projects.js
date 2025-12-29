import express from "express";
import { db } from "../db.js";

const router = express.Router();

/**
 * Create project
 */
router.post("/", (req, res) => {
  const { name, data } = req.body;

  if (!data) {
    return res.status(400).json({ error: "Missing project data" });
  }

  db.run(
    `INSERT INTO projects (name, data) VALUES (?, ?)`,
    [name || "Untitled Project", JSON.stringify(data)],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    }
  );
});

/**
 * List projects
 */
router.get("/", (req, res) => {
  db.all(
    `SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

/**
 * Get project by id
 */
router.get("/:id", (req, res) => {
  db.get(
    `SELECT * FROM projects WHERE id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json({
        id: row.id,
        name: row.name,
        data: JSON.parse(row.data),
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    }
  );
});

/**
 * Update project
 */
router.put("/:id", (req, res) => {
  const { data, name } = req.body;

  db.run(
    `
    UPDATE projects
    SET data = ?, name = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [JSON.stringify(data), name, req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ updated: this.changes });
    }
  );
});

/**
 * Delete project
 */
router.delete("/:id", (req, res) => {
  db.run(
    `DELETE FROM projects WHERE id = ?`,
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ deleted: this.changes });
    }
  );
});

export default router;
