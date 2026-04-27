import { dashboardMock } from "../mocks/dashboard";
import type { DashboardData } from "../types/dashboard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getDashboardData(): Promise<DashboardData> {
  if (!API_BASE_URL) {
    return simulateRequest(dashboardMock);
  }

  const response = await fetch(`${API_BASE_URL}/dashboard/overview`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token") ? `Bearer ${localStorage.getItem("token")}` : "",
    },
  });

  if (!response.ok) {
    throw new Error("数据服务暂时不可用");
  }

  const result = await response.json();
  if (result.code && result.code !== 200) {
    throw new Error(result.msg || "业务接口返回异常");
  }

  return result.data ?? result;
}

function simulateRequest<T>(data: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 360);
  });
}
