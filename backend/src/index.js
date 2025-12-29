import express from "express";
import cors from "cors";
import projectsRouter from "./routes/projects.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/projects", projectsRouter);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
