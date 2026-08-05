import express from "express";
import rateLimit from "express-rate-limit";
import { createAuthedSupabaseClient, supabase } from "../config/supabase.js";

const router = express.Router();

const saveSquadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Too many requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized: Missing token" });
        }

        const token = authHeader.split(" ")[1];

        // Verify token using imported supabase client
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: "Unauthorized: Invalid token" });
        }

        req.user = user;
        // Attach authed client so queries run with the user's RLS context
        req.authedSupabase = createAuthedSupabaseClient(token);
        next();
    } catch (err) {
        return res.status(401).json({ error: "Authentication failed" });
    }
};


router.get("/getsquads", requireAuth, async (req, res) => {
    try {
        const mentorUserId = req.user.id;
        const db = req.authedSupabase;

        const { data, error } = await db
            .from("mentor_squads")
            .select("squad_id")
            .eq("mentor_user_id", mentorUserId);

        if (error) {
            console.error("Fetch Squads Error:", error);
            return res.status(400).json({ error: error.message });
        }

        // Transform array of objects [{ squad_id: "squad_1" }, ...] into simple string array ["squad_1", ...]
        const squads = data ? data.map((item) => item.squad_id) : [];

        return res.status(200).json({
            success: true,
            squads,
        });
    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/savesquad",
    saveSquadLimiter,
    requireAuth,
    async (req, res) => {
        try {
            const mentorUserId = req.user.id;
            const { squads } = req.body;

            if (!squads) {
                return res.status(400).json({ error: "Squads field is required" });
            }

            // Normalize squads payload into an array
            const squadList = Array.isArray(squads) ? squads : [squads];

            // Use the authenticated client instance
            const db = req.authedSupabase;

            // 1. Clear previous squad assignments for this mentor
            const { error: deleteError } = await db
                .from("mentor_squads")
                .delete()
                .eq("mentor_user_id", mentorUserId);

            if (deleteError) {
                console.error("Delete Error:", deleteError);
                return res.status(400).json({ error: deleteError.message });
            }

            // 2. Insert new squad assignments
            if (squadList.length > 0) {
                const recordsToInsert = squadList.map((squadId) => ({
                    mentor_user_id: mentorUserId,
                    squad_id: String(squadId),
                }));

                const { data, error: insertError } = await db
                    .from("mentor_squads")
                    .insert(recordsToInsert)
                    .select();

                if (insertError) {
                    console.error("Insert Error:", insertError);
                    return res.status(400).json({ error: insertError.message });
                }

                return res.status(200).json({
                    success: true,
                    message: "Squads saved successfully",
                    data,
                });
            }

            return res.status(200).json({
                success: true,
                message: "All squad assignments cleared",
                data: [],
            });
        } catch (error) {
            console.error("Server Error:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);


router.get("/students", requireAuth, async (req, res) => {
    try {
        const mentorUserId = req.user.id;
        const db = req.authedSupabase;
        const requestedSquadId = req.query.squad_id;

        // 1. Get squads assigned to this mentor
        const { data: mentorSquads, error: squadError } = await db
            .from("mentor_squads")
            .select("squad_id")
            .eq("mentor_user_id", mentorUserId);

        if (squadError) {
            console.error("Fetch Mentor Squads Error:", squadError);
            return res.status(400).json({ error: squadError.message });
        }

        const assignedSquadIds = mentorSquads ? mentorSquads.map((s) => String(s.squad_id)) : [];

        // If the mentor has no assigned squads, return an empty list immediately
        if (assignedSquadIds.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                students: [],
            });
        }

        // 2. Build query to fetch students
        let query = db.from("profiles").select("*");

        if (requestedSquadId) {
            const requestedStr = String(requestedSquadId);
            // Verify mentor has permission to view the requested squad
            if (!assignedSquadIds.includes(requestedStr)) {
                return res.status(403).json({
                    error: "Forbidden: You are not assigned to this squad",
                });
            }
            query = query.eq("squad_id", requestedStr);
        } else {
            // Fetch students matching any of the mentor's assigned squad IDs
            query = query.in("squad_id", assignedSquadIds);
        }

        const { data: students, error: studentError } = await query;

        if (studentError) {
            console.error("Fetch Students Error:", studentError);
            return res.status(400).json({ error: studentError.message });
        }

        return res.status(200).json({
            success: true,
            count: students ? students.length : 0,
            students: students || [],
        });
    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;