import React, {
  useEffect,
  useState,
} from "react";

import {
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

import {
  getMentorReviewQueue,
  approveMentorReview,
  rejectMentorReview,
} from "../../api/routes/Mentor/review";

import "./MentorReview.css";

const MentorReview = () => {
  const [reviews, setReviews] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [processingStudentId, setProcessingStudentId] =
    useState(null);

  // ============================================================
  // LOAD REVIEW QUEUE
  // ============================================================

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await getMentorReviewQueue();

      console.log(
        "[MENTOR REVIEW QUEUE]",
        data
      );

      setReviews(
        Array.isArray(
          data?.reviews
        )
          ? data.reviews
          : []
      );
    } catch (err) {
      console.error(
        "[MENTOR REVIEW LOAD ERROR]",
        err
      );

      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load mentor review queue";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  // ============================================================
  // APPROVE
  // ============================================================

  const handleApprove = async (
    student
  ) => {
    if (
      !student?.student_user_id
    ) {
      setError(
        "Student user ID is missing"
      );

      return;
    }

    try {
      setError("");

      setProcessingStudentId(
        student.student_user_id
      );

      await approveMentorReview(
        student.student_user_id
      );

      setReviews((prev) =>
        prev.filter(
          (item) =>
            String(
              item.student_user_id
            ) !==
            String(
              student.student_user_id
            )
        )
      );
    } catch (err) {
      console.error(
        "[APPROVE ERROR]",
        err
      );

      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to approve review";

      setError(message);
    } finally {
      setProcessingStudentId(
        null
      );
    }
  };

  // ============================================================
  // REJECT
  // ============================================================

  const handleReject = async (
    student
  ) => {
    if (
      !student?.student_user_id
    ) {
      setError(
        "Student user ID is missing"
      );

      return;
    }

    try {
      setError("");

      setProcessingStudentId(
        student.student_user_id
      );

      await rejectMentorReview(
        student.student_user_id
      );

      setReviews((prev) =>
        prev.filter(
          (item) =>
            String(
              item.student_user_id
            ) !==
            String(
              student.student_user_id
            )
        )
      );
    } catch (err) {
      console.error(
        "[REJECT ERROR]",
        err
      );

      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to reject review";

      setError(message);
    } finally {
      setProcessingStudentId(
        null
      );
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="mentor-review-page">
        <h1>
          Mentor Review
        </h1>

        <p>
          Loading review queue...
        </p>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="mentor-review-page">

      {/* HEADER */}

      <div className="review-header">

        <div>
          <h1>
            Mentor Review
          </h1>

          <p>
            Review suspicious rapid
            LeetCode solves before
            awarding leaderboard
            points.
          </p>
        </div>

        <div className="review-count">

          <Clock size={18} />

          {reviews.length} Pending

        </div>

      </div>

      {/* ERROR */}

      {error && (
        <div className="review-error">

          <AlertTriangle size={18} />

          <span>
            {error}
          </span>

        </div>
      )}

      {/* EMPTY */}

      {reviews.length === 0 ? (
        <div className="empty-review">

          <CheckCircle size={45} />

          <h2>
            No reviews pending
          </h2>

          <p>
            All assigned students
            are currently clear.
          </p>

        </div>
      ) : (

        <div className="review-list">

          {reviews.map(
            (student) => {

              // IMPORTANT:
              // Backend returns pending_submissions

              const submissions =
                Array.isArray(
                  student.pending_submissions
                )
                  ? student.pending_submissions
                  : [];

              const isProcessing =
                String(
                  processingStudentId
                ) ===
                String(
                  student.student_user_id
                );

              return (
                <div
                  className="review-card"
                  key={
                    student.student_user_id
                  }
                >

                  {/* STUDENT */}

                  <div className="review-student">

                    <div className="review-avatar">

                      {student.name
                        ? student.name
                            .charAt(0)
                            .toUpperCase()
                        : "S"}

                    </div>

                    <div>

                      <h3>
                        {student.name ||
                          "Student"}
                      </h3>

                      <p>
                        @
                        {student.leetcode_username ||
                          "unknown"}
                      </p>

                      <span>
                        {student.squad_id
                          ? `Squad ${student.squad_id}`
                          : `Student ID: ${student.student_user_id}`}
                      </span>

                    </div>

                  </div>

                  {/* WARNING */}

                  <div className="review-warning">

                    <AlertTriangle size={18} />

                    <div>

                      <strong>
                        Mentor verification required
                      </strong>

                      <p>
                        {
                          student.pending_review_count ??
                          submissions.length
                        }{" "}
                        submission(s)
                        require mentor
                        verification.
                      </p>

                      {/* SUBMISSIONS */}

                      {submissions.map(
                        (submission) => (
                          <div
                            key={
                              submission.id ||
                              submission.submission_id
                            }
                            className="review-reason"
                          >

                            <strong>
                              {submission.title_slug ||
                                "Unknown problem"}
                            </strong>

                            <span>
                              {submission.flag_reason ||
                                "Suspicious submission pattern detected"}
                            </span>

                            {submission.difficulty && (
                              <small>
                                Difficulty:{" "}
                                {
                                  submission.difficulty
                                }
                              </small>
                            )}

                            {submission.submitted_at && (
                              <small>
                                {new Date(
                                  submission.submitted_at
                                ).toLocaleString()}
                              </small>
                            )}

                          </div>
                        )
                      )}

                    </div>

                  </div>

                  {/* STATS */}

                  <div className="review-stats">

                    <div>
                      <strong>
                        {student.easy_solved ??
                          0}
                      </strong>

                      <span>
                        Easy
                      </span>
                    </div>

                    <div>
                      <strong>
                        {student.medium_solved ??
                          0}
                      </strong>

                      <span>
                        Medium
                      </span>
                    </div>

                    <div>
                      <strong>
                        {student.hard_solved ??
                          0}
                      </strong>

                      <span>
                        Hard
                      </span>
                    </div>

                    <div>
                      <strong>
                        {student.score ??
                          0}
                      </strong>

                      <span>
                        Points
                      </span>
                    </div>

                  </div>

                  {/* ACTIONS */}

                  <div className="review-actions">

                    <button
                      type="button"
                      className="review-btn approve"
                      disabled={
                        isProcessing
                      }
                      onClick={() =>
                        handleApprove(
                          student
                        )
                      }
                    >

                      <CheckCircle
                        size={16}
                      />

                      {isProcessing
                        ? "Processing..."
                        : "Approve"}

                    </button>

                    <button
                      type="button"
                      className="review-btn reject"
                      disabled={
                        isProcessing
                      }
                      onClick={() =>
                        handleReject(
                          student
                        )
                      }
                    >
                      Reject
                    </button>

                  </div>

                </div>
              );
            }
          )}

        </div>
      )}

    </div>
  );
};

export default MentorReview;