export interface BundleManifestFile {
  path: string;
  size: number;
}

export interface BundleManifest {
  files: BundleManifestFile[];
  totalSize: number;
  fileCount: number;
}
