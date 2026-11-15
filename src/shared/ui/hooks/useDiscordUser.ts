import { useCallback, useEffect, useState } from "react";
import {
	fetchDiscordUser,
	getAvatarUrl,
	getBannerUrl,
	getDisplayName,
} from "../../../core/discord/auth";
import type { DiscordUser } from "../../types";

export interface UseDiscordUserReturn {
	user: DiscordUser | null;
	avatarUrl: string | null;
	bannerUrl: string | null;
	displayName: string;
	isLoading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

export function useDiscordUser(): UseDiscordUserReturn {
	const [user, setUser] = useState<DiscordUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchUser = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const userData = await fetchDiscordUser();
			setUser(userData);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch user");
			setUser(null);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchUser();
	}, [fetchUser]);

	const avatarUrl = user ? getAvatarUrl(user) : null;
	const bannerUrl = user ? getBannerUrl(user) : null;
	const displayName = user ? getDisplayName(user) : "Not logged in";

	return {
		user,
		avatarUrl,
		bannerUrl,
		displayName,
		isLoading,
		error,
		refetch: fetchUser,
	};
}
