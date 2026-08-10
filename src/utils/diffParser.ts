import { GitDiffFile, GitDiffChunk, GitDiffLine, ParsedDiff } from '../types';

export function parseGitDiff(rawDiff: string): ParsedDiff {
  if (!rawDiff || !rawDiff.trim()) {
    return {
      files: [],
      totalAdditions: 0,
      totalDeletions: 0,
      totalFiles: 0,
      rawText: rawDiff || ''
    };
  }

  const lines = rawDiff.split(/\r?\n/);
  const files: GitDiffFile[] = [];
  
  let currentFile: GitDiffFile | null = null;
  let currentChunk: GitDiffChunk | null = null;
  let oldLineCounter = 0;
  let newLineCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect diff header: diff --git a/path b/path
    if (line.startsWith('diff --git')) {
      if (currentChunk && currentFile) {
        currentFile.chunks.push(currentChunk);
        currentChunk = null;
      }
      if (currentFile) {
        files.push(currentFile);
      }

      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      const oldPath = match ? match[1] : 'unknown';
      const newPath = match ? match[2] : 'unknown';

      currentFile = {
        oldPath,
        newPath,
        status: 'modified',
        chunks: [],
        additions: 0,
        deletions: 0,
        language: getLanguageFromFilename(newPath)
      };
      continue;
    }

    if (!currentFile) {
      if (line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('@@ ')) {
        currentFile = {
          oldPath: 'file',
          newPath: 'file',
          status: 'modified',
          chunks: [],
          additions: 0,
          deletions: 0,
          language: 'typescript'
        };
      } else {
        continue;
      }
    }

    // Binary file detection
    if (line.startsWith('Binary files ') && line.includes(' differ')) {
      currentFile.status = 'binary';
      currentFile.isBinary = true;
      continue;
    }

    // Rename detection
    if (line.startsWith('rename from ')) {
      currentFile.oldPath = line.replace('rename from ', '').trim();
      currentFile.status = 'renamed';
      continue;
    }
    if (line.startsWith('rename to ')) {
      currentFile.newPath = line.replace('rename to ', '').trim();
      currentFile.language = getLanguageFromFilename(currentFile.newPath);
      continue;
    }

    // New / deleted file mode
    if (line.startsWith('new file mode ')) {
      currentFile.status = 'added';
      continue;
    }
    if (line.startsWith('deleted file mode ')) {
      currentFile.status = 'deleted';
      continue;
    }

    if (line.startsWith('--- ')) {
      const oldPath = line.replace('--- a/', '').replace('--- ', '').trim();
      currentFile.oldPath = oldPath;
      if (oldPath === '/dev/null') {
        currentFile.status = 'added';
      }
      continue;
    }

    if (line.startsWith('+++ ')) {
      const newPath = line.replace('+++ b/', '').replace('+++ ', '').trim();
      currentFile.newPath = newPath;
      currentFile.language = getLanguageFromFilename(newPath);
      if (newPath === '/dev/null') {
        currentFile.status = 'deleted';
      }
      continue;
    }

    // Chunk header @@ -12,4 +12,6 @@
    if (line.startsWith('@@ ')) {
      if (currentChunk && currentFile) {
        currentFile.chunks.push(currentChunk);
      }

      const chunkMatch = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      const oldStart = chunkMatch ? parseInt(chunkMatch[1], 10) : 1;
      const oldLines = chunkMatch && chunkMatch[2] ? parseInt(chunkMatch[2], 10) : 1;
      const newStart = chunkMatch ? parseInt(chunkMatch[3], 10) : 1;
      const newLines = chunkMatch && chunkMatch[4] ? parseInt(chunkMatch[4], 10) : 1;

      oldLineCounter = oldStart;
      newLineCounter = newStart;

      currentChunk = {
        header: line,
        oldStart,
        oldLines,
        newStart,
        newLines,
        lines: []
      };
      continue;
    }

    if (currentChunk) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        const diffLine: GitDiffLine = {
          type: 'add',
          newLineNumber: newLineCounter++,
          content: line.slice(1)
        };
        currentChunk.lines.push(diffLine);
        currentFile.additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        const diffLine: GitDiffLine = {
          type: 'delete',
          oldLineNumber: oldLineCounter++,
          content: line.slice(1)
        };
        currentChunk.lines.push(diffLine);
        currentFile.deletions++;
      } else if (!line.startsWith('\\')) {
        const diffLine: GitDiffLine = {
          type: 'context',
          oldLineNumber: oldLineCounter++,
          newLineNumber: newLineCounter++,
          content: line.startsWith(' ') ? line.slice(1) : line
        };
        currentChunk.lines.push(diffLine);
      }
    }
  }

  if (currentChunk && currentFile) {
    currentFile.chunks.push(currentChunk);
  }
  if (currentFile) {
    files.push(currentFile);
  }

  const totalAdditions = files.reduce((acc, f) => acc + f.additions, 0);
  const totalDeletions = files.reduce((acc, f) => acc + f.deletions, 0);

  return {
    files,
    totalAdditions,
    totalDeletions,
    totalFiles: files.length,
    rawText: rawDiff
  };
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'go':
      return 'go';
    case 'java':
      return 'java';
    case 'sql':
      return 'sql';
    case 'json':
      return 'json';
    case 'css':
    case 'scss':
      return 'css';
    case 'html':
      return 'html';
    case 'md':
      return 'markdown';
    default:
      return 'code';
  }
}
