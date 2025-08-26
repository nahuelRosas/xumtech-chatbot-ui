import { useContext } from "react";
import MastraChatContext from "../contexts/MastraChatContext";

export function useMastraChatContext() {
  const ctx = useContext(MastraChatContext);
  if (!ctx)
    throw new Error(
      "useMastraChatContext must be used within MastraChatProvider"
    );
  return ctx;
}

export default useMastraChatContext;
