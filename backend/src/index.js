import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import publicRoutes from "./routes/public.routes.js";
import studentDashboardRoutes from "./routes/student_dashboard.routes.js";
import mentorDashboardRoutes from "./routes/mentor_dashboard.routes.js";
import cronRoutes from "./routes/cron.routes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/public", publicRoutes);
app.use("/student/dashboard", studentDashboardRoutes);
app.use("/mentor/dashboard", mentorDashboardRoutes);
app.use("/cron", cronRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Kalvium Portfolio Management API is running",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
});

app.use((error, req, res, next) => {
  console.error("[GLOBAL ERROR]", error);

  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});