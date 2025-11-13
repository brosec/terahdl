interface FileInfo {
  file_name: string;
  download_link: string;
  thumbnail: string;
  file_size: string;
  size_bytes: number;
  proxy_url: string;
  error?: string;
}

// Updated TeraBox API implementation using Netlify functions
// NOTE: client must supply apiKeyId and apiKeySecret (see security note below)
export const downloadFile = async (
  link: string,
  apiKeyId: string,
  apiKeySecret: string
): Promise<FileInfo> => {
  try {
    if (!link) {
      return { error: "Invalid request parameters." } as FileInfo;
    }

    if (!apiKeyId || !apiKeySecret) {
      return { error: "API credentials (apiKeyId and apiKeySecret) are required." } as FileInfo;
    }

    // Use download endpoint for API calls
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        link,
        api_key_id: apiKeyId,
        api_key_secret: apiKeySecret,
      }),
    });

    if (!response.ok) {
      const txt = await response.text().catch(() => '');
      return { error: `Server returned ${response.status} ${response.statusText}. ${txt}` } as FileInfo;
    }

    const data = await response.json().catch(() => null);
    if (!data) {
      return { error: "Invalid server response." } as FileInfo;
    }

    if (data.error) {
      return { error: data.error } as FileInfo;
    }

    return data as FileInfo;
  } catch (error) {
    console.error('API call failed:', error);
    return { error: "A generic error occurred. Please try again." } as FileInfo;
  }
};

// New function for the dedicated download endpoint (same as above but kept for compatibility)
export const downloadFileViaDownloadEndpoint = async (
  link: string,
  apiKeyId: string,
  apiKeySecret: string
): Promise<FileInfo> => {
  try {
    if (!link) {
      return { error: "Invalid request parameters." } as FileInfo;
    }

    if (!apiKeyId || !apiKeySecret) {
      return { error: "API credentials (apiKeyId and apiKeySecret) are required." } as FileInfo;
    }

    const response = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        link,
        api_key_id: apiKeyId,
        api_key_secret: apiKeySecret,
      }),
    });

    if (!response.ok) {
      const txt = await response.text().catch(() => '');
      return { error: `Server returned ${response.status} ${response.statusText}. ${txt}` } as FileInfo;
    }

    const data = await response.json().catch(() => null);
    if (!data) {
      return { error: "Invalid server response." } as FileInfo;
    }

    if (data.error) {
      return { error: data.error } as FileInfo;
    }

    return data as FileInfo;
  } catch (error) {
    console.error('Download API call failed:', error);
    return { error: "A generic error occurred. Please try again." } as FileInfo;
  }
};

// Export both functions for flexibility
export { downloadFile as getFileInfo };
export default { downloadFile, downloadFileViaDownloadEndpoint };
