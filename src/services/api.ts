// services/api.ts
// THIS VERSION HARDCODES API KEY + SECRET IN THE FRONTEND (NOT SECURE)
// Use only for temporary testing. Remove ASAP.

// Place your key + secret here (from create_api_key)
const API_KEY_ID = "83304c2899";
const API_KEY_SECRET = "5b7b8699dc78942641e109b4de242c311812daddcefad63d";

export interface FileInfo {
  file_name: string;
  download_link: string;
  thumbnail: string;
  file_size: string;
  size_bytes: number;
  proxy_url: string;
  error?: string;
}

export const downloadFile = async (link: string): Promise<FileInfo> => {
  try {
    if (!link) {
      return { error: "Invalid request parameters." } as FileInfo;
    }

    const response = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        link,
        api_key_id: API_KEY_ID,          // HARD-CODED
        api_key_secret: API_KEY_SECRET,  // HARD-CODED
      }),
    });

    const data = await response.json();

    if (data.error) {
      return { error: data.error } as FileInfo;
    }

    return data as FileInfo;

  } catch (error) {
    console.error('API call failed:', error);
    return { error: "A generic error occurred. Please try again." } as FileInfo;
  }
};

// Optional alias
export const getFileInfo = downloadFile;

export default { downloadFile };
