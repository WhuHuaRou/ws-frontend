import { dashboardMock } from "../mocks/dashboard";
import { listCowBasics } from "./cowBasic";
import type { DashboardData } from "../types/dashboard";

export async function getDashboardData(): Promise<DashboardData> {
  const cows = await listCowBasics();
  return { ...dashboardMock, cows };
}
