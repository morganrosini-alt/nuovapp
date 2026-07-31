// src/components/Icona.tsx
//
// Set di icone dell'app: Phosphor, scelto per le terminazioni arrotondate
// (più calde e domestiche del tratto tecnico dei set geometrici).
//
// DUE PESI, USATI CON CRITERIO:
//  · duotone  -> icone grandi dentro i riquadri colorati (>= 19px), dove lo
//               spazio permette la morbidezza dei due toni
//  · regular  -> icone piccole di interfaccia (frecce, chiusure, spunte),
//               dove il duotone diventerebbe confuso
// La scelta è automatica in base alla dimensione: chi usa il componente non
// deve pensarci.
//
// Il componente mantiene la stessa firma di @expo/vector-icons
// (name / size / color) così le schermate esistenti funzionano invariate.

import React from "react";
import * as Ph from "phosphor-react-native";

/** Nome usato nelle schermate -> icona Phosphor corrispondente. */
const MAPPA: Record<string, keyof typeof Ph> = {
  // --- navigazione e azioni base ---
  "chevron-left": "CaretLeft",
  "chevron-right": "CaretRight",
  "plus": "Plus",
  "close-circle-outline": "XCircle",
  "check": "Check",
  "check-circle": "CheckCircle",
  "check-circle-outline": "CheckCircle",
  "checkbox-blank-outline": "Square",
  "checkbox-marked-outline": "CheckSquare",
  "trash-can-outline": "Trash",
  "pencil": "PencilSimple",
  "send": "PaperPlaneTilt",
  "share-variant-outline": "ShareNetwork",
  "content-copy": "Copy",
  "dots-horizontal": "DotsThree",
  "cog-outline": "GearSix",
  "lock-outline": "Lock",
  "lock-check-outline": "LockKey",
  "shield-lock-outline": "ShieldCheck",
  "key-alert-outline": "Key",
  "storefront-outline": "Storefront",
  "emoticon-happy-outline": "SmileyWink",

  // --- tab bar ---
  "home-variant-outline": "House",
  "home-outline": "House",
  "wallet-outline": "Wallet",
  "toolbox-outline": "Toolbox",
  "heart-outline": "Heart",

  // --- persone e casa ---
  "account-group-outline": "UsersThree",
  "card-account-phone-outline": "AddressBook",
  "user": "User",

  // --- finanze ---
  "lightning-bolt": "Lightning",
  "receipt": "Receipt",
  "receipt-2": "Receipt",
  "pig-money": "PiggyBank",
  "piggy-bank-outline": "PiggyBank",
  "autorenew": "ArrowsClockwise",
  "refresh": "ArrowsClockwise",
  "chart-bar": "ChartBar",
  "cash": "Money",

  // --- utilità di casa ---
  "briefcase-outline": "Briefcase",
  "spray-bottle": "Drop",
  "spray": "Drop",
  "cart-outline": "ShoppingCart",
  "shopping-cart": "ShoppingCart",
  "trash-can": "Trash",
  "shield-check-outline": "ShieldCheck",
  "wrench-outline": "Wrench",
  "tools": "Wrench",
  "heart-pulse": "Heartbeat",
  "medical-bag": "FirstAid",
  "pill": "Pill",
  "note-text-outline": "NoteBlank",
  "note-plus-outline": "NotePencil",
  "alarm-light-outline": "Siren",
  "urgent": "Siren",

  // --- veicoli, animali, piante ---
  "car-outline": "Car",
  "motorbike": "Motorcycle",
  "bike": "Bicycle",
  "truck-outline": "Truck",
  "paw-outline": "PawPrint",
  "dog": "Dog",
  "cat": "Cat",
  "sprout-outline": "Plant",
  "water": "Drop",

  // --- calendario e promemoria ---
  "calendar-star": "CalendarStar",
  "calendar-check-outline": "CalendarCheck",
  "calendar-plus": "CalendarPlus",
  "calendar-heart": "CalendarHeart",
  "calendar": "Calendar",
  "pin-outline": "PushPin",
  "pin": "PushPinSlash",
  "clipboard-text-outline": "ClipboardText",

  // --- coppia ---
  "heart": "Heart",
  "heart-lock": "Lock",
  "heart-plus-outline": "HeartStraight",
  "hand-heart-outline": "HandHeart",
  "hand-peace": "HandsPraying",
  "message-star-outline": "ChatCircleText",
  "message-heart": "ChatCircleText",

  // --- varie ---
  "lightbulb-on-outline": "Lightbulb",
  "lightbulb-outline": "Lightbulb",
  "party-popper": "Confetti",
  "info-circle": "Info",

  // --- loghi dei provider di accesso ---
  "logo-google": "GoogleLogo",
  "logo-apple": "AppleLogo",
  "logo-facebook": "FacebookLogo",
  "bell": "Bell",
};

/** Sotto questa dimensione usiamo il tratto semplice, sopra il duotone. */
const SOGLIA_DUOTONE = 19;

type Props = {
  name: string;
  size?: number;
  color?: string;
  /** forza un peso specifico, ignorando la scelta automatica */
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  style?: any;
};

export default function Icona({ name, size = 20, color = "#2F4858", weight, style }: Props) {
  const nomePh = MAPPA[name] ?? "Circle";
  const Componente = (Ph as any)[nomePh] ?? (Ph as any).Circle;
  const peso = weight ?? (size >= SOGLIA_DUOTONE ? "duotone" : "regular");
  return <Componente size={size} color={color} weight={peso} style={style} />;
}
