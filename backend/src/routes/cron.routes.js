import express from "express";
import { supabaseAdmin } from "../config/supabase.js";

const router = express.Router();

// ============================================================
// CONFIG
// ============================================================

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const getRandomDelay = (min = 1500, max = 3000) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const MAX_RETRIES = 3;

const LEETCODE_GRAPHQL_URL =
  "https://leetcode.com/graphql";

const RAPID_SOLVE_SECONDS = 60;

// ============================================================
// VALIDATE LEETCODE USERNAME
// ============================================================

const isValidLeetCodeUsername = (username) => {
  return /^[a-zA-Z0-9_-]{1,30}$/.test(username);
};

// ============================================================
// EXTRACT LEETCODE USERNAME
// ============================================================

const extractUsername = (input) => {
  if (!input) return null;

  try {
    const cleanInput = String(input)
      .trim()
      .split("?")[0]
      .split("#")[0]
      .replace(/\/+$/, "");

    // Full URL:
    // https://leetcode.com/u/username
    // https://leetcode.com/username
    if (cleanInput.includes("leetcode.com")) {
      const match = cleanInput.match(
        /leetcode\.com\/(?:u\/)?([^/]+)$/i
      );

      return match?.[1] || null;
    }

    // Just username
    return cleanInput;
  } catch (error) {
    console.error("[USERNAME EXTRACTION ERROR]", {
      input,
      message: error.message,
    });

    return null;
  }
};

// ============================================================
// SUPABASE ERROR LOGGER
// ============================================================

const logSupabaseError = (
  context,
  error,
  extra = {}
) => {
  console.error("\n[SUPABASE ERROR]");
  console.error(`Context : ${context}`);

  console.error(
    JSON.stringify(
      {
        ...extra,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      },
      null,
      2
    )
  );

  console.error("-----------------------------------------------");
};

// ============================================================
// ROUTER DEBUG LOGGER
// ============================================================

router.use((req, res, next) => {
  console.log("========================================");
  console.log("[LEETCODE ROUTER REQUEST]");
  console.log("Method:", req.method);
  console.log("URL:", req.originalUrl);
  console.log(
    "Authorization:",
    req.headers.authorization ? "YES" : "NO"
  );
  console.log("User:", req.user?.id || "NO USER");
  console.log("========================================");

  next();
});

// ============================================================
// FIND RAPID SUBMISSIONS
// ============================================================

function findRapidSubmissionIds(submissions) {
  const rapidIds = new Set();

  if (
    !Array.isArray(submissions) ||
    submissions.length < 2
  ) {
    return rapidIds;
  }

  const sorted = [...submissions]
    .filter(
      (submission) =>
        submission?.id &&
        submission?.timestamp
    )
    .sort(
      (a, b) =>
        Number(a.timestamp) -
        Number(b.timestamp)
    );

  for (let i = 1; i < sorted.length; i++) {
    const previous = Number(
      sorted[i - 1].timestamp
    );

    const current = Number(
      sorted[i].timestamp
    );

    const difference =
      current - previous;

    if (
      difference >= 0 &&
      difference <= RAPID_SOLVE_SECONDS
    ) {
      const previousId = String(
        sorted[i - 1].id
      );

      const currentId = String(
        sorted[i].id
      );

      rapidIds.add(previousId);
      rapidIds.add(currentId);

      console.log(
        `[RAPID SOLVE DETECTED] ` +
          `${sorted[i - 1].titleSlug} <-> ` +
          `${sorted[i].titleSlug} | ` +
          `${difference}s apart`
      );
    }
  }

  return rapidIds;
}

// ============================================================
// SAVE LEETCODE SUBMISSIONS
// ============================================================

async function saveLeetCodeSubmissions(
  userId,
  username,
  submissions
) {
  if (!userId) {
    console.error(
      "[SUBMISSIONS] Missing userId"
    );

    return {
      success: false,
      count: 0,
      rapidCount: 0,
    };
  }

  if (
    !Array.isArray(submissions) ||
    submissions.length === 0
  ) {
    console.log(
      `[SUBMISSIONS] ${username} | No recent accepted submissions`
    );

    return {
      success: true,
      count: 0,
      rapidCount: 0,
    };
  }

  console.log(
    `[SUBMISSIONS] ${username} | Found ${submissions.length} accepted submissions`
  );

  // ----------------------------------------------------------
  // DETECT RAPID SUBMISSIONS
  // ----------------------------------------------------------

  const rapidIds =
    findRapidSubmissionIds(submissions);

  // ----------------------------------------------------------
  // GET EXISTING SUBMISSIONS
  // ----------------------------------------------------------

  const submissionIds = submissions
    .map((submission) =>
      String(submission.id)
    )
    .filter(Boolean);

  const {
    data: existingSubmissions,
    error: existingError,
  } = await supabaseAdmin
    .from("leetcode_submissions")
    .select(`
      submission_id,
      status,
      review_status,
      flag_reason
    `)
    .eq("user_id", userId)
    .in(
      "submission_id",
      submissionIds
    );

  if (existingError) {
    logSupabaseError(
      "Fetching existing submissions",
      existingError,
      {
        userId,
        username,
      }
    );

    return {
      success: false,
      count: 0,
      rapidCount: 0,
    };
  }

  const existingMap = {};

  for (
    const existing
    of existingSubmissions || []
  ) {
    existingMap[
      String(existing.submission_id)
    ] = existing;
  }

  // ----------------------------------------------------------
  // BUILD ROWS
  // ----------------------------------------------------------

  const rows = submissions.map(
    (submission) => {
      const submissionId = String(
        submission.id
      );

      const isRapid =
        rapidIds.has(submissionId);

      const existing =
        existingMap[submissionId];

      // Preserve existing mentor decision
      let reviewStatus =
        existing?.review_status ||
        "approved";

      let flagReason =
        existing?.flag_reason || null;

      let status =
        existing?.status ||
        "ACCEPTED";

      // ------------------------------------------------------
      // CHECK IF ALREADY REVIEWED
      // ------------------------------------------------------

      const alreadyReviewed =
        existing?.review_status ===
          "approved" ||
        existing?.review_status ===
          "rejected";

      // ------------------------------------------------------
      // CHEAT DETECTION
      // ------------------------------------------------------

      if (
        isRapid &&
        !alreadyReviewed
      ) {
        reviewStatus = "pending";

        flagReason =
          "Rapid submission pattern detected";

        status = "PENDING_REVIEW";

        console.log(
          `[FLAGGED] ${username} | ${submission.titleSlug}`
        );
      }

      return {
        user_id: userId,

        leetcode_username:
          username,

        submission_id:
          submissionId,

        title_slug:
          submission.titleSlug || null,

        difficulty:
          submission.difficulty || null,

        submitted_at:
          submission.timestamp
            ? new Date(
                Number(
                  submission.timestamp
                ) * 1000
              ).toISOString()
            : null,

        status,

        flag_reason:
          flagReason,

        review_status:
          reviewStatus,

        created_at:
          existing?.created_at ||
          new Date().toISOString(),
      };
    }
  );

  // ----------------------------------------------------------
  // UPSERT
  // ----------------------------------------------------------

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("leetcode_submissions")
    .upsert(rows, {
      onConflict:
        "user_id,submission_id",
    })
    .select();

  if (error) {
    logSupabaseError(
      "Saving LeetCode submissions",
      error,
      {
        userId,
        username,
        submissionCount:
          rows.length,
      }
    );

    return {
      success: false,
      count: 0,
      rapidCount: rapidIds.size,
    };
  }

  console.log(
    `[SUBMISSIONS SAVED] ${username} | ${
      data?.length || rows.length
    } records`
  );

  if (rapidIds.size > 0) {
    console.log(
      `[CHEAT DETECTION] ${username} | ` +
        `${rapidIds.size} submissions flagged`
    );
  }

  return {
    success: true,
    count:
      data?.length || rows.length,
    rapidCount:
      rapidIds.size,
  };
}

// ============================================================
// UPDATE LEADERBOARD SUSPENSION
// ============================================================

async function updateLeaderboardSuspensionStatus(
  userId,
  profileId
) {
  try {
    if (!userId || !profileId) {
      console.warn(
        "[SUSPENSION] Missing userId/profileId",
        {
          userId,
          profileId,
        }
      );

      return false;
    }

    const {
      data: pendingReviews,
      error: pendingError,
    } = await supabaseAdmin
      .from("leetcode_submissions")
      .select("id")
      .eq("user_id", userId)
      .eq("review_status", "pending")
      .limit(1);

    if (pendingError) {
      logSupabaseError(
        "Suspension check failed",
        pendingError,
        {
          userId,
          profileId,
        }
      );

      return false;
    }

    const hasPendingReviews =
      Array.isArray(pendingReviews) &&
      pendingReviews.length > 0;

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("leetcode_leaderboard")
      .update({
        is_suspended:
          hasPendingReviews,

        suspension_reason:
          hasPendingReviews
            ? "Pending mentor review for suspicious submission patterns"
            : null,

        updated_at:
          new Date().toISOString(),
      })
      .eq("profile_id", profileId);

    if (updateError) {
      logSupabaseError(
        "Updating leaderboard suspension",
        updateError,
        {
          userId,
          profileId,
          hasPendingReviews,
        }
      );

      return false;
    }

    console.log(
      hasPendingReviews
        ? `[SUSPENSION] ${userId} | Suspended until mentor review`
        : `[SUSPENSION LIFTED] ${userId}`
    );

    return true;
  } catch (error) {
    console.error(
      `[SUSPENSION EXCEPTION] ${userId}`,
      error
    );

    return false;
  }
}

// ============================================================
// GET MENTOR REVIEW QUEUE
// ============================================================

router.get(
  "/queue",
  async (req, res) => {
    try {
      console.log(
        "\n========================================"
      );

      console.log(
        "[MENTOR REVIEW QUEUE]"
      );

      console.log(
        "Method:",
        req.method
      );

      console.log(
        "URL:",
        req.originalUrl
      );

      console.log(
        "User:",
        req.user?.id || "NO USER"
      );

      console.log(
        "========================================"
      );

      // ------------------------------------------------------
      // PENDING SUBMISSIONS
      // ------------------------------------------------------

      const {
        data: submissions,
        error: submissionError,
      } = await supabaseAdmin
        .from("leetcode_submissions")
        .select(`
          id,
          user_id,
          leetcode_username,
          submission_id,
          title_slug,
          difficulty,
          submitted_at,
          status,
          flag_reason,
          review_status,
          created_at
        `)
        .eq(
          "review_status",
          "pending"
        )
        .order(
          "submitted_at",
          {
            ascending: false,
          }
        );

      if (submissionError) {
        logSupabaseError(
          "Fetching mentor review queue",
          submissionError
        );

        return res.status(500).json({
          error:
            "Failed to fetch mentor review queue",

          details:
            submissionError.message,

          code:
            submissionError.code,
        });
      }

      console.log(
        `[MENTOR REVIEW QUEUE] Pending submissions: ${
          submissions?.length || 0
        }`
      );

      // ------------------------------------------------------
      // EMPTY QUEUE
      // ------------------------------------------------------

      if (
        !submissions ||
        submissions.length === 0
      ) {
        return res.status(200).json({
          reviews: [],
        });
      }

      // ------------------------------------------------------
      // STUDENT IDS
      // ------------------------------------------------------

      const studentIds = [
        ...new Set(
          submissions
            .map(
              (submission) =>
                submission.user_id
            )
            .filter(Boolean)
        ),
      ];

      console.log(
        "[QUEUE] Student IDs:",
        studentIds
      );

      // ------------------------------------------------------
      // PROFILES
      // ------------------------------------------------------

      const {
        data: profiles,
        error: profileError,
      } = await supabaseAdmin
        .from("profiles")
        .select(`
          user_id,
          name,
          avatar_url
        `)
        .in(
          "user_id",
          studentIds
        );

      if (profileError) {
        logSupabaseError(
          "Fetching student profiles",
          profileError
        );

        return res.status(500).json({
          error:
            "Failed to fetch student profiles",

          details:
            profileError.message,

          code:
            profileError.code,
        });
      }

      const profileMap = {};

      for (
        const profile
        of profiles || []
      ) {
        profileMap[
          profile.user_id
        ] = profile;
      }

      // ------------------------------------------------------
      // SQUADS
      // ------------------------------------------------------

      const {
        data: squadStudents,
        error: squadError,
      } = await supabaseAdmin
        .from("squad_students")
        .select(`
          student_user_id,
          squad_id
        `)
        .in(
          "student_user_id",
          studentIds
        );

      if (squadError) {
        logSupabaseError(
          "Fetching student squads",
          squadError
        );

        return res.status(500).json({
          error:
            "Failed to fetch student squads",

          details:
            squadError.message,

          code:
            squadError.code,
        });
      }

      const squadMap = {};

      for (
        const squad
        of squadStudents || []
      ) {
        squadMap[
          squad.student_user_id
        ] = squad.squad_id;
      }

      // ------------------------------------------------------
      // LEADERBOARD
      // ------------------------------------------------------

      const {
        data: leaderboardRecords,
        error: leaderboardError,
      } = await supabaseAdmin
        .from("leetcode_leaderboard")
        .select(`
          user_id,
          easy_solved,
          medium_solved,
          hard_solved,
          total_solved,
          score,
          ranking,
          leetcode_username
        `)
        .in(
          "user_id",
          studentIds
        );

      if (leaderboardError) {
        logSupabaseError(
          "Fetching leaderboard data",
          leaderboardError
        );

        return res.status(500).json({
          error:
            "Failed to fetch leaderboard data",

          details:
            leaderboardError.message,

          code:
            leaderboardError.code,
        });
      }

      const leaderboardMap = {};

      for (
        const leaderboard
        of leaderboardRecords || []
      ) {
        leaderboardMap[
          leaderboard.user_id
        ] = leaderboard;
      }

      // ------------------------------------------------------
      // GROUP BY STUDENT
      // ------------------------------------------------------

      const studentMap = {};

      for (
        const submission
        of submissions
      ) {
        const userId =
          submission.user_id;

        const profile =
          profileMap[userId];

        const leaderboard =
          leaderboardMap[userId];

        if (!studentMap[userId]) {
          studentMap[userId] = {
            student_user_id:
              userId,

            name:
              profile?.name ||
              "Student",

            avatar_url:
              profile?.avatar_url ||
              null,

            squad_id:
              squadMap[userId] ||
              null,

            leetcode_username:
              leaderboard?.leetcode_username ||
              submission.leetcode_username ||
              "unknown",

            easy_solved:
              leaderboard?.easy_solved ||
              0,

            medium_solved:
              leaderboard?.medium_solved ||
              0,

            hard_solved:
              leaderboard?.hard_solved ||
              0,

            total_solved:
              leaderboard?.total_solved ||
              0,

            score:
              leaderboard?.score ||
              0,

            ranking:
              leaderboard?.ranking ||
              0,

            pending_review_count:
              0,

            submissions: [],
          };
        }

        studentMap[
          userId
        ].pending_review_count++;

        studentMap[
          userId
        ].submissions.push({
          id:
            submission.id,

          submission_id:
            submission.submission_id,

          title_slug:
            submission.title_slug,

          difficulty:
            submission.difficulty,

          submitted_at:
            submission.submitted_at,

          status:
            submission.status,

          flag_reason:
            submission.flag_reason,

          review_status:
            submission.review_status,

          created_at:
            submission.created_at,
        });
      }

      const reviews =
        Object.values(
          studentMap
        );

      console.log(
        `[MENTOR REVIEW QUEUE] Returning ${reviews.length} students`
      );

      return res.status(200).json({
        reviews,
      });
    } catch (error) {
      console.error(
        "\n[MENTOR REVIEW QUEUE EXCEPTION]"
      );

      console.error(error);

      return res.status(500).json({
        error:
          "Internal server error",

        details:
          error.message,
      });
    }
  }
);

// ============================================================
// APPROVE MENTOR REVIEW
// ============================================================

router.patch(
  "/:studentUserId/approve",
  async (req, res) => {
    const {
      studentUserId,
    } = req.params;

    if (!studentUserId) {
      return res.status(400).json({
        error:
          "Student user ID is required",
      });
    }

    try {
      console.log(
        `[MENTOR REVIEW] Approving ${studentUserId}`
      );

      // ------------------------------------------------------
      // UPDATE PENDING SUBMISSIONS
      // ------------------------------------------------------

      const {
        data,
        error,
      } = await supabaseAdmin
        .from("leetcode_submissions")
        .update({
          review_status:
            "approved",

          status:
            "APPROVED",

          flag_reason:
            null,
        })
        .eq(
          "user_id",
          studentUserId
        )
        .eq(
          "review_status",
          "pending"
        )
        .select();

      if (error) {
        logSupabaseError(
          "Approving mentor review",
          error,
          {
            studentUserId,
          }
        );

        return res.status(500).json({
          error:
            "Failed to approve submissions",
        });
      }

      // ------------------------------------------------------
      // GET PROFILE
      // ------------------------------------------------------

      const {
        data: profile,
        error: profileError,
      } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq(
          "user_id",
          studentUserId
        )
        .maybeSingle();

      if (profileError) {
        logSupabaseError(
          "Fetching profile for approval",
          profileError,
          {
            studentUserId,
          }
        );
      }

      // ------------------------------------------------------
      // UPDATE SUSPENSION
      // ------------------------------------------------------

      if (profile?.id) {
        await updateLeaderboardSuspensionStatus(
          studentUserId,
          profile.id
        );
      }

      console.log(
        `[MENTOR REVIEW] Approved ${
          data?.length || 0
        } submissions`
      );

      return res.status(200).json({
        message:
          "Submissions approved successfully",

        updatedCount:
          data?.length || 0,

        reviews:
          data || [],
      });
    } catch (error) {
      console.error(
        "[APPROVE REVIEW EXCEPTION]",
        error
      );

      return res.status(500).json({
        error:
          "Internal server error",
      });
    }
  }
);

// ============================================================
// REJECT MENTOR REVIEW
// ============================================================

router.patch(
  "/:studentUserId/reject",
  async (req, res) => {
    const {
      studentUserId,
    } = req.params;

    if (!studentUserId) {
      return res.status(400).json({
        error:
          "Student user ID is required",
      });
    }

    try {
      console.log(
        `[MENTOR REVIEW] Rejecting ${studentUserId}`
      );

      // ------------------------------------------------------
      // UPDATE PENDING SUBMISSIONS
      // ------------------------------------------------------

      const {
        data,
        error,
      } = await supabaseAdmin
        .from("leetcode_submissions")
        .update({
          review_status:
            "rejected",

          status:
            "REJECTED",
        })
        .eq(
          "user_id",
          studentUserId
        )
        .eq(
          "review_status",
          "pending"
        )
        .select();

      if (error) {
        logSupabaseError(
          "Rejecting mentor review",
          error,
          {
            studentUserId,
          }
        );

        return res.status(500).json({
          error:
            "Failed to reject submissions",
        });
      }

      // ------------------------------------------------------
      // GET PROFILE
      // ------------------------------------------------------

      const {
        data: profile,
        error: profileError,
      } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq(
          "user_id",
          studentUserId
        )
        .maybeSingle();

      if (profileError) {
        logSupabaseError(
          "Fetching profile for rejection",
          profileError,
          {
            studentUserId,
          }
        );
      }

      // ------------------------------------------------------
      // UPDATE SUSPENSION
      // ------------------------------------------------------

      if (profile?.id) {
        await updateLeaderboardSuspensionStatus(
          studentUserId,
          profile.id
        );
      }

      console.log(
        `[MENTOR REVIEW] Rejected ${
          data?.length || 0
        } submissions`
      );

      return res.status(200).json({
        message:
          "Submissions rejected successfully",

        updatedCount:
          data?.length || 0,

        reviews:
          data || [],
      });
    } catch (error) {
      console.error(
        "[REJECT REVIEW EXCEPTION]",
        error
      );

      return res.status(500).json({
        error:
          "Internal server error",
      });
    }
  }
);

// ============================================================
// PUBLIC LEADERBOARD
// ============================================================

router.get(
  "/",
  async (req, res) => {
    try {
      // ------------------------------------------------------
      // LEADERBOARD
      // ------------------------------------------------------

      const {
        data: leaderboardData,
        error: leaderboardError,
      } = await supabaseAdmin
        .from("leetcode_leaderboard")
        .select(`
          *,
          profiles (
            id,
            name,
            avatar_url
          )
        `)
        .order(
          "score",
          {
            ascending: false,
          }
        );

      if (leaderboardError) {
        throw leaderboardError;
      }

      // ------------------------------------------------------
      // SUBMISSION REVIEW DATA
      // ------------------------------------------------------

      const {
        data: submissionData,
        error: submissionError,
      } = await supabaseAdmin
        .from("leetcode_submissions")
        .select(`
          user_id,
          status,
          review_status,
          flag_reason
        `);

      if (submissionError) {
        throw submissionError;
      }

      // ------------------------------------------------------
      // REVIEW MAP
      // ------------------------------------------------------

      const reviewMap = {};

      for (
        const submission
        of submissionData || []
      ) {
        const userId =
          submission.user_id;

        if (!userId) continue;

        if (!reviewMap[userId]) {
          reviewMap[userId] = {
            pendingReviewCount:
              0,

            isFlagged:
              false,
          };
        }

        const reviewStatus =
          submission.review_status?.toLowerCase();

        const status =
          submission.status?.toLowerCase();

        const isPending =
          reviewStatus === "pending" ||
          status ===
            "pending_review" ||
          status === "pending";

        if (isPending) {
          reviewMap[
            userId
          ].pendingReviewCount++;

          reviewMap[
            userId
          ].isFlagged = true;
        }

        const hasFlagReason =
          typeof submission.flag_reason ===
            "string" &&
          submission.flag_reason
            .trim()
            .length > 0;

        if (hasFlagReason) {
          reviewMap[
            userId
          ].isFlagged = true;
        }
      }

      // ------------------------------------------------------
      // MERGE
      // ------------------------------------------------------

      const result =
        (leaderboardData || []).map(
          (student) => {
            const reviewInfo =
              reviewMap[
                student.user_id
              ] || {
                pendingReviewCount:
                  0,

                isFlagged:
                  false,
              };

            return {
              ...student,

              pending_review_count:
                reviewInfo.pendingReviewCount,

              is_flagged:
                reviewInfo.isFlagged,
            };
          }
        );

      console.log(
        "LEADERBOARD REVIEW DATA:",
        result.map(
          (student) => ({
            username:
              student.leetcode_username,

            user_id:
              student.user_id,

            pending_review_count:
              student.pending_review_count,

            is_flagged:
              student.is_flagged,
          })
        )
      );

      return res.status(200).json(
        result
      );
    } catch (error) {
      console.error(
        "Leaderboard fetch error:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to fetch leaderboard",
      });
    }
  }
);

// ============================================================
// NOTIFY MENTORS
// ============================================================

async function notifyMentorsAboutInactiveStudents() {
  console.log(
    "\n[EMAIL SYSTEM] Starting mentor notifications..."
  );

  try {
    // --------------------------------------------------------
    // INACTIVE STUDENTS
    // --------------------------------------------------------

    const {
      data: inactiveRecords,
      error: inactiveError,
    } = await supabaseAdmin
      .from("leetcode_leaderboard")
      .select(`
        user_id,
        last_solved_at
      `)
      .eq(
        "is_leetcode_active",
        false
      );

    if (inactiveError) {
      throw inactiveError;
    }

    console.log(
      `[EMAIL SYSTEM] Inactive students: ${
        inactiveRecords?.length || 0
      }`
    );

    // --------------------------------------------------------
    // ASSIGNMENTS
    // --------------------------------------------------------

    const {
      data: assignments,
      error: assignmentError,
    } = await supabaseAdmin
      .from("squad_students")
      .select(`
        student_user_id,
        mentor_user_id
      `);

    if (assignmentError) {
      throw assignmentError;
    }

    if (
      !assignments ||
      assignments.length === 0
    ) {
      console.log(
        "[EMAIL SYSTEM] No mentor-student assignments found."
      );

      return;
    }

    // --------------------------------------------------------
    // STUDENT -> MENTORS
    // --------------------------------------------------------

    const studentToMentorsMap = {};
    const allAssignedStudentUserIds =
      new Set();

    for (
      const assignment
      of assignments
    ) {
      const studentId =
        assignment.student_user_id;

      const mentorId =
        assignment.mentor_user_id;

      if (
        !studentId ||
        !mentorId
      ) {
        continue;
      }

      if (
        !studentToMentorsMap[
          studentId
        ]
      ) {
        studentToMentorsMap[
          studentId
        ] = [];
      }

      if (
        !studentToMentorsMap[
          studentId
        ].includes(mentorId)
      ) {
        studentToMentorsMap[
          studentId
        ].push(mentorId);
      }

      allAssignedStudentUserIds.add(
        studentId
      );
    }

    // --------------------------------------------------------
    // STUDENT PROFILES
    // --------------------------------------------------------

    const {
      data: allStudentProfiles,
      error: profilesError,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        user_id,
        name,
        kalvium_email,
        leetcode
      `)
      .in(
        "user_id",
        Array.from(
          allAssignedStudentUserIds
        )
      );

    if (profilesError) {
      throw profilesError;
    }

    const missingProfileStudents =
      (
        allStudentProfiles || []
      ).filter(
        (profile) =>
          !profile.leetcode ||
          profile.leetcode.trim() === ""
      );

    // --------------------------------------------------------
    // MENTORS TO NOTIFY
    // --------------------------------------------------------

    const mentorIdsToNotify =
      new Set();

    for (
      const record
      of inactiveRecords || []
    ) {
      const mentorIds =
        studentToMentorsMap[
          record.user_id
        ] || [];

      for (
        const mentorId
        of mentorIds
      ) {
        mentorIdsToNotify.add(
          mentorId
        );
      }
    }

    for (
      const student
      of missingProfileStudents
    ) {
      const mentorIds =
        studentToMentorsMap[
          student.user_id
        ] || [];

      for (
        const mentorId
        of mentorIds
      ) {
        mentorIdsToNotify.add(
          mentorId
        );
      }
    }

    if (
      mentorIdsToNotify.size === 0
    ) {
      console.log(
        "[EMAIL SYSTEM] No mentors require notification."
      );

      return;
    }

    // --------------------------------------------------------
    // MENTOR PROFILES
    // --------------------------------------------------------

    const {
      data: mentorProfiles,
      error: mentorError,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        user_id,
        name,
        kalvium_email
      `)
      .in(
        "user_id",
        Array.from(
          mentorIdsToNotify
        )
      );

    if (mentorError) {
      throw mentorError;
    }

    const mentorDataMap = {};

    for (
      const mentor
      of mentorProfiles || []
    ) {
      mentorDataMap[
        mentor.user_id
      ] = mentor;
    }

    // --------------------------------------------------------
    // GROUP BY MENTOR
    // --------------------------------------------------------

    const groupedByMentor = {};

    const nowMs =
      Date.now();

    const ONE_DAY_MS =
      24 * 60 * 60 * 1000;

    for (
      const record
      of inactiveRecords || []
    ) {
      const assignedMentors =
        studentToMentorsMap[
          record.user_id
        ] || [];

      const lastSolvedDate =
        record.last_solved_at
          ? new Date(
              record.last_solved_at
            )
          : null;

      const daysInactive =
        lastSolvedDate
          ? Math.floor(
              (nowMs -
                lastSolvedDate.getTime()) /
                ONE_DAY_MS
            )
          : null;

      const studentProfile =
        (
          allStudentProfiles || []
        ).find(
          (profile) =>
            profile.user_id ===
            record.user_id
        );

      const student = {
        userId:
          record.user_id,

        name:
          studentProfile?.name ||
          "Student",

        email:
          studentProfile?.kalvium_email ||
          "Unknown",

        lastSolved:
          lastSolvedDate
            ? lastSolvedDate.toLocaleDateString()
            : "Never / Unknown",

        daysInactive:
          daysInactive !== null
            ? daysInactive
            : "Unknown",
      };

      for (
        const mentorId
        of assignedMentors
      ) {
        const mentor =
          mentorDataMap[
            mentorId
          ];

        if (!mentor) continue;

        const mentorEmail =
          mentor.kalvium_email;

        if (!mentorEmail) continue;

        if (
          !groupedByMentor[
            mentorEmail
          ]
        ) {
          groupedByMentor[
            mentorEmail
          ] = {
            mentorName:
              mentor.name ||
              "Mentor",

            sevenDaysPlus: [],

            oneToSixDays: [],

            missingProfile: [],
          };
        }

        if (
          daysInactive === null ||
          daysInactive >= 7
        ) {
          groupedByMentor[
            mentorEmail
          ].sevenDaysPlus.push(
            student
          );
        } else {
          groupedByMentor[
            mentorEmail
          ].oneToSixDays.push(
            student
          );
        }
      }
    }

    // --------------------------------------------------------
    // MISSING LEETCODE PROFILE
    // --------------------------------------------------------

    for (
      const student
      of missingProfileStudents
    ) {
      const assignedMentors =
        studentToMentorsMap[
          student.user_id
        ] || [];

      for (
        const mentorId
        of assignedMentors
      ) {
        const mentor =
          mentorDataMap[
            mentorId
          ];

        if (!mentor) continue;

        const mentorEmail =
          mentor.kalvium_email;

        if (!mentorEmail) continue;

        if (
          !groupedByMentor[
            mentorEmail
          ]
        ) {
          groupedByMentor[
            mentorEmail
          ] = {
            mentorName:
              mentor.name ||
              "Mentor",

            sevenDaysPlus: [],

            oneToSixDays: [],

            missingProfile: [],
          };
        }

        const alreadyExists =
          groupedByMentor[
            mentorEmail
          ].missingProfile.some(
            (item) =>
              item.userId ===
              student.user_id
          );

        if (!alreadyExists) {
          groupedByMentor[
            mentorEmail
          ].missingProfile.push({
            userId:
              student.user_id,

            name:
              student.name ||
              "Student",

            email:
              student.kalvium_email ||
              "Unknown",
          });
        }
      }
    }

    // --------------------------------------------------------
    // SEND EMAILS
    // --------------------------------------------------------

    for (
      const [
        mentorEmail,
        data,
      ] of Object.entries(
        groupedByMentor
      )
    ) {
      const renderList =
        (students) =>
          students
            .map(
              (student) => `
                <li>
                  <strong>${student.name}</strong>
                  (${student.email})
                  — Last active:
                  ${student.lastSolved}
                  (${student.daysInactive}
                  days inactive)
                </li>
              `
            )
            .join("");

      const renderMissingList =
        (students) =>
          students
            .map(
              (student) => `
                <li>
                  <strong>${student.name}</strong>
                  (${student.email})
                  —
                  <em>
                    LeetCode profile URL not set
                  </em>
                </li>
              `
            )
            .join("");

      const sevenDaysHtml =
        data.sevenDaysPlus.length
          ? `<ul>${renderList(
              data.sevenDaysPlus
            )}</ul>`
          : `<p><em>
              No students inactive for 7+ days.
            </em></p>`;

      const oneToSixDaysHtml =
        data.oneToSixDays.length
          ? `<ul>${renderList(
              data.oneToSixDays
            )}</ul>`
          : `<p><em>
              No students inactive in the 1–6 day window.
            </em></p>`;

      const missingProfileHtml =
        data.missingProfile.length
          ? `<ul>${renderMissingList(
              data.missingProfile
            )}</ul>`
          : `<p><em>
              All assigned squad members have configured their LeetCode profiles.
            </em></p>`;

      const totalCount =
        data.sevenDaysPlus.length +
        data.oneToSixDays.length +
        data.missingProfile.length;

      if (totalCount === 0) {
        continue;
      }

      const testEmail =
        process.env.TEST_EMAIL?.trim();

      const recipientEmail =
        testEmail ||
        mentorEmail;

      console.log(
        `[EMAIL SYSTEM] Sending report to ${recipientEmail}`
      );

      const response =
        await fetch(
          "https://api.brevo.com/v3/smtp/email",
          {
            method: "POST",

            headers: {
              accept:
                "application/json",

              "content-type":
                "application/json",

              "api-key":
                process.env.BREVO_API_KEY,
            },

            body: JSON.stringify({
              sender: {
                name:
                  "Kalvium Portfolio Management",

                email:
                  "kpm-squad@googlegroups.com",
              },

              to: [
                {
                  email:
                    recipientEmail,

                  name:
                    data.mentorName,
                },
              ],

              subject:
                "[KPM Report] - Daily Report: Squad(s) LeetCode Inactivity & Setup Summary",

              htmlContent: `
                <h3>
                  Hello ${data.mentorName},
                </h3>

                <p>
                  Here is the daily LeetCode
                  inactivity & profile setup
                  report for your squad(s):
                </p>

                <h4>
                  🚨 High Priority:
                  Inactive for 7+ Days
                  (${data.sevenDaysPlus.length})
                </h4>

                ${sevenDaysHtml}

                <h4>
                  ⚠️ Warning:
                  Inactive for 1–6 Days
                  (${data.oneToSixDays.length})
                </h4>

                ${oneToSixDaysHtml}

                <h4>
                  📝 Action Required:
                  LeetCode Profile Not Set
                  (${data.missingProfile.length})
                </h4>

                ${missingProfileHtml}

                <p>
                  Please reach out to your squad
                  members to keep them on track.
                </p>

                <p>
                  Regards,<br>
                  Kalvium Portfolio Management
                </p>
              `,
            }),
          }
        );

      if (!response.ok) {
        let errorData;

        try {
          errorData =
            await response.json();
        } catch {
          errorData =
            await response.text();
        }

        console.error(
          `[EMAIL ERROR] Brevo API failed for ${recipientEmail}:`,
          errorData
        );
      } else {
        console.log(
          `[EMAIL SENT] ${recipientEmail} | ${totalCount} student updates`
        );
      }
    }

    console.log(
      "[EMAIL SYSTEM] Finished notifications."
    );
  } catch (error) {
    console.error(
      "[EMAIL SYSTEM ERROR]",
      error
    );
  }
}

// ============================================================
// SYNC ONE LEETCODE PROFILE
// ============================================================

async function syncSingleLeetCodeProfile(
  profileId,
  userId,
  rawLeetCodeUrl,
  maxRetries = MAX_RETRIES
) {
  const username =
    extractUsername(
      rawLeetCodeUrl
    );

  console.log(
    "\n============================================================"
  );

  console.log(
    "[SYNC PROFILE]"
  );

  console.log(
    `Profile ID : ${profileId}`
  );

  console.log(
    `User ID    : ${userId}`
  );

  console.log(
    `Raw URL    : ${rawLeetCodeUrl}`
  );

  console.log(
    `Username   : ${username}`
  );

  console.log(
    "============================================================"
  );

  // ----------------------------------------------------------
  // VALIDATE
  // ----------------------------------------------------------

  if (
    !username ||
    !isValidLeetCodeUsername(
      username
    )
  ) {
    console.warn(
      "[INVALID LEETCODE USERNAME]",
      {
        profileId,
        rawLeetCodeUrl,
        username,
      }
    );

    return {
      status:
        "INVALID_URL",

      username:
        username ||
        rawLeetCodeUrl,
    };
  }

  // ----------------------------------------------------------
  // GRAPHQL
  // ----------------------------------------------------------

  const query = `
    query getUserStats(
      $username: String!
    ) {
      matchedUser(
        username: $username
      ) {
        username

        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }

        profile {
          ranking
        }
      }

      recentAcSubmissionList(
        username: $username
        limit: 20
      ) {
        id
        title
        titleSlug
        timestamp
        lang
        difficulty
      }
    }
  `;

  // ----------------------------------------------------------
  // RETRIES
  // ----------------------------------------------------------

  for (
    let attempt = 1;
    attempt <= maxRetries;
    attempt++
  ) {
    try {
      console.log(
        `[LEETCODE] ${username} | Request ${attempt}/${maxRetries}`
      );

      const response =
        await fetch(
          LEETCODE_GRAPHQL_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Referer:
                "https://leetcode.com",

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

      console.log(
        `[LEETCODE RESPONSE] ${username} | HTTP ${response.status}`
      );

      // ------------------------------------------------------
      // RATE LIMIT
      // ------------------------------------------------------

      if (
        response.status === 429 ||
        response.status >= 500
      ) {
        const backoffTime =
          attempt * 5000;

        console.warn(
          `[LEETCODE RETRY] ${username} | Waiting ${backoffTime}ms`
        );

        if (
          attempt < maxRetries
        ) {
          await delay(
            backoffTime
          );

          continue;
        }

        return {
          status:
            "HTTP_ERROR",

          username,

          httpCode:
            response.status,
        };
      }

      // ------------------------------------------------------
      // OTHER HTTP ERROR
      // ------------------------------------------------------

      if (!response.ok) {
        return {
          status:
            "HTTP_ERROR",

          username,

          httpCode:
            response.status,
        };
      }

      // ------------------------------------------------------
      // PARSE
      // ------------------------------------------------------

      const result =
        await response.json();

      // ------------------------------------------------------
      // GRAPHQL ERROR
      // ------------------------------------------------------

      if (result.errors) {
        console.error(
          `[LEETCODE GRAPHQL ERROR] ${username}`,
          result.errors
        );

        const errorMessage =
          result.errors[0]?.message ||
          "Unknown GraphQL error";

        const isRateLimited =
          result.errors.some(
            (error) => {
              const message =
                error.message
                  ?.toLowerCase() ||
                "";

              return (
                message.includes(
                  "rate"
                ) ||
                message.includes(
                  "many requests"
                )
              );
            }
          );

        if (
          isRateLimited &&
          attempt < maxRetries
        ) {
          await delay(
            attempt * 5000
          );

          continue;
        }

        return {
          status:
            "GRAPHQL_ERROR",

          username,

          error:
            errorMessage,

          details:
            result.errors,
        };
      }

      // ------------------------------------------------------
      // USER
      // ------------------------------------------------------

      const matchedUser =
        result?.data?.matchedUser;

      if (!matchedUser) {
        console.warn(
          `[LEETCODE USER NOT FOUND] ${username}`
        );

        return {
          status:
            "NOT_FOUND",

          username,
        };
      }

      // ------------------------------------------------------
      // STATS
      // ------------------------------------------------------

      const submitStats =
        matchedUser
          .submitStatsGlobal
          ?.acSubmissionNum ||
        [];

      const totalSolved =
        submitStats.find(
          (item) =>
            item.difficulty ===
            "All"
        )?.count || 0;

      const easySolved =
        submitStats.find(
          (item) =>
            item.difficulty ===
            "Easy"
        )?.count || 0;

      const mediumSolved =
        submitStats.find(
          (item) =>
            item.difficulty ===
            "Medium"
        )?.count || 0;

      const hardSolved =
        submitStats.find(
          (item) =>
            item.difficulty ===
            "Hard"
        )?.count || 0;

      const ranking =
        matchedUser.profile
          ?.ranking || 0;

      // Easy = 1
      // Medium = 1.5
      // Hard = 2

      const score =
        easySolved +
        mediumSolved * 1.5 +
        hardSolved * 2;

      console.log(
        "\n[LEETCODE STATS]"
      );

      console.log(
        `Username : ${matchedUser.username}`
      );

      console.log(
        `Total    : ${totalSolved}`
      );

      console.log(
        `Easy     : ${easySolved}`
      );

      console.log(
        `Medium   : ${mediumSolved}`
      );

      console.log(
        `Hard     : ${hardSolved}`
      );

      console.log(
        `Score    : ${score}`
      );

      // ------------------------------------------------------
      // RECENT SUBMISSIONS
      // ------------------------------------------------------

      const recentSubmissions =
        result?.data
          ?.recentAcSubmissionList ||
        [];

      let lastSolvedAt =
        null;

      if (
        recentSubmissions.length > 0 &&
        recentSubmissions[0]
          ?.timestamp
      ) {
        const unixSec =
          Number(
            recentSubmissions[0]
              .timestamp
          );

        if (
          !Number.isNaN(unixSec) &&
          unixSec > 0
        ) {
          lastSolvedAt =
            new Date(
              unixSec * 1000
            ).toISOString();
        }
      }

      // ------------------------------------------------------
      // SAVE SUBMISSIONS
      // ------------------------------------------------------

      const submissionResult =
        await saveLeetCodeSubmissions(
          userId,
          matchedUser.username,
          recentSubmissions
        );

      if (
        !submissionResult.success
      ) {
        console.warn(
          `[SUBMISSIONS WARNING] ${username} | Failed to save submissions`
        );
      }

      // ------------------------------------------------------
      // FALLBACK LAST SOLVED
      // ------------------------------------------------------

      if (!lastSolvedAt) {
        const {
          data: existingData,
          error: existingError,
        } = await supabaseAdmin
          .from(
            "leetcode_leaderboard"
          )
          .select(
            "last_solved_at"
          )
          .eq(
            "profile_id",
            profileId
          )
          .maybeSingle();

        if (existingError) {
          logSupabaseError(
            "Existing leaderboard lookup failed",
            existingError,
            {
              profileId,
              username,
            }
          );
        }

        lastSolvedAt =
          existingData?.last_solved_at ||
          null;
      }

      // ------------------------------------------------------
      // ACTIVE STATUS
      // ------------------------------------------------------

      const ONE_DAY_MS =
        24 * 60 * 60 * 1000;

      const lastSolvedTime =
        lastSolvedAt
          ? new Date(
              lastSolvedAt
            ).getTime()
          : NaN;

      const isLeetCodeActive =
        Number.isFinite(
          lastSolvedTime
        ) &&
        Date.now() -
          lastSolvedTime <=
          ONE_DAY_MS;

      // ------------------------------------------------------
      // CHECK PENDING REVIEWS
      // ------------------------------------------------------

      const {
        data: pendingReviews,
        error:
          pendingReviewError,
      } = await supabaseAdmin
        .from(
          "leetcode_submissions"
        )
        .select("id")
        .eq(
          "user_id",
          userId
        )
        .eq(
          "review_status",
          "pending"
        )
        .limit(1);

      if (pendingReviewError) {
        logSupabaseError(
          "Checking pending reviews",
          pendingReviewError,
          {
            userId,
            profileId,
            username,
          }
        );

        // Do not accidentally unsuspend
        return {
          status:
            "DB_ERROR",

          username,

          error:
            pendingReviewError.message,
        };
      }

      const hasPendingReviews =
        Array.isArray(
          pendingReviews
        ) &&
        pendingReviews.length > 0;

      const isSuspended =
        hasPendingReviews;

      const suspensionReason =
        isSuspended
          ? "Pending mentor review for suspicious submission patterns"
          : null;

      // ------------------------------------------------------
      // LEADERBOARD UPSERT
      // ------------------------------------------------------

      const upsertPayload = {
        profile_id:
          profileId,

        user_id:
          userId,

        leetcode_username:
          matchedUser.username,

        easy_solved:
          easySolved,

        medium_solved:
          mediumSolved,

        hard_solved:
          hardSolved,

        total_solved:
          totalSolved,

        ranking,

        score,

        updated_at:
          new Date().toISOString(),

        last_solved_at:
          lastSolvedAt,

        is_leetcode_active:
          isLeetCodeActive,

        is_suspended:
          isSuspended,

        suspension_reason:
          suspensionReason,
      };

      console.log(
        `[DB UPSERT] ${username} | Updating leetcode_leaderboard...`
      );

      const {
        data: savedData,
        error: dbError,
      } = await supabaseAdmin
        .from(
          "leetcode_leaderboard"
        )
        .upsert(
          upsertPayload,
          {
            onConflict:
              "profile_id",
          }
        )
        .select()
        .single();

      if (dbError) {
        logSupabaseError(
          "Leaderboard upsert failed",
          dbError,
          {
            profileId,
            userId,
            username,
            isSuspended,
            suspensionReason,
          }
        );

        if (
          attempt < maxRetries
        ) {
          await delay(2000);
          continue;
        }

        return {
          status:
            "DB_ERROR",

          username,

          error:
            dbError.message,
        };
      }

      // ------------------------------------------------------
      // VERIFY
      // ------------------------------------------------------

      const {
        data:
          verifiedLeaderboard,
        error: verifyError,
      } = await supabaseAdmin
        .from(
          "leetcode_leaderboard"
        )
        .select(`
          profile_id,
          user_id,
          leetcode_username,
          score,
          is_suspended,
          suspension_reason
        `)
        .eq(
          "profile_id",
          profileId
        )
        .maybeSingle();

      if (verifyError) {
        logSupabaseError(
          "Leaderboard verification failed",
          verifyError,
          {
            profileId,
            username,
          }
        );
      } else {
        console.log(
          `[DB VERIFY] ${username} | ` +
            `score=${verifiedLeaderboard?.score} | ` +
            `suspended=${verifiedLeaderboard?.is_suspended} | ` +
            `reason=${verifiedLeaderboard?.suspension_reason || "none"}`
        );
      }

      console.log(
        `[DB SUCCESS] ${username} | ` +
          `Score: ${score} | ` +
          `Suspended: ${isSuspended}`
      );

      return {
        status:
          "SUCCESS",

        username:
          matchedUser.username,

        isActive:
          isLeetCodeActive,

        score,

        isSuspended,

        suspensionReason,

        saved:
          Boolean(savedData),
      };
    } catch (error) {
      console.error(
        `[SYNC EXCEPTION] ${username}`,
        error
      );

      if (
        attempt < maxRetries
      ) {
        await delay(
          attempt * 3000
        );

        continue;
      }

      return {
        status:
          "NETWORK_ERROR",

        username,

        error:
          error.message,
      };
    }
  }

  return {
    status:
      "FAILED",

    username,

    error:
      "Maximum retry attempts exceeded",
  };
}

// ============================================================
// UPDATE LEETCODE LEADERBOARD
// ============================================================

router.post(
  "/update-leetcode",
  async (req, res) => {
    // --------------------------------------------------------
    // AUTH
    // --------------------------------------------------------

    const authHeader =
      req.headers.authorization;

    if (
      authHeader !==
      `Bearer ${process.env.CRON_SECRET}`
    ) {
      console.error(
        "[AUTH FAILED] Invalid CRON_SECRET"
      );

      return res.status(401).json({
        error:
          "Unauthorized",
      });
    }

    console.log(
      "[AUTH SUCCESS] Cron request authenticated."
    );

    // --------------------------------------------------------
    // RESPOND IMMEDIATELY
    // --------------------------------------------------------

    res.status(200).json({
      message:
        "Leaderboard update process started in background.",
    });

    // --------------------------------------------------------
    // BACKGROUND PROCESS
    // --------------------------------------------------------

    try {
      let users = null;
      let fetchError = null;

      // ------------------------------------------------------
      // FETCH PROFILES
      // ------------------------------------------------------

      for (
        let attempt = 1;
        attempt <= 3;
        attempt++
      ) {
        const {
          data,
          error,
        } = await supabaseAdmin
          .from("profiles")
          .select(`
            id,
            user_id,
            leetcode
          `)
          .not(
            "user_id",
            "is",
            null
          )
          .not(
            "leetcode",
            "is",
            null
          )
          .neq(
            "leetcode",
            ""
          );

        if (!error) {
          users = data;
          break;
        }

        fetchError = error;

        logSupabaseError(
          `Profiles fetch attempt ${attempt}`,
          error
        );

        if (
          attempt < 3
        ) {
          await delay(2000);
        }
      }

      if (!users) {
        console.error(
          "[CRON FATAL] Unable to fetch profiles."
        );

        console.error(
          fetchError
        );

        return;
      }

      console.log(
        `[PROFILE FETCH SUCCESS] Found ${users.length} profiles.`
      );

      // ------------------------------------------------------
      // SYNC EVERY STUDENT
      // ------------------------------------------------------

      for (
        let index = 0;
        index < users.length;
        index++
      ) {
        const user =
          users[index];

        console.log(
          `\n[SYNC PROGRESS] ${
            index + 1
          }/${users.length}`
        );

        const result =
          await syncSingleLeetCodeProfile(
            user.id,
            user.user_id,
            user.leetcode
          );

        console.log(
          `[SYNC RESULT] ${user.leetcode} | ${result.status}`
        );

        await delay(
          getRandomDelay()
        );
      }

      // ------------------------------------------------------
      // EMAIL REPORT
      // ------------------------------------------------------

      await notifyMentorsAboutInactiveStudents();

      console.log(
        `\nFinished: ${new Date().toISOString()}`
      );

      console.log(
        "============================================================"
      );
    } catch (error) {
      console.error(
        "\n[CRON FATAL EXCEPTION]"
      );

      console.error({
        message:
          error.message,

        stack:
          error.stack,
      });
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

export default router;