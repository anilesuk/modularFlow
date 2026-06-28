import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

const clerkPublishableKey = import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
	throw new Error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required");
}

createRoot(document.getElementById("root")!).render(
	<ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
		<App />
	</ClerkProvider>,
);
