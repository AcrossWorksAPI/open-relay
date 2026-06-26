export type Redaction = {
  field: string;
  reason: string;
  replacement?: string;
};

export type SanitizedRemoteUrl = {
  value?: string;
  redaction?: Redaction;
};

export function sanitizeRemoteUrl(remoteUrl: string | undefined): SanitizedRemoteUrl {
  if (!remoteUrl) {
    return {};
  }

  if (hasUrlCredentials(remoteUrl)) {
    return {
      redaction: {
        field: "repository.remote_url",
        reason: "Remote URL contained credentials."
      }
    };
  }

  if (/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+(?:\.git)?$/.test(remoteUrl)) {
    return { value: remoteUrl };
  }

  if (/^git@github\.com:[^/\s]+\/[^/\s]+(?:\.git)?$/.test(remoteUrl)) {
    return { value: remoteUrl };
  }

  return {
    redaction: {
      field: "repository.remote_url",
      reason: "Remote URL host or format is not allowlisted."
    }
  };
}

function hasUrlCredentials(remoteUrl: string): boolean {
  try {
    const parsed = new URL(remoteUrl);
    return parsed.username.length > 0 || parsed.password.length > 0;
  } catch {
    return false;
  }
}
