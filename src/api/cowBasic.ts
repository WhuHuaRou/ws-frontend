import type { CowBasic } from "../types/dashboard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface CowBasicCreateInput {
  cowNo: string;
  cowName: string;
  breed: string;
  gender: string;
  birthDate: string;
  farmName: string;
  penNo: string;
  status: string;
  remark: string;
}

interface CowBasicRow {
  id?: number | string;
  cowNo?: string;
  cowName?: string | null;
  breed?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  farmName?: string | null;
  penNo?: string | null;
  status?: string | null;
  remark?: string | null;
}

interface TableDataResponse {
  code?: number;
  msg?: string | null;
  rows?: CowBasicRow[];
}

interface AjaxResponse {
  code?: number;
  msg?: string | null;
  data?: CowBasicRow;
}

export async function listCowBasics(cowNo = ""): Promise<CowBasic[]> {
  const params = new URLSearchParams({
    pageNum: "1",
    pageSize: "200",
  });
  if (cowNo.trim()) {
    params.set("cowNo", cowNo.trim());
  }

  const response = await fetch(`${API_BASE_URL}/cow/basic/list?${params.toString()}`, {
    headers: buildJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error("牛只档案接口暂时不可用");
  }

  const result = (await response.json()) as TableDataResponse;
  if (result.code !== undefined && result.code !== 0) {
    throw new Error(result.msg || "牛只档案接口返回异常");
  }

  return (result.rows ?? []).map(mapCowBasicRow);
}

export async function createCowBasic(input: CowBasicCreateInput): Promise<CowBasic> {
  const response = await fetch(`${API_BASE_URL}/cow/basic/add`, {
    method: "POST",
    headers: buildJsonHeaders(),
    body: JSON.stringify({
      cowNo: input.cowNo.trim(),
      cowName: input.cowName.trim(),
      breed: input.breed.trim(),
      gender: input.gender,
      birthDate: input.birthDate.trim() || undefined,
      farmName: input.farmName.trim(),
      penNo: input.penNo.trim(),
      status: input.status,
      remark: input.remark.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error("新增牛只接口暂时不可用");
  }

  const result = (await response.json()) as AjaxResponse;
  if (result.code !== undefined && result.code !== 0) {
    throw new Error(result.msg || "新增牛只失败");
  }

  return mapCowBasicRow({
    ...input,
    cowNo: input.cowNo.trim(),
    cowName: input.cowName.trim(),
    breed: input.breed.trim(),
    farmName: input.farmName.trim(),
    penNo: input.penNo.trim(),
    remark: input.remark.trim(),
    ...result.data,
  });
}

function buildJsonHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: localStorage.getItem("token") ? `Bearer ${localStorage.getItem("token")}` : "",
  };
}

function mapCowBasicRow(row: CowBasicRow): CowBasic {
  const genderCode = row.gender || "0";
  const statusCode = row.status || "0";

  return {
    id: row.id === undefined ? undefined : String(row.id),
    cowNo: row.cowNo || "",
    cowName: row.cowName || "",
    breed: row.breed || "",
    gender: formatGender(genderCode),
    genderCode,
    birthDate: row.birthDate || "",
    farmName: row.farmName || "",
    penNo: row.penNo || "",
    status: formatStatus(statusCode),
    statusCode,
    remark: row.remark || "",
  };
}

function formatGender(gender?: string | null) {
  if (gender === "1") {
    return "公";
  }
  if (gender === "2") {
    return "母";
  }
  return "未知";
}

function formatStatus(status?: string | null) {
  if (status === "1") {
    return "停用";
  }
  return "正常";
}
