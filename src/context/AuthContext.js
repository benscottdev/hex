import React, { createContext, useContext } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children, session, skipped, requestSignIn, signOut }) {
	return (
		<AuthContext.Provider
			value={{
				session,
				isAuthenticated: Boolean(session),
				isGuest: !session && skipped,
				requestSignIn,
				signOut,
			}}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return ctx;
}
