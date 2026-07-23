import { getCurrentUser } from "aws-amplify/auth";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { LoadingScreen } from "../components/ui/LoadingScreen";
import "../lib/amplify";

export default function Index() {
  const [state, setState] = useState<"checking" | "auth" | "guest">("checking");

  useEffect(() => {
    getCurrentUser()
      .then(() => setState("auth"))
      .catch(() => setState("guest"));
  }, []);

  if (state === "checking") {
    return <LoadingScreen />;
  }

  return <Redirect href={state === "auth" ? "/(tabs)/drive" : "/login"} />;
}
