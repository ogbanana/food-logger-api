"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "../../lib/client/ThemeContext";
import { useDrawer } from "../../lib/client/DrawerContext";
import FoodLoggerLogo from "./icons/FoodLoggerLogo";
import DashboardIcon from "./icons/DashboardIcon";
import ProfileIcon from "./icons/ProfileIcon";

export default function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();
  const { setDrawerOpen } = useDrawer();

  const logActive = pathname === "/";
  const dashActive = pathname === "/dashboard";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        borderTop: `0.5px solid ${colors.border}`,
        backgroundColor: colors.tabBarBg,
        flexShrink: 0,
      }}
    >
      <TabButton
        label="Profile"
        active={false}
        color={colors.tabInactive}
        onClick={() => setDrawerOpen(true)}
        icon={<ProfileIcon color={colors.tabInactive} size={24} />}
      />
      <TabButton
        label="Log"
        active={logActive}
        color={logActive ? colors.tabActive : colors.tabInactive}
        onClick={() => router.push("/")}
        icon={
          <FoodLoggerLogo
            color={logActive ? colors.tabActive : colors.tabInactive}
            accent={logActive ? colors.tabActive : colors.tabInactive}
            size={24}
          />
        }
      />
      <TabButton
        label="Dashboard"
        active={dashActive}
        color={dashActive ? colors.tabActive : colors.tabInactive}
        onClick={() => router.push("/dashboard")}
        icon={
          <DashboardIcon
            color={dashActive ? colors.tabActive : colors.tabInactive}
            size={24}
          />
        }
      />
    </div>
  );
}

function TabButton({
  label,
  color,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        padding: "8px 0 10px",
        background: "none",
        border: "none",
        cursor: "pointer",
      }}
    >
      {icon}
      <span style={{ fontSize: 10, color, fontWeight: 500 }}>{label}</span>
    </button>
  );
}
