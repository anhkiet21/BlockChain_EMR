import { expect, test, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";
import { Contract, Interface, JsonRpcProvider, Wallet, parseEther, ZeroHash } from "ethers";

const PASSWORD = "password123";
const CONTRACT_ADDRESS = process.env.E2E_CONTRACT_ADDRESS ?? "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ANVIL_FUNDER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const REGISTRY_ABI = [
  "function createRecordWithMetadata(address patient,string cid,bytes32 contentHash,uint8 sourceType,bytes32 facilityId) returns (uint256)",
  "event RecordCreated(uint256 indexed recordId,address indexed patient,address indexed author,string cid,bytes32 contentHash,uint256 previousRecordId)",
] as const;

type Session = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: number;
    fullName: string;
    roles: string[];
    wallets: string[];
  };
};

async function data<T>(response: APIResponse): Promise<T> {
  const payload = await response.json();
  expect(response.ok(), JSON.stringify(payload)).toBeTruthy();
  expect(payload.success, JSON.stringify(payload)).toBe(true);
  return payload.data as T;
}

async function loginApi(
  request: APIRequestContext,
  credentials: { email?: string; identityNumber?: string },
) {
  return data<Session>(await request.post("/api/auth/login", {
    data: { ...credentials, password: PASSWORD },
  }));
}

async function linkWallet(request: APIRequestContext, session: Session, wallet: Wallet) {
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const nonce = await data<{ message: string }>(await request.post("/api/auth/wallet/nonce", {
    headers,
    data: { address: wallet.address },
  }));
  const signature = await wallet.signMessage(nonce.message);
  await data(await request.post("/api/auth/wallet/verify", {
    headers,
    data: { address: wallet.address, signature },
  }));
  return wallet;
}

async function setSession(page: Page, session: Session) {
  await page.goto("/");
  await page.evaluate((value) => {
    sessionStorage.setItem("emr.session", JSON.stringify(value));
  }, session);
}

async function loginThroughUi(page: Page, identifier: string) {
  await page.goto("/login");
  await page.locator("form input").first().fill(identifier);
  await page.locator('form input[type="password"]').fill(PASSWORD);
  await page.locator("form .btn-primary").click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

function uniqueDigits() {
  return `9${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 9)}`;
}

async function registerPatient(request: APIRequestContext, identityNumber: string, suffix: string) {
  return data<Session>(await request.post("/api/auth/register/patient", {
    data: {
      identityNumber,
      password: PASSWORD,
      fullName: `E2E Patient ${suffix}`,
      dateOfBirth: "1995-06-15",
      gender: "MALE",
      phoneNumber: `+849${suffix.replace(/\D/g, "").slice(-8).padStart(8, "0")}`,
      address: "Ho Chi Minh City",
    },
  }));
}

async function registerVerifiedDoctor(
  request: APIRequestContext,
  identityNumber: string,
  suffix: string,
  wallet: Wallet,
) {
  let doctorSession = await data<Session>(await request.post("/api/auth/register/doctor", {
    data: {
      identityNumber,
      password: PASSWORD,
      fullName: `E2E Doctor Record ${suffix}`,
      dateOfBirth: "1985-03-20",
      gender: "FEMALE",
      phoneNumber: `+848${suffix.replace(/\D/g, "").slice(-8).padStart(8, "0")}`,
      licenseNumber: `E2E-RECORD-LIC-${suffix}`,
      facilityId: "BV001",
    },
  }));
  await linkWallet(request, doctorSession, wallet);
  const doctorHeaders = { Authorization: `Bearer ${doctorSession.accessToken}` };
  const profile = await data<{ id: number }>(await request.get("/api/doctors/me", { headers: doctorHeaders }));
  const adminSession = await loginApi(request, { email: "admin@test.local" });
  await data(await request.post(`/api/admin/doctors/${profile.id}/verify`, {
    headers: { Authorization: `Bearer ${adminSession.accessToken}` },
  }));
  doctorSession = await loginApi(request, { identityNumber });
  return doctorSession;
}

test("doctor rejection updates doctor UI and admin audit", async ({ page, request }) => {
  const identityNumber = uniqueDigits();
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const doctorName = `E2E Doctor ${suffix}`;
  const licenseNumber = `E2E-LIC-${suffix}`;
  const reason = `E2E rejection ${suffix}`;

  const doctorSession = await data<Session>(await request.post("/api/auth/register/doctor", {
    data: {
      identityNumber,
      password: PASSWORD,
      fullName: doctorName,
      dateOfBirth: "1985-03-20",
      gender: "MALE",
      phoneNumber: "+84901112223",
      licenseNumber,
      facilityId: "BV001",
    },
  }));

  await loginThroughUi(page, "admin@test.local");
  await page.goto("/admin");
  const doctorRow = page.locator("tr", { hasText: licenseNumber });
  await expect(doctorRow).toBeVisible();
  await doctorRow.getByRole("button", { name: "Từ chối" }).click();
  const rejectDialog = page.getByRole("dialog", { name: "Từ chối xác thực bác sĩ" });
  await rejectDialog.getByLabel("Lý do từ chối").fill(reason);
  await rejectDialog.getByRole("button", { name: "Xác nhận từ chối" }).click();
  await expect(page.getByText("Đã từ chối hồ sơ bác sĩ.")).toBeVisible();
  await expect(doctorRow).toHaveCount(0);

  await page.getByRole("button", { name: /Nhật ký hệ thống/ }).click();
  const auditRow = page.locator("tr", { hasText: reason });
  await expect(auditRow).toContainText("Từ chối bác sĩ");
  await expect(auditRow).toContainText(doctorName);
  await expect(auditRow).toContainText("Không áp dụng");

  await setSession(page, doctorSession);
  await page.goto("/doctor/records");
  await expect(page.getByText(/Đã bị từ chối ·/)).toBeVisible();
  await expect(page.getByText(reason)).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByText("Chưa liên kết ví", { exact: true })).toBeVisible();
  await expect(page.getByText("Ví đã xác minh trong tài khoản", { exact: true })).toHaveCount(0);
  await expect(page.getByText(reason)).toBeVisible();
});

test("facility codes show matching database and blockchain state", async ({ page }) => {
  await loginThroughUi(page, "admin@test.local");
  await page.goto("/admin");
  await page.getByRole("button", { name: /Cơ sở y tế/ }).click();

  const facilityRow = page.locator("tr", { hasText: "BV001" });
  await expect(facilityRow).toBeVisible();
  await expect(facilityRow.getByText("Đang hoạt động")).toHaveCount(2);
  await expect(facilityRow.getByText("Đã đồng bộ")).toBeVisible();
});

test("patient ends emergency access and reads record identifiers without MySQL", async ({ page, request }) => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const patientIdentity = uniqueDigits();
  let doctorIdentity = uniqueDigits();
  while (doctorIdentity === patientIdentity) doctorIdentity = uniqueDigits();
  const provider = new JsonRpcProvider("http://localhost:8545");
  const funder = new Wallet(ANVIL_FUNDER_PRIVATE_KEY, provider);
  const patientWallet = new Wallet(Wallet.createRandom().privateKey);
  const doctorWallet = new Wallet(Wallet.createRandom().privateKey);
  const fundingNonce = await provider.getTransactionCount(funder.address, "pending");
  await (await funder.sendTransaction({
    to: patientWallet.address,
    value: parseEther("1"),
    nonce: fundingNonce,
  })).wait();
  await (await funder.sendTransaction({
    to: doctorWallet.address,
    value: parseEther("1"),
    nonce: fundingNonce + 1,
  })).wait();

  let patientSession = await registerPatient(request, patientIdentity, suffix);
  await linkWallet(request, patientSession, patientWallet);
  const doctorSession = await registerVerifiedDoctor(request, doctorIdentity, suffix, doctorWallet);
  patientSession = await loginApi(request, { identityNumber: patientIdentity });

  const patientHeaders = { Authorization: `Bearer ${patientSession.accessToken}` };
  const doctorHeaders = { Authorization: `Bearer ${doctorSession.accessToken}` };

  const caseCode = `E2E-ER-${suffix}`;
  await data(await request.post("/api/doctor/emergency-access", {
    headers: doctorHeaders,
    data: {
      patientIdentifier: patientIdentity,
      caseCode,
      reason: "E2E emergency access",
      durationMinutes: 60,
    },
  }));

  const fileName = `e2e-record-${suffix}.json`;
  const pending = await data<{
    medicalFileId: number;
    cid: string;
    contentHash: string;
    patientWallet: string;
  }>(await request.post("/api/patient/records", {
    headers: patientHeaders,
    multipart: {
      file: {
        name: fileName,
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify({ source: "playwright", suffix })),
      },
    },
  }));

  const contract = new Contract(CONTRACT_ADDRESS, REGISTRY_ABI, patientWallet.connect(provider));
  const contentHash = pending.contentHash.startsWith("0x")
    ? pending.contentHash
    : `0x${pending.contentHash}`;
  const transaction = await contract.createRecordWithMetadata(
    pending.patientWallet,
    pending.cid,
    contentHash,
    1,
    ZeroHash,
  );
  const receipt = await transaction.wait();
  expect(receipt).not.toBeNull();
  const parser = new Interface(REGISTRY_ABI);
  const event = receipt!.logs
    .map((log) => {
      try {
        return parser.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((item) => item?.name === "RecordCreated");
  expect(event).toBeTruthy();
  const onChainRecordId = event!.args.recordId.toString();

  const record = await data<{
    recordId: number;
    blockchainTxHash: string;
    onChainRecordId: string | number;
  }>(await request.post("/api/patient/records/confirm", {
    headers: patientHeaders,
    data: {
      medicalFileId: pending.medicalFileId,
      onChainRecordId,
      transactionHash: receipt!.hash,
    },
  }));

  await loginThroughUi(page, patientIdentity);
  await page.goto("/patient/records");
  const emergencyCard = page.locator("article", { hasText: caseCode });
  await expect(emergencyCard).toContainText("Còn hiệu lực");
  const endReason = `E2E patient ended ${suffix}`;
  await emergencyCard.getByRole("button", { name: "Kết thúc quyền khẩn cấp" }).click();
  const endDialog = page.getByRole("dialog", { name: "Kết thúc quyền truy cập khẩn cấp" });
  await endDialog.getByLabel("Lý do kết thúc").fill(endReason);
  await endDialog.getByRole("button", { name: "Kết thúc quyền", exact: true }).click();
  await expect(emergencyCard).toContainText("Đã kết thúc");
  await expect(emergencyCard).toContainText(endReason);
  await expect(emergencyCard.getByRole("button", { name: "Kết thúc quyền khẩn cấp" })).toHaveCount(0);

  const recordRow = page.locator("tr", { hasText: fileName });
  await recordRow.getByRole("button", { name: "Xem mã hồ sơ" }).click();
  const detail = page.locator("section.card", { hasText: fileName }).last();
  await expect(detail).toContainText("Mã hồ sơ hệ thống (recordId)");
  await expect(detail).toContainText(String(record.recordId));
  await expect(detail).toContainText("Mã hồ sơ blockchain (onChainRecordId)");
  await expect(detail).toContainText(String(record.onChainRecordId));
  await expect(detail).toContainText("Mã giao dịch (transactionHash)");
  await expect(detail).toContainText(record.blockchainTxHash);
  await expect(detail).toContainText("không cần truy cập MySQL");
  await detail.getByRole("link", { name: "Kiểm tra hồ sơ trên blockchain" }).click();
  await expect(page).toHaveURL(new RegExp(`/blockchain\\?recordIdType=blockchain&recordId=${record.onChainRecordId}$`));
  await expect(page.getByText(`Đã đối chiếu hồ sơ blockchain #${record.onChainRecordId}.`)).toBeVisible();
  await expect(page.getByText("Tồn tại · phiên bản hiện hành")).toBeVisible();
  await expect(page.getByText("Không có · đây là phiên bản đầu")).toBeVisible();
  await expect(page.getByText(String(record.onChainRecordId), { exact: true })).toBeVisible();

  const adminSession = await loginApi(request, { email: "admin@test.local" });
  await setSession(page, adminSession);
  await page.goto("/admin");
  await page.getByRole("button", { name: /Nhật ký hệ thống/ }).click();
  await page.locator(".admin-search input").fill(fileName);
  const adminRecordRow = page.locator("tr", { hasText: fileName });
  await expect(adminRecordRow).toContainText(`DB #${record.recordId}`);
  await expect(adminRecordRow).toContainText(`On-chain #${record.onChainRecordId}`);
  const transactionButton = adminRecordRow.locator("button.admin-tx");
  await expect(transactionButton).toHaveAttribute("title", record.blockchainTxHash);
  await transactionButton.click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(record.blockchainTxHash);
});
