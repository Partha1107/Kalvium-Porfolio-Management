import apiClient from "../../config/app";
import jwt from "../../Helpers/jwt";

export async function getSquads() {
  const token = await jwt();
  if (!token) {
    console.error("No active session found");
    return [];
  }

  try {
    const response = await apiClient.get("/mentor/dashboard/getsquads", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.squads;
  } catch (error) {
    console.error("Error fetching squads:", error);
    throw error;
  }
}

export async function saveSquad(squads) {
  const token = await jwt();
  if (!token) {
    console.error("No active session found");
    return;
  }

  try {
    const response = await apiClient.post(
      "/mentor/dashboard/savesquad",
      { squads },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error saving squad:", error);
    throw error;
  }
}


export async function getStudents(squadId = null) {
  const token = await jwt();
  if (!token) {
    console.error("No active session found");
    return [];
  }

  try {
    const response = await apiClient.get("/mentor/dashboard/students", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: squadId ? { squad_id: squadId } : {},
    });

    return response.data.students || [];
  } catch (error) {
    console.error("Error fetching students:", error);
    throw error;
  }
}