import express from "express";
import rateLimit from "express-rate-limit";
import { supabase } from "../config/supabase.js";

const router = express.Router();

// ============================================================
// RATE LIMITERS
// ============================================================

const allProfilesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error:
            "Too many directory requests, please try again in 15 minutes.",
    },
});

const singleStudentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error:
            "Too many profile requests, please try again in 15 minutes.",
    },
});

const statsRouteLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many stats requests. Please try again later.",
    },
});

const updateProfileLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error:
            "Too many profile update requests. Please try again later.",
    },
});

// ============================================================
// VALIDATION HELPERS
// ============================================================

const isValidGitHubUsername = (username) => {
    return /^[a-zA-Z0-9-]{1,39}$/.test(username);
};

const isValidLeetCodeUsername = (username) => {
    return /^[a-zA-Z0-9_-]{1,30}$/.test(username);
};

// ============================================================
// EXTRACT USERNAME FROM URL OR USERNAME
// ============================================================

const extractUsername = (input, platform) => {
    if (!input || typeof input !== "string") {
        return null;
    }

    const cleanInput = input.trim();

    if (!cleanInput) {
        return null;
    }

    try {
        // --------------------------------------------------------
        // GITHUB
        // --------------------------------------------------------

        if (platform === "github") {
            if (!cleanInput.includes("github.com")) {
                return cleanInput.replace(/^@/, "");
            }

            const match = cleanInput.match(
                /github\.com\/([^/?#]+)/
            );

            return match?.[1]?.replace(/\/$/, "") || null;
        }

        // --------------------------------------------------------
        // LEETCODE
        // --------------------------------------------------------

        if (platform === "leetcode") {
            if (!cleanInput.includes("leetcode.com")) {
                return cleanInput.replace(/^@/, "");
            }

            const match = cleanInput.match(
                /leetcode\.com\/(?:u\/)?([^/?#]+)/
            );

            return match?.[1]?.replace(/\/$/, "") || null;
        }
    } catch (error) {
        console.error(
            `Username extraction error (${platform}):`,
            error
        );

        return null;
    }

    return null;
};

// ============================================================
// FORMAT PROFILE WITH LEETCODE ACTIVITY
// ============================================================

const formatProfileWithActivity = (profile) => {
    if (!profile) {
        return profile;
    }

    const lbData = Array.isArray(profile.leetcode_leaderboard)
        ? profile.leetcode_leaderboard[0]
        : profile.leetcode_leaderboard;

    const totalSolved =
        Number(
            lbData?.total_solved ??
            profile.total_solved ??
            0
        ) || 0;

    const hasSolvedProblems = totalSolved > 0;

    const lastSolvedAt = hasSolvedProblems
        ? (
              lbData?.last_solved_at ??
              profile.last_solved_at ??
              null
          )
        : null;

    const rawActive =
        lbData?.is_leetcode_active ??
        profile.is_leetcode_active ??
        false;

    const isRawActive =
        rawActive === true ||
        rawActive === 1 ||
        rawActive === "true" ||
        rawActive === "1";

    let effectiveIsActive = false;

    if (hasSolvedProblems && isRawActive) {
        effectiveIsActive = true;
    } else if (hasSolvedProblems && lastSolvedAt) {
        const solvedDate = new Date(lastSolvedAt);

        if (!Number.isNaN(solvedDate.getTime())) {
            const sevenDaysAgo =
                Date.now() - 7 * 24 * 60 * 60 * 1000;

            effectiveIsActive =
                solvedDate.getTime() >= sevenDaysAgo;
        }
    }

    const {
        leetcode_leaderboard,
        ...rest
    } = profile;

    return {
        ...rest,
        is_leetcode_active: effectiveIsActive,
        last_solved_at: lastSolvedAt,
        total_solved: totalSolved,
    };
};

// ============================================================
// 1. GET ALL PROFILES
//
// GET /profiles
// GET /profiles?user_id=<uuid>
// ============================================================

router.get(
    "/profiles",
    allProfilesLimiter,
    async (req, res) => {
        try {
            const { user_id } = req.query;

            // ----------------------------------------------------
            // SINGLE PROFILE
            // ----------------------------------------------------

            if (user_id) {
                const {
                    data,
                    error,
                } = await supabase
                    .from("profiles")
                    .select(`
                        user_id,
                        name,
                        title,
                        role,
                        avatar_url,
                        github,
                        leetcode,
                        linkedin,
                        leetcode_leaderboard (
                            is_leetcode_active,
                            last_solved_at,
                            total_solved
                        )
                    `)
                    .eq("user_id", user_id)
                    .single();

                if (error) {
                    if (error.code === "PGRST116") {
                        return res.status(404).json({
                            error: "Student not found",
                        });
                    }

                    return res.status(400).json({
                        error: error.message,
                    });
                }

                return res.json(
                    formatProfileWithActivity(data)
                );
            }

            // ----------------------------------------------------
            // ALL PROFILES
            // ----------------------------------------------------

            const {
                data,
                error,
            } = await supabase
                .from("profiles")
                .select(`
                    user_id,
                    name,
                    title,
                    squad_id,
                    avatar_url,
                    github,
                    leetcode,
                    linkedin,
                    leetcode_leaderboard (
                        is_leetcode_active,
                        last_solved_at,
                        total_solved
                    )
                `);

            if (error) {
                return res.status(400).json({
                    error: error.message,
                });
            }

            const formattedData = (data || []).map(
                formatProfileWithActivity
            );

            return res.json(formattedData);
        } catch (err) {
            console.error("Profiles error:", err);

            return res.status(500).json({
                error: "Internal Server Error",
                details: err.message,
            });
        }
    }
);

// ============================================================
// 2. GET FEATURED STUDENTS
//
// GET /profiles/featured
// ============================================================

router.get(
    "/profiles/featured",
    allProfilesLimiter,
    async (req, res) => {
        try {
            const {
                data,
                error,
            } = await supabase
                .from("profiles")
                .select(`
                    user_id,
                    name,
                    title,
                    avatar_url
                `);

            if (error) {
                return res.status(400).json({
                    error: error.message,
                });
            }

            const shuffled = [...(data || [])];

            for (
                let i = shuffled.length - 1;
                i > 0;
                i--
            ) {
                const j = Math.floor(
                    Math.random() * (i + 1)
                );

                [shuffled[i], shuffled[j]] = [
                    shuffled[j],
                    shuffled[i],
                ];
            }

            return res.json(
                shuffled.slice(0, 4)
            );
        } catch (err) {
            console.error(
                "Featured students error:",
                err
            );

            return res.status(500).json({
                error: "Internal Server Error",
                details: err.message,
            });
        }
    }
);

// ============================================================
// 3. GET SINGLE STUDENT PROFILE
//
// GET /profiles/:user_id
// ============================================================

router.get(
    "/profiles/:user_id",
    singleStudentLimiter,
    async (req, res) => {
        try {
            const { user_id } = req.params;

            if (!user_id) {
                return res.status(400).json({
                    error: "user_id is required",
                });
            }

            const {
                data,
                error,
            } = await supabase
                .from("profiles")
                .select(`
                    *,
                    leetcode_leaderboard (
                        is_leetcode_active,
                        last_solved_at,
                        total_solved
                    )
                `)
                .eq("user_id", user_id)
                .single();

            if (error) {
                if (error.code === "PGRST116") {
                    return res.status(404).json({
                        error: "Student not found",
                    });
                }

                return res.status(400).json({
                    error: error.message,
                });
            }

            return res.json(
                formatProfileWithActivity(data)
            );
        } catch (err) {
            console.error(
                "Single profile error:",
                err
            );

            return res.status(500).json({
                error: "Internal Server Error",
                details: err.message,
            });
        }
    }
);

// ============================================================
// 4. UPDATE STUDENT PROFILE
//
// PUT /updateprofile
// ============================================================

router.put(
    "/updateprofile",
    updateProfileLimiter,
    async (req, res) => {
        try {
            const updatePayload = req.body;

            if (
                !updatePayload ||
                typeof updatePayload !== "object" ||
                Object.keys(updatePayload).length === 0
            ) {
                return res.status(400).json({
                    error:
                        "No profile data provided to update.",
                });
            }

            const {
                id,
                auth_id,
                user_id,
                display_id,
                name,
                kalvium_email,
                kalviumEmail,
                squadId,
                personalEmail,
                resumeUrl,
                ...restPayload
            } = updatePayload;

            if (!user_id) {
                return res.status(400).json({
                    error:
                        "user_id is required in the payload to update.",
                });
            }

            const rawSquad =
                squadId !== undefined
                    ? squadId
                    : restPayload.squad_id;

            const parsedSquad =
                rawSquad !== "" &&
                rawSquad !== null &&
                rawSquad !== undefined
                    ? parseInt(rawSquad, 10)
                    : null;

            const cleanPayload = {
                ...restPayload,
                user_id,

                squad_id: Number.isNaN(parsedSquad)
                    ? null
                    : parsedSquad,

                personal_email:
                    personalEmail !== undefined
                        ? personalEmail
                        : restPayload.personal_email ??
                          null,

                resume_url:
                    resumeUrl !== undefined
                        ? resumeUrl
                        : restPayload.resume_url ??
                          null,
            };

            if (name !== undefined) {
                cleanPayload.name = name;
            }

            if (
                kalvium_email !== undefined ||
                kalviumEmail !== undefined
            ) {
                cleanPayload.kalvium_email =
                    kalvium_email ??
                    kalviumEmail ??
                    null;
            }

            let {
                data,
                error: dbError,
            } = await supabase
                .from("profiles")
                .update(cleanPayload)
                .eq("user_id", user_id)
                .select()
                .maybeSingle();

            // ----------------------------------------------------
            // CREATE PROFILE IF IT DOES NOT EXIST
            // ----------------------------------------------------

            if (!data && !dbError) {
                const insertResult =
                    await supabase
                        .from("profiles")
                        .insert([cleanPayload])
                        .select()
                        .single();

                data = insertResult.data;
                dbError = insertResult.error;
            }

            if (dbError) {
                console.error(
                    "Database error:",
                    dbError
                );

                return res.status(500).json({
                    error:
                        dbError.message ||
                        "Failed to save profile.",
                });
            }

            return res.status(200).json({
                message:
                    "Profile saved successfully",
                data,
            });
        } catch (err) {
            console.error(
                "Update profile server error:",
                err
            );

            return res.status(500).json({
                error:
                    "Internal server error",
            });
        }
    }
);

// ============================================================
// 5. GITHUB PROFILE STATS
//
// POST /github
// ============================================================

router.post(
    "/github",
    statsRouteLimiter,
    async (req, res) => {
        const { url } = req.body;

        const username = extractUsername(
            url,
            "github"
        );

        if (
            !username ||
            !isValidGitHubUsername(username)
        ) {
            return res.status(400).json({
                error: "Invalid GitHub URL",
            });
        }

        try {
            const headers = {
                "User-Agent":
                    "Student-Dashboard-App",
                Accept:
                    "application/vnd.github+json",
            };

            const encodedUsername =
                encodeURIComponent(username);

            const [
                userRes,
                reposRes,
            ] = await Promise.all([
                fetch(
                    `https://api.github.com/users/${encodedUsername}`,
                    { headers }
                ),

                fetch(
                    `https://api.github.com/users/${encodedUsername}/repos?sort=pushed&per_page=1`,
                    { headers }
                ),
            ]);

            if (!userRes.ok) {
                return res
                    .status(userRes.status)
                    .json({
                        error:
                            "GitHub user not found or rate limited",
                    });
            }

            const userData =
                await userRes.json();

            const reposData = reposRes.ok
                ? await reposRes.json()
                : [];

            const publicRepos =
                userData.public_repos ?? 0;

            return res.status(200).json({
                repos: publicRepos,
                public_repos: publicRepos,
                followers:
                    userData.followers || 0,

                recentRepo:
                    Array.isArray(reposData) &&
                    reposData.length > 0
                        ? reposData[0].name
                        : "No recent activity",
            });
        } catch (err) {
            console.error(
                "GitHub Fetch Error:",
                err
            );

            return res.status(500).json({
                error:
                    "Failed to fetch GitHub data",
            });
        }
    }
);

// ============================================================
// 6. LEETCODE PROFILE STATS
//
// POST /leetcode
// ============================================================

router.post(
    "/leetcode",
    statsRouteLimiter,
    async (req, res) => {
        const { url } = req.body;

        const username = extractUsername(
            url,
            "leetcode"
        );

        if (
            !username ||
            !isValidLeetCodeUsername(username)
        ) {
            return res.status(400).json({
                error:
                    "Invalid LeetCode URL or username",
            });
        }

        try {
            const query = `
                query getUserStats($username: String!) {
                    matchedUser(username: $username) {
                        username

                        submitStatsGlobal {
                            acSubmissionNum {
                                difficulty
                                count
                            }
                        }

                        profile {
                            ranking
                            reputation
                        }
                    }

                    recentSubmissionList(
                        username: $username
                        limit: 3
                    ) {
                        title
                        timestamp
                        statusDisplay
                    }
                }
            `;

            const response = await fetch(
                "https://leetcode.com/graphql",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Referer:
                            "https://leetcode.com/",

                        "User-Agent":
                            "Mozilla/5.0",
                    },

                    body: JSON.stringify({
                        query,
                        variables: {
                            username,
                        },
                    }),
                }
            );

            if (!response.ok) {
                return res.status(502).json({
                    error:
                        "Failed to reach official LeetCode service",
                });
            }

            const result =
                await response.json();

            if (
                result.errors &&
                result.errors.length > 0
            ) {
                console.error(
                    "LeetCode GraphQL errors:",
                    result.errors
                );

                return res.status(502).json({
                    error:
                        "LeetCode returned a GraphQL error",
                });
            }

            if (
                !result.data ||
                !result.data.matchedUser
            ) {
                return res.status(404).json({
                    error:
                        "LeetCode profile not found for this username",
                });
            }

            const user =
                result.data.matchedUser;

            const submitStats =
                user.submitStatsGlobal
                    ?.acSubmissionNum || [];

            const totalSolved =
                submitStats.find(
                    (s) =>
                        s.difficulty === "All"
                )?.count || 0;

            const easySolved =
                submitStats.find(
                    (s) =>
                        s.difficulty === "Easy"
                )?.count || 0;

            const mediumSolved =
                submitStats.find(
                    (s) =>
                        s.difficulty === "Medium"
                )?.count || 0;

            const hardSolved =
                submitStats.find(
                    (s) =>
                        s.difficulty === "Hard"
                )?.count || 0;

            const recentSubmissionsRaw =
                result.data
                    .recentSubmissionList || [];

            const recentSubmissions =
                recentSubmissionsRaw.map(
                    (sub) => ({
                        title:
                            sub.title ||
                            "Solved Problem",

                        statusDisplay:
                            sub.statusDisplay ||
                            "Accepted",

                        timestamp:
                            sub.timestamp,

                        timeAgo:
                            sub.timestamp
                                ? new Date(
                                      Number(
                                          sub.timestamp
                                      ) * 1000
                                  ).toLocaleString(
                                      "en-US",
                                      {
                                          month:
                                              "short",
                                          day:
                                              "numeric",
                                          year:
                                              "numeric",
                                          hour:
                                              "2-digit",
                                          minute:
                                              "2-digit",
                                      }
                                  )
                                : "Recently",
                    })
                );

            return res.status(200).json({
                username:
                    user.username,

                totalSolved,

                easySolved,

                mediumSolved,

                hardSolved,

                ranking:
                    user.profile?.ranking ||
                    "N/A",

                recentSubmissions,

                lastSolvedQuestion:
                    recentSubmissions[0]
                        ?.title || null,

                lastSolvedAt:
                    recentSubmissions[0]
                        ?.timestamp || null,
            });
        } catch (err) {
            console.error(
                "LeetCode Fetch Error:",
                err
            );

            return res.status(500).json({
                error:
                    "Failed to fetch LeetCode data: " +
                    err.message,
            });
        }
    }
);

// ============================================================
// 7. GET LEETCODE REVIEW STATUS
//
// GET /leetcode-review-status/:user_id
//
// IMPORTANT:
// There is ONLY ONE route for this endpoint.
// ============================================================

router.get(
    "/leetcode-review-status/:user_id",
    singleStudentLimiter,
    async (req, res) => {
        try {
            const { user_id } = req.params;

            if (!user_id) {
                return res.status(400).json({
                    error:
                        "user_id is required",
                });
            }

            const {
                data,
                error,
            } = await supabase
                .from("leetcode_submissions")
                .select(`
                    submission_id,
                    title_slug,
                    submitted_at,
                    review_status,
                    flagged_reason
                `)
                .eq("user_id", user_id)
                .eq(
                    "review_status",
                    "pending"
                )
                .order("submitted_at", {
                    ascending: false,
                });

            if (error) {
                console.error(
                    "Review status error:",
                    error
                );

                return res.status(500).json({
                    error:
                        error.message,
                });
            }

            const pendingSubmissions =
                data || [];

            return res.status(200).json({
                under_review:
                    pendingSubmissions.length >
                    0,

                pending_review_count:
                    pendingSubmissions.length,

                pending_submissions:
                    pendingSubmissions,
            });
        } catch (err) {
            console.error(
                "Review status server error:",
                err
            );

            return res.status(500).json({
                error:
                    "Internal Server Error",
            });
        }
    }
);

// ============================================================
// 8. GET LEETCODE LEADERBOARD
//
// GET /leetcode-leaderboard
//
// Pending-review students are excluded.
// ============================================================

router.get(
    "/leetcode-leaderboard",
    async (req, res) => {
        try {
            // ----------------------------------------------------
            // FETCH LEADERBOARD
            // ----------------------------------------------------

            const {
                data: leaderboardData,
                error: leaderboardError,
            } = await supabase
                .from("leetcode_leaderboard")
                .select(`
                    id,
                    profile_id,
                    user_id,
                    leetcode_username,
                    easy_solved,
                    medium_solved,
                    hard_solved,
                    total_solved,
                    ranking,
                    score,
                    updated_at,
                    last_solved_at,
                    is_leetcode_active,
                    is_suspended,
                    suspension_reason
                `)
                .order("score", {
                    ascending: false,
                });

            if (leaderboardError) {
                console.error(
                    "Leaderboard query error:",
                    leaderboardError
                );

                return res.status(400).json({
                    error:
                        leaderboardError.message,
                });
            }

            if (
                !leaderboardData ||
                leaderboardData.length === 0
            ) {
                return res.status(200).json([]);
            }

            // ----------------------------------------------------
            // GET USER IDS
            // ----------------------------------------------------

            const userIds =
                leaderboardData
                    .map(
                        (row) =>
                            row.user_id
                    )
                    .filter(Boolean);

            // ----------------------------------------------------
            // GET PENDING REVIEWS
            // ----------------------------------------------------

            let pendingUserIds =
                new Set();

            if (userIds.length > 0) {
                const {
                    data: pendingData,
                    error: pendingError,
                } = await supabase
                    .from(
                        "leetcode_submissions"
                    )
                    .select("user_id")
                    .in(
                        "user_id",
                        userIds
                    )
                    .eq(
                        "review_status",
                        "pending"
                    );

                if (pendingError) {
                    console.error(
                        "Pending review query error:",
                        pendingError
                    );

                    return res.status(500).json({
                        error:
                            pendingError.message,
                    });
                }

                pendingUserIds =
                    new Set(
                        (pendingData || [])
                            .map(
                                (row) =>
                                    row.user_id
                            )
                            .filter(Boolean)
                    );
            }

            // ----------------------------------------------------
            // REMOVE STUDENTS UNDER REVIEW
            // ----------------------------------------------------

            const approvedLeaderboard =
                leaderboardData.filter(
                    (student) =>
                        !pendingUserIds.has(
                            student.user_id
                        )
                );

            // ----------------------------------------------------
            // GET APPROVED USER IDS
            // ----------------------------------------------------

            const approvedUserIds =
                approvedLeaderboard
                    .map(
                        (row) =>
                            row.user_id
                    )
                    .filter(Boolean);

            // ----------------------------------------------------
            // GET PROFILE DETAILS
            // ----------------------------------------------------

            let profileData = [];

            if (
                approvedUserIds.length > 0
            ) {
                const {
                    data,
                    error: profileError,
                } = await supabase
                    .from("profiles")
                    .select(`
                        user_id,
                        name,
                        squad_id,
                        avatar_url
                    `)
                    .in(
                        "user_id",
                        approvedUserIds
                    );

                if (profileError) {
                    console.error(
                        "Profile fetch error:",
                        profileError
                    );
                } else {
                    profileData =
                        data || [];
                }
            }

            // ----------------------------------------------------
            // CREATE PROFILE MAP
            // ----------------------------------------------------

            const profileMap = {};

            profileData.forEach(
                (profile) => {
                    profileMap[
                        profile.user_id
                    ] = profile;
                }
            );

            // ----------------------------------------------------
            // MERGE DATA
            // ----------------------------------------------------

            const result =
                approvedLeaderboard.map(
                    (student) => ({
                        ...student,

                        profiles:
                            profileMap[
                                student.user_id
                            ] || {},

                        under_review:
                            false,
                    })
                );

            // ----------------------------------------------------
            // RECALCULATE RANK
            // ----------------------------------------------------

            const rankedResult =
                result.map(
                    (student, index) => ({
                        ...student,

                        leaderboard_rank:
                            index + 1,
                    })
                );

            return res.status(200).json(
                rankedResult
            );
        } catch (err) {
            console.error(
                "Leaderboard error:",
                err
            );

            return res.status(500).json({
                error:
                    "Internal Server Error",

                details:
                    err.message,
            });
        }
    }
);

// ============================================================
// 9. GET LEETCODE RECENT ACCEPTED SUBMISSIONS
//
// POST /leetcode-submissions
//
// IMPORTANT:
// Existing mentor decisions are NOT overwritten.
// ============================================================

router.post(
    "/leetcode-submissions",
    statsRouteLimiter,
    async (req, res) => {
        console.log(
            "🔥 LEETCODE SUBMISSIONS ROUTE CALLED 🔥"
        );

        console.log(
            "BODY:",
            req.body
        );

        const {
            url,
            user_id,
        } = req.body;

        // --------------------------------------------------------
        // VALIDATE USER ID
        // --------------------------------------------------------

        if (!user_id) {
            return res.status(400).json({
                error:
                    "user_id is required",
            });
        }

        // --------------------------------------------------------
        // EXTRACT USERNAME
        // --------------------------------------------------------

        const username =
            extractUsername(
                url,
                "leetcode"
            );

        if (
            !username ||
            !isValidLeetCodeUsername(
                username
            )
        ) {
            return res.status(400).json({
                error:
                    "Invalid LeetCode username or URL",
            });
        }

        try {
            // ----------------------------------------------------
            // GRAPHQL QUERY
            // ----------------------------------------------------

            const query = `
                query getRecentSubmissions(
                    $username: String!
                ) {
                    recentAcSubmissionList(
                        username: $username
                    ) {
                        id
                        title
                        titleSlug
                        timestamp
                        lang
                    }
                }
            `;

            // ----------------------------------------------------
            // FETCH LEETCODE
            // ----------------------------------------------------

            const response = await fetch(
                "https://leetcode.com/graphql",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Referer:
                            "https://leetcode.com/",

                        "User-Agent":
                            "Mozilla/5.0",
                    },

                    body: JSON.stringify({
                        query,

                        variables: {
                            username,
                        },
                    }),
                }
            );

            if (!response.ok) {
                return res.status(502).json({
                    error:
                        "Failed to reach LeetCode",
                });
            }

            const result =
                await response.json();

            if (
                result.errors &&
                result.errors.length > 0
            ) {
                console.error(
                    "LeetCode submission GraphQL errors:",
                    result.errors
                );

                return res.status(502).json({
                    error:
                        "LeetCode returned a GraphQL error",
                });
            }

            const submissions =
                result?.data
                    ?.recentAcSubmissionList ||
                [];

            // ----------------------------------------------------
            // NO SUBMISSIONS
            // ----------------------------------------------------

            if (
                submissions.length === 0
            ) {
                return res.status(200).json({
                    success: true,
                    username,
                    count: 0,
                    submissions: [],
                });
            }

            // ----------------------------------------------------
            // SORT SUBMISSIONS
            // ----------------------------------------------------

            const sortedSubmissions =
                [...submissions]
                    .map(
                        (submission) => ({
                            ...submission,

                            submittedAt:
                                new Date(
                                    Number(
                                        submission.timestamp
                                    ) * 1000
                                ),
                        })
                    )
                    .filter(
                        (submission) =>
                            !Number.isNaN(
                                submission
                                    .submittedAt
                                    .getTime()
                            )
                    )
                    .sort(
                        (a, b) =>
                            a.submittedAt.getTime() -
                            b.submittedAt.getTime()
                    );

            // ----------------------------------------------------
            // GET EXISTING RECORDS FIRST
            //
            // This prevents mentor decisions from being overwritten.
            // ----------------------------------------------------

            const submissionIds =
                sortedSubmissions.map(
                    (submission) =>
                        String(
                            submission.id
                        )
                );

            const {
                data: existingRecords,
                error: existingError,
            } = await supabase
                .from(
                    "leetcode_submissions"
                )
                .select(`
                    submission_id,
                    review_status,
                    flagged_reason
                `)
                .in(
                    "submission_id",
                    submissionIds
                );

            if (existingError) {
                console.error(
                    "Existing submissions query error:",
                    existingError
                );

                return res.status(500).json({
                    error:
                        existingError.message,
                });
            }

            const existingMap = new Map();

            (existingRecords || []).forEach(
                (record) => {
                    existingMap.set(
                        String(
                            record.submission_id
                        ),
                        record
                    );
                }
            );

            // ----------------------------------------------------
            // CREATE DATABASE RECORDS
            // ----------------------------------------------------

            const records =
                sortedSubmissions.map(
                    (
                        submission,
                        index
                    ) => {
                        const submissionId =
                            String(
                                submission.id
                            );

                        const existing =
                            existingMap.get(
                                submissionId
                            );

                        // ----------------------------------------
                        // NEVER MODIFY ALREADY REVIEWED RECORD
                        // ----------------------------------------

                        if (
                            existing &&
                            existing.review_status !==
                                "pending"
                        ) {
                            return {
                                user_id,

                                leetcode_username:
                                    username,

                                submission_id:
                                    submissionId,

                                title_slug:
                                    submission.titleSlug ||
                                    null,

                                difficulty:
                                    null,

                                submitted_at:
                                    submission
                                        .submittedAt
                                        .toISOString(),

                                review_status:
                                    existing.review_status,

                                flagged_reason:
                                    existing.flagged_reason,
                            };
                        }

                        // ----------------------------------------
                        // RAPID SOLVE DETECTION
                        // ----------------------------------------

                        let reviewStatus =
                            existing?.review_status ||
                            "approved";

                        let flaggedReason =
                            existing?.flagged_reason ||
                            null;

                        if (
                            !existing &&
                            index > 0
                        ) {
                            const previous =
                                sortedSubmissions[
                                    index - 1
                                ];

                            const differenceMs =
                                submission
                                    .submittedAt
                                    .getTime() -
                                previous
                                    .submittedAt
                                    .getTime();

                            const differenceSeconds =
                                differenceMs /
                                1000;

                            if (
                                differenceSeconds <=
                                120
                            ) {
                                reviewStatus =
                                    "pending";

                                flaggedReason =
                                    `Solved ${Math.round(
                                        differenceSeconds
                                    )} seconds after previous solve`;
                            }
                        }

                        return {
                            user_id,

                            leetcode_username:
                                username,

                            submission_id:
                                submissionId,

                            title_slug:
                                submission.titleSlug ||
                                null,

                            difficulty:
                                null,

                            submitted_at:
                                submission
                                    .submittedAt
                                    .toISOString(),

                            review_status:
                                reviewStatus,

                            flagged_reason:
                                flaggedReason,
                        };
                    }
                );

            // ----------------------------------------------------
            // SAVE TO SUPABASE
            // ----------------------------------------------------

            const {
                data,
                error,
            } = await supabase
                .from(
                    "leetcode_submissions"
                )
                .upsert(
                    records,
                    {
                        onConflict:
                            "submission_id",
                    }
                )
                .select();

            if (error) {
                console.error(
                    "Save LeetCode submissions error:",
                    error
                );

                return res.status(500).json({
                    error:
                        error.message,
                });
            }

            // ----------------------------------------------------
            // RESPONSE
            // ----------------------------------------------------

            return res.status(200).json({
                success: true,

                username,

                count:
                    data?.length || 0,

                submissions:
                    data || [],
            });
        } catch (err) {
            console.error(
                "LeetCode submission fetch error:",
                err
            );

            return res.status(500).json({
                error:
                    "Failed to fetch LeetCode submissions",
            });
        }
    }
);

// ============================================================
// EXPORT ROUTER
// ============================================================

export default router;