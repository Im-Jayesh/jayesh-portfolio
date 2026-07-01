import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "../../lib/auth";
import Link from "next/link";
import styles from "./admin.module.css";
import { adminLogout } from "../actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");

  let isAuthenticated = false;
  if (adminSession) {
    const verified = verifyToken(adminSession.value);
    isAuthenticated = !!verified;
  }

  return (
    <div className={styles.adminLayout}>
      <header className={styles.adminHeader}>
        <div className={styles.headerContent}>
          <div className={styles.adminTitleRow}>
            <span className={styles.pulseDot}></span>
            <h1 className={styles.adminHeading}>PORTFOLIO ADMIN</h1>
          </div>
          {isAuthenticated && (
            <nav className={styles.adminNav}>
              <Link href="/" className={styles.siteLink}>
                View Site
              </Link>
              <form action={adminLogout}>
                <button type="submit" className={styles.logoutBtn}>
                  Log Out
                </button>
              </form>
            </nav>
          )}
        </div>
      </header>
      <main className={styles.adminMain}>{children}</main>
    </div>
  );
}
