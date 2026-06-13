export function friendlyErrorMessage(error: unknown, fallback: string): string {
  const message = extractMessage(error);
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (isWalletRejection(normalized)) {
    return "Bạn đã từ chối giao dịch trên MetaMask.";
  }

  if (message.trim().startsWith("{")) {
    const parsed = extractJsonMessage(message);
    return parsed ? friendlyErrorMessage(parsed, fallback) : fallback;
  }

  if (message.length > 240 && (normalized.includes("metamask") || normalized.includes("sendtransaction"))) {
    return "Giao dịch thất bại. Vui lòng kiểm tra MetaMask và thử lại.";
  }

  return message;
}

function extractMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

function isWalletRejection(message: string) {
  return message.includes("action_rejected")
    || message.includes("user rejected")
    || message.includes("ethers-user-denied")
    || message.includes("reason=\"rejected\"")
    || message.includes("reason=rejected")
    || message.includes("\"code\": 4001")
    || message.includes("\"code\":4001")
    || message.includes("code=4001");
}

function extractJsonMessage(message: string) {
  try {
    const parsed = JSON.parse(message) as { error?: { message?: string }; message?: string };
    return parsed.error?.message ?? parsed.message ?? "";
  } catch {
    return "";
  }
}
