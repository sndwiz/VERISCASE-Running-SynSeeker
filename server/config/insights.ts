export const INSIGHTS_CONFIG = {
  upload: {
    maxFileSizeBytes: 50 * 1024 * 1024,
    maxFilesPerUpload: 50,
    maxFilesPerMatter: 500,
    maxTotalStoragePerMatterBytes: 2 * 1024 * 1024 * 1024,
    allowedExtensions: [
      ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".tif", ".webp", ".heic",
      ".doc", ".docx", ".txt", ".rtf", ".csv",
      ".mp3", ".wav", ".ogg", ".m4a",
      ".eml", ".msg",
    ],
    allowedMimeTypes: [
      "application/pdf",
      "image/png", "image/jpeg", "image/gif", "image/bmp", "image/tiff", "image/webp",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain", "text/csv", "text/rtf",
      "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4",
      "message/rfc822",
    ],
  },

  chunking: {
    chunkSize: 1500,
    chunkOverlap: 200,
    minChunkSize: 100,
  },

  analysis: {
    maxDocumentTextLength: 8000,
    maxDocumentsPerRun: 20,
    defaultScopeThreshold: 20,
    defaultScopeSize: 10,
    aiModel: "claude-sonnet-4-5",
    maxTokens: 8192,
  },

  processing: {
    maxConcurrentJobs: 3,
    processingDelayMs: 100,
    ocrConfidenceThreshold: {
      high: 0.8,
      medium: 0.6,
    },
    scannedPdfTextThreshold: 50,
  },

  polling: {
    processingIntervalMs: 3000,
    analysisIntervalMs: 5000,
    idleIntervalMs: 30000,
  },

  rateLimiting: {
    uploadsPerMinute: 30,
    analysisRunsPerMinute: 5,
  },
} as const;
