const RELEASES_URL =
  "https://api.github.com/repos/octelium/octelium-desktop/releases/latest";
const REQUEST_TIMEOUT_MS = 5000;

export const normalizeVersionTag = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (
    trimmed.length < 1 ||
    trimmed.length > 64 ||
    [...trimmed].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    return undefined;
  }

  return trimmed.replace(/^v(?=\d)/i, "");
};

export const getReleaseVersion = (value: unknown): string | undefined => {
  if (typeof value !== "object" || value === null || !("tag_name" in value)) {
    return undefined;
  }

  return normalizeVersionTag(value.tag_name);
};

export const currentAppVersion = normalizeVersionTag(
  import.meta.env.VITE_APP_VERSION,
);

export const getLatestAppVersion = async (): Promise<string | null> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(RELEASES_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }

    return getReleaseVersion(await response.json()) ?? null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
};
