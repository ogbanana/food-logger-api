"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { markNavigation } from "../../lib/client/navHistory";

export default function NavTracker() {
  const pathname = usePathname();
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    markNavigation();
  }, [pathname]);

  return null;
}
