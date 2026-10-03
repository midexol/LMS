"use client";

import React from "react";
import { BlackboardNavbar } from "./BlackboardNavbar";

interface NavbarProps {
  currentUser?: { id: string; name: string; email: string; role: "STUDENT" | "TUTOR" | "ADMIN" } | null;
  showSpacer?: boolean;
}

export function Navbar({ currentUser, showSpacer = true }: NavbarProps) {
  return <BlackboardNavbar currentUser={currentUser} showSpacer={showSpacer} />;
}
