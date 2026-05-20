import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

/**
 * Storage: local AsyncStorage for guests; Supabase folders/colors when signed in.
 */

const STORAGE_KEYS = {
	FOLDERS: "@hex_folders",
	SWATCHES: "@hex_swatches",
	SKIPPED_LOGIN: "@hex_skipped_login",
};

async function getUserId() {
	if (!isSupabaseConfigured) return null;
	const {
		data: { session },
	} = await supabase.auth.getSession();
	return session?.user?.id ?? null;
}

async function useCloud() {
	return Boolean(await getUserId());
}

function rowToFolder(row) {
	return {
		id: row.id,
		name: row.name,
		createdAt: new Date(row.created_at).getTime(),
	};
}

function rowToSwatch(row) {
	return {
		id: row.id,
		folderId: row.folder_id ?? null,
		folderName: row.folder_name ?? null,
		hex: row.hex,
		name: row.name ?? null,
		rgb: row.rgb,
		sampling: row.sampling ?? null,
		mix: row.mix ?? null,
		createdAt: new Date(row.created_at).getTime(),
	};
}

/* ---------- Local ---------- */

async function localGetFolders() {
	try {
		const foldersJson = await AsyncStorage.getItem(STORAGE_KEYS.FOLDERS);
		return foldersJson ? JSON.parse(foldersJson) : [];
	} catch (error) {
		console.error("Error loading folders:", error);
		return [];
	}
}

async function localGetSwatches() {
	try {
		const swatchesJson = await AsyncStorage.getItem(STORAGE_KEYS.SWATCHES);
		return swatchesJson ? JSON.parse(swatchesJson) : [];
	} catch (error) {
		console.error("Error loading swatches:", error);
		return [];
	}
}

async function localSetFolders(folders) {
	await AsyncStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
}

async function localSetSwatches(swatches) {
	await AsyncStorage.setItem(STORAGE_KEYS.SWATCHES, JSON.stringify(swatches));
}

async function localClearFoldersAndSwatches() {
	await AsyncStorage.multiRemove([STORAGE_KEYS.FOLDERS, STORAGE_KEYS.SWATCHES]);
}

/* ---------- Cloud ---------- */

async function cloudGetFolders() {
	const userId = await getUserId();
	if (!userId) return [];
	const { data, error } = await supabase.from("folders").select("id, name, created_at").eq("user_id", userId).order("created_at", { ascending: true });
	if (error) {
		console.error("Error loading folders:", error);
		return [];
	}
	return (data ?? []).map(rowToFolder);
}

async function cloudGetSwatches() {
	const userId = await getUserId();
	if (!userId) return [];
	const { data, error } = await supabase
		.from("colors")
		.select("id, folder_id, folder_name, hex, name, rgb, sampling, mix, created_at")
		.eq("user_id", userId)
		.order("created_at", { ascending: true });
	if (error) {
		console.error("Error loading swatches:", error);
		return [];
	}
	return (data ?? []).map(rowToSwatch);
}

/* ---------- Public API ---------- */

export async function getSkippedLogin() {
	try {
		const v = await AsyncStorage.getItem(STORAGE_KEYS.SKIPPED_LOGIN);
		return v === "true";
	} catch {
		return false;
	}
}

export async function setSkippedLogin() {
	try {
		await AsyncStorage.setItem(STORAGE_KEYS.SKIPPED_LOGIN, "true");
	} catch (error) {
		console.error("Error saving skipped login:", error);
	}
}

export async function clearSkippedLogin() {
	try {
		await AsyncStorage.removeItem(STORAGE_KEYS.SKIPPED_LOGIN);
	} catch (error) {
		console.error("Error clearing skipped login:", error);
	}
}

export async function isUsingCloudStorage() {
	return useCloud();
}

export async function getFolders() {
	if (await useCloud()) return cloudGetFolders();
	return localGetFolders();
}

export async function createFolder(name) {
	if (await useCloud()) {
		const userId = await getUserId();
		const { data, error } = await supabase.from("folders").insert({ user_id: userId, name }).select("id, name, created_at").single();
		if (error) throw error;
		return rowToFolder(data);
	}
	const folders = await localGetFolders();
	const newFolder = { id: Date.now().toString(), name, createdAt: Date.now() };
	folders.push(newFolder);
	await localSetFolders(folders);
	return newFolder;
}

export async function deleteFolder(folderId) {
	if (await useCloud()) {
		const { error } = await supabase.from("folders").delete().eq("id", folderId);
		if (error) throw error;
		return;
	}
	const folders = await localGetFolders();
	await localSetFolders(folders.filter((f) => f.id !== folderId));
	const swatches = await localGetSwatches();
	await localSetSwatches(swatches.filter((s) => s.folderId !== folderId));
}

export async function renameFolder(folderId, newName) {
	if (await useCloud()) {
		const { error } = await supabase.from("folders").update({ name: newName, updated_at: new Date().toISOString() }).eq("id", folderId);
		if (error) throw error;
		await supabase.from("colors").update({ folder_name: newName, updated_at: new Date().toISOString() }).eq("folder_id", folderId);
		return;
	}
	const folders = await localGetFolders();
	const folder = folders.find((f) => f.id === folderId);
	if (folder) {
		folder.name = newName;
		await localSetFolders(folders);
	}
}

export async function getSwatches() {
	if (await useCloud()) return cloudGetSwatches();
	return localGetSwatches();
}

export async function getRecentSwatches(limit) {
	const swatches = await getSwatches();
	const recentsOnly = swatches.filter((s) => s.folderId == null);
	recentsOnly.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
	return limit ? recentsOnly.slice(0, limit) : recentsOnly;
}

export async function getSwatchesForFolder(folderId) {
	const swatches = await getSwatches();
	return swatches.filter((s) => s.folderId === folderId);
}

export async function saveSwatch(swatchData) {
	if (await useCloud()) {
		const userId = await getUserId();
		const row = {
			user_id: userId,
			folder_id: swatchData.folderId ?? null,
			folder_name: swatchData.folderName ?? null,
			hex: swatchData.hex,
			name: swatchData.name ?? null,
			rgb: swatchData.rgb,
			sampling: swatchData.sampling ?? null,
			mix: swatchData.mix ?? null,
		};
		const { data, error } = await supabase.from("colors").insert(row).select("id, folder_id, folder_name, hex, name, rgb, sampling, mix, created_at").single();
		if (error) throw error;
		return rowToSwatch(data);
	}
	const swatches = await localGetSwatches();
	const newSwatch = {
		id: Date.now().toString(),
		folderId: swatchData.folderId ?? null,
		folderName: swatchData.folderName ?? null,
		hex: swatchData.hex,
		name: swatchData.name ?? null,
		rgb: swatchData.rgb,
		sampling: swatchData.sampling,
		mix: swatchData.mix,
		createdAt: Date.now(),
	};
	swatches.push(newSwatch);
	await localSetSwatches(swatches);
	return newSwatch;
}

export async function updateSwatch(swatchId, updates) {
	if (await useCloud()) {
		const patch = { updated_at: new Date().toISOString() };
		if (updates.hex != null) patch.hex = updates.hex;
		if (updates.name !== undefined) patch.name = updates.name;
		if (updates.rgb != null) patch.rgb = updates.rgb;
		if (updates.sampling !== undefined) patch.sampling = updates.sampling;
		if (updates.mix !== undefined) patch.mix = updates.mix;
		if (updates.folderId !== undefined) patch.folder_id = updates.folderId;
		if (updates.folderName !== undefined) patch.folder_name = updates.folderName;
		const { data, error } = await supabase.from("colors").update(patch).eq("id", swatchId).select("id, folder_id, folder_name, hex, name, rgb, sampling, mix, created_at").single();
		if (error) throw error;
		return rowToSwatch(data);
	}
	const swatches = await localGetSwatches();
	const index = swatches.findIndex((s) => s.id === swatchId);
	if (index === -1) return null;
	swatches[index] = { ...swatches[index], ...updates };
	await localSetSwatches(swatches);
	return swatches[index];
}

export async function deleteSwatch(swatchId) {
	if (await useCloud()) {
		const { error } = await supabase.from("colors").delete().eq("id", swatchId);
		if (error) throw error;
		return;
	}
	const swatches = await localGetSwatches();
	await localSetSwatches(swatches.filter((s) => s.id !== swatchId));
}

/**
 * Upload local folders/colors to Supabase after sign-in, then clear local copies.
 */
export async function migrateLocalDataToCloud() {
	const userId = await getUserId();
	if (!userId || !isSupabaseConfigured) return { migratedFolders: 0, migratedColors: 0 };

	const localFolders = await localGetFolders();
	const localSwatches = await localGetSwatches();
	if (localFolders.length === 0 && localSwatches.length === 0) {
		return { migratedFolders: 0, migratedColors: 0 };
	}

	const folderIdMap = {};

	for (const f of localFolders) {
		const { data, error } = await supabase
			.from("folders")
			.insert({
				user_id: userId,
				name: f.name,
				created_at: f.createdAt ? new Date(f.createdAt).toISOString() : undefined,
			})
			.select("id")
			.single();
		if (error) {
			console.error("Migrate folder failed:", error);
			continue;
		}
		folderIdMap[f.id] = data.id;
	}

	let migratedColors = 0;
	for (const s of localSwatches) {
		const newFolderId = s.folderId ? folderIdMap[s.folderId] ?? null : null;
		const { error } = await supabase.from("colors").insert({
			user_id: userId,
			folder_id: newFolderId,
			folder_name: s.folderName ?? null,
			hex: s.hex,
			name: s.name ?? null,
			rgb: s.rgb,
			sampling: s.sampling ?? null,
			mix: s.mix ?? null,
			created_at: s.createdAt ? new Date(s.createdAt).toISOString() : undefined,
		});
		if (!error) migratedColors += 1;
		else console.error("Migrate color failed:", error);
	}

	await localClearFoldersAndSwatches();

	return { migratedFolders: Object.keys(folderIdMap).length, migratedColors };
}

export async function clearAllData() {
	if (await useCloud()) {
		const userId = await getUserId();
		await supabase.from("colors").delete().eq("user_id", userId);
		await supabase.from("folders").delete().eq("user_id", userId);
	}
	await localClearFoldersAndSwatches();
}
