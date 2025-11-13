interface FileInfo {
  file_name: string;
  download_link: string;
  thumbnail: string;
  file_size: string;
  size_bytes: number;
  proxy_url: string;
  error?: string;
}

// Call YOUR Netlify backend → backend adds api_key_id + api_key_secret
export const downloadFile = async (link: string): Promise<FileInfo> => {
  try {
    if (!link) {
      return { error: "Invalid request parameters." } as FileInfo;
    }

    const response = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link }),   // ❗ ONLY LINK — no secrets here
    });

    const data = await response.json();

    if (data.error) {
      return { error: data.error } as FileInfo;
    }

    return data as FileInfo;

  } catch (error) {
    console.error("API call failed:", error);
    return { error: "A generic error occurred. Please try again." } as FileInfo;
  }
};

// Export for compatibility
export const getFileInfo = downloadFile;
export default { downloadFile };
