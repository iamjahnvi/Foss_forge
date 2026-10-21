// Optional File System Access API support. When the browser exposes it, the
// user can pick archives from anywhere on disk; otherwise the app falls back to
// a plain file input.

type FilePickerWindow = Window & {
  showOpenFilePicker?: (options: {
    multiple?: boolean
    accept?: Record<string, string[]>
  }) => Promise<{ getFile: () => Promise<File> }[]>
}

export function canPickFiles(): boolean {
  return typeof (window as FilePickerWindow).showOpenFilePicker === 'function'
}

// Returns the picked files, or null when the browser has no picker or the
// user dismissed the dialog.
export async function pickZimFiles(): Promise<File[] | null> {
  const picker = (window as FilePickerWindow).showOpenFilePicker
  if (!picker) return null

  try {
    const handles = await picker({
      multiple: true,
      accept: { 'application/octet-stream': ['.zim'] },
    })
    return await Promise.all(handles.map((handle) => handle.getFile()))
  } catch {
    // The user closed the picker; the file input remains available.
    return null
  }
}
