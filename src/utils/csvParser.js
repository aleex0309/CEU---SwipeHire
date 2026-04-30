import Papa from 'papaparse';

/**
 * Parses a CSV file and normalizes its headers.
 * Expected columns: resume/text, category, name (optional).
 */
export const parseResumesCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const normalized = results.data.map((row, index) => ({
          id: row.id || `res-${index}`,
          text: row.resume || row.text || row.Resume_str || '',
          category: row.category || row.Category || 'Unknown',
          name: row.name || `Candidate ${index + 1}`,
          // Keep raw row for reference
          ...row
        }));
        resolve(normalized);
      },
      error: (error) => reject(error),
    });
  });
};
