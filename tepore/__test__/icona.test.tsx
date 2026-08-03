import React from "react";
import { render } from "@testing-library/react-native";
import Icona from "../src/components/Icona";
import * as Ph from "phosphor-react-native";

it("diagnostica export phosphor", () => {
  for (const n of ["Circle", "Car", "X", "Plus", "Check", "Copy", "CircleIcon", "XIcon"]) {
    console.log(n, "->", typeof (Ph as any)[n]);
  }
});

it("Icona con nome non mappato non deve crashare", () => {
  render(<Icona name="close" size={20} />);
});
