import apiClient from "../../config/app";
import jwt from "../../Helpers/jwt";

// ============================================================
// GET MENTOR REVIEW QUEUE
// ============================================================

export async function getMentorReviewQueue() {
  const token = await jwt();

  if (!token) {
    throw new Error(
      "No active session found"
    );
  }

  try {
    const response =
      await apiClient.get(
        "/mentor/dashboard/leetcode-review/queue",
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    console.log(
      "[MENTOR REVIEW QUEUE RESPONSE]",
      response.data
    );

    return response.data;
  } catch (error) {
    console.error(
      "[MENTOR REVIEW QUEUE ERROR]",
      error?.response?.data ||
        error?.message
    );

    throw error;
  }
}

// ============================================================
// APPROVE
// ============================================================

export async function approveMentorReview(
  studentUserId
) {
  if (!studentUserId) {
    throw new Error(
      "Student user ID is required"
    );
  }

  const token = await jwt();

  if (!token) {
    throw new Error(
      "No active session found"
    );
  }

  try {
    const response =
      await apiClient.patch(
        `/mentor/dashboard/leetcode-review/${encodeURIComponent(
          studentUserId
        )}/approve`,
        {},
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    console.log(
      "[MENTOR APPROVE RESPONSE]",
      response.data
    );

    return response.data;
  } catch (error) {
    console.error(
      "[APPROVE MENTOR REVIEW ERROR]",
      error?.response?.data ||
        error?.message
    );

    throw error;
  }
}

// ============================================================
// REJECT
// ============================================================

export async function rejectMentorReview(
  studentUserId
) {
  if (!studentUserId) {
    throw new Error(
      "Student user ID is required"
    );
  }

  const token = await jwt();

  if (!token) {
    throw new Error(
      "No active session found"
    );
  }

  try {
    const response =
      await apiClient.patch(
        `/mentor/dashboard/leetcode-review/${encodeURIComponent(
          studentUserId
        )}/reject`,
        {},
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    console.log(
      "[MENTOR REJECT RESPONSE]",
      response.data
    );

    return response.data;
  } catch (error) {
    console.error(
      "[REJECT MENTOR REVIEW ERROR]",
      error?.response?.data ||
        error?.message
    );

    throw error;
  }
}