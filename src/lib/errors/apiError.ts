import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public readonly stage: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorResponse(
  stage: string,
  message: string,
  details?: unknown,
  status = 500
) {
  return NextResponse.json(
    { success: false, stage, message, details: details ?? {} },
    { status }
  );
}
