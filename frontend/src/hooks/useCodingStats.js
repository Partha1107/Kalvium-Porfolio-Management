import { useState, useEffect } from "react";
import { getGitHubStats, getLeetCodeStats } from "../api/routes/StudentDashboard/dashboard";

export const useCodingStats = (githubUser, leetcodeUser) => {
  const [stats, setStats] = useState({
    github: null,
    leetcode: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If neither username exists, reset stats
    if (!githubUser && !leetcodeUser) {
      setStats({ github: null, leetcode: null });
      return;
    }

    let isMounted = true;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const [ghRes, lcRes] = await Promise.allSettled([
          githubUser ? getGitHubStats(githubUser) : Promise.resolve(null),
          leetcodeUser ? getLeetCodeStats(leetcodeUser) : Promise.resolve(null),
        ]);

        if (isMounted) {
          setStats({
            github: ghRes.status === "fulfilled" ? ghRes.value?.data || ghRes.value : null,
            leetcode: lcRes.status === "fulfilled" ? lcRes.value?.data || lcRes.value : null,
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to fetch student statistics");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false; 
    };
  }, [githubUser, leetcodeUser]);

  return { ...stats, loading, error };
};