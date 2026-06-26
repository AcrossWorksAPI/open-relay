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

  if (/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+(?:\.git)?$/.test(remoteUrl)) {
    return { value: remoteUrl, redaction: undefined };
  }

  if (/^git@github\.com:[^/\s]+\/[^/\s]+(?:\.git)?$/.test(remoteUrl)) {
    return { value: remoteUrl, redaction: undefined };
  }

  return {
    redaction: {
      field: "repository.remote_url",
      reason: "Remote URL contained credentials or an unsupported format."
    }
  };
}
