import type { Role } from "@/generated/prisma/enums";

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Študent",
  REFERENT: "Referent ubytovacieho oddelenia",
  KOMISIA: "Ubytovacia komisia",
  SPRAVCA: "Správca internátov",
};

export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  REFERENT: "/referent",
  KOMISIA: "/komisia",
  SPRAVCA: "/spravca",
};

export type NavItem = { href: string; label: string; exact?: boolean };

export const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/student", label: "Prehľad", exact: true },
    { href: "/student/ziadost", label: "Žiadosť" },
    { href: "/student/doklady", label: "Doklady" },
    { href: "/student/odvolanie", label: "Odvolanie" },
  ],
  REFERENT: [
    { href: "/referent", label: "Žiadosti", exact: true },
    { href: "/referent/poradie", label: "Poradie a pridelenie" },
    { href: "/referent/terminy", label: "Termíny" },
    { href: "/audit", label: "Auditný záznam" },
  ],
  KOMISIA: [
    { href: "/komisia", label: "Odvolania", exact: true },
    { href: "/komisia/kriteria", label: "Kritériá" },
    { href: "/audit", label: "Auditný záznam" },
  ],
  SPRAVCA: [{ href: "/spravca", label: "Internáty a kapacity", exact: true }],
};
