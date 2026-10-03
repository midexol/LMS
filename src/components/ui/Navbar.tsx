"use client";

import React from "react";
import { BlackboardNavbar } from "./BlackboardNavbar";

interface NavbarProps {
  currentUser?: { id: string; name: string; email: string; role: "STUDENT" | "TUTOR" | "ADMIN" } | null;
}

export function Navbar({ currentUser }: NavbarProps) {
  return <BlackboardNavbar currentUser={currentUser} />;
}
