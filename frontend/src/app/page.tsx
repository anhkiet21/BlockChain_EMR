"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession, Session } from "@/lib/api/client";

const BENEFITS = [
  {
    title: "Hồ sơ tập trung",
    text: "Người bệnh quản lý và theo dõi hồ sơ y tế trong một không gian thống nhất.",
    icon: "record",
  },
  {
    title: "Quyền truy cập minh bạch",
    text: "Bệnh nhân chủ động cấp hoặc thu hồi quyền truy cập cho từng cơ sở y tế.",
    icon: "shield",
  },
  {
    title: "Dữ liệu có thể xác minh",
    text: "Thông tin hồ sơ và lịch sử giao dịch được đối chiếu để bảo đảm tính toàn vẹn.",
    icon: "verify",
  },
] as const;

function FeatureIcon({ name }: { name: "record" | "shield" | "verify" }) {
  const paths = {
    record: <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v5h5M10 12h6m-6 4h6" /></>,
    shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
    verify: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
  };
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}

export default function Home() {
  const [session, setCurrent] = useState<Session | null>(null);

  useEffect(() => {
    const sync = () => setCurrent(getSession());
    sync();
    window.addEventListener("emr-session-change", sync);
    return () => window.removeEventListener("emr-session-change", sync);
  }, []);

  return (
    <section className="home-page">
      <div className="home-hero">
        <div className="home-hero-copy">
          <span className="home-kicker">
            <i />
            Nền tảng hồ sơ sức khỏe số
          </span>
          <h1>
            Hệ thống quản lý hồ sơ bệnh án điện tử
            <span> ứng dụng blockchain</span>
          </h1>
          <p>
            Kết nối bệnh nhân, bác sĩ và cơ sở y tế trên một nền tảng an toàn,
            minh bạch và thuận tiện cho quá trình chăm sóc sức khỏe.
          </p>
          <div className="home-actions">
            {session ? (
              <Link className="home-primary-action" href="/dashboard">
                Vào hệ thống
                <span aria-hidden>→</span>
              </Link>
            ) : (
              <>
                <Link className="home-primary-action" href="/login">
                  Đăng nhập
                  <span aria-hidden>→</span>
                </Link>
                <Link className="home-secondary-action" href="/register">Đăng ký tài khoản</Link>
              </>
            )}
          </div>
          <div className="home-trust">
            <span><i>✓</i> Bệnh nhân kiểm soát quyền truy cập</span>
            <span><i>✓</i> Theo dõi lịch sử rõ ràng</span>
          </div>
        </div>

        <div className="home-visual" aria-hidden>
          <div className="home-orbit home-orbit-one" />
          <div className="home-orbit home-orbit-two" />
          <div className="home-record-card">
            <div className="home-record-head">
              <span className="home-record-avatar">+</span>
              <div><b>Hồ sơ bệnh án điện tử</b><small>Thông tin được bảo vệ</small></div>
              <em>Đã xác minh</em>
            </div>
            <div className="home-record-body">
              <div className="home-record-line"><span /><span /></div>
              <div className="home-record-line short"><span /><span /></div>
              <div className="home-record-chart">
                <svg viewBox="0 0 360 90" preserveAspectRatio="none">
                  <path d="M0 60 C45 58 52 20 88 45 S145 75 180 35 S235 18 270 48 S320 70 360 25" />
                </svg>
              </div>
              <div className="home-record-meta">
                <span><i /> Toàn vẹn dữ liệu</span>
                <span><i /> Quyền riêng tư</span>
              </div>
            </div>
          </div>
          <div className="home-floating-card home-floating-shield">
            <span><FeatureIcon name="shield" /></span>
            <div><b>Truy cập an toàn</b><small>Do bệnh nhân kiểm soát</small></div>
          </div>
          <div className="home-floating-card home-floating-check">
            <span><FeatureIcon name="verify" /></span>
            <div><b>Dữ liệu xác thực</b><small>Sẵn sàng đối chiếu</small></div>
          </div>
        </div>
      </div>

      <div className="home-benefits">
        {BENEFITS.map((benefit) => (
          <article key={benefit.title}>
            <span><FeatureIcon name={benefit.icon} /></span>
            <div>
              <h2>{benefit.title}</h2>
              <p>{benefit.text}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="home-footer-note">
        <span>MedChain EMR</span>
        <p>Hướng đến một hệ sinh thái y tế số lấy người bệnh làm trung tâm.</p>
      </div>
    </section>
  );
}
