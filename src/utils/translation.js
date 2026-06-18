// English to Telugu Translation Map for medical instructions
const teluguMap = {
  'OD (1-0-0)': 'ఉదయం 1',
  'OD (0-0-1)': 'రాత్రి 1',
  'BD (1-0-1)': 'ఉదయం 1, రాత్రి 1',
  'TDS (1-1-1)': 'ఉదయం 1, మధ్యాహ్నం 1, రాత్రి 1',
  'QID (1-1-1-1)': 'రోజుకు 4 సార్లు',
  'SOS (As needed)': 'అవసరమైనప్పుడు',
  
  'Before Food': 'భోజనానికి ముందు',
  'After Food': 'భోజనం తర్వాత',
  'With Food': 'భోజనంతో',
  'Empty Stomach': 'ఖాళీ కడుపుతో',
  'Local Application': 'పైపూత',
  
  // Extra common custom instructions
  'Take with warm water': 'గోరువెచ్చని నీటితో వేసుకోండి',
  'Take with milk': 'పాలతో వేసుకోండి',
  'Chew well': 'బాగా నమిలి మింగండి',
  'Apply twice a day': 'రోజుకు రెండుసార్లు రాయండి',
  'Swallow whole': 'పూర్తిగా మింగండి (నమలవద్దు)'
};

// Sync version (just dictionary)
export function translateTelugu(text) {
  if (!text) return '';
  const trimmed = text.trim();
  return teluguMap[trimmed] || null;
}

// Async version (dictionary + Google Translate API fallback)
export async function translateTeluguAsync(text) {
  if (!text) return '';
  const trimmed = text.trim();
  
  // 1. Check local dictionary first
  if (teluguMap[trimmed]) {
    return teluguMap[trimmed];
  }

  // 2. Attempt free Google Translate API
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=te&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    // The translated text is in data[0][i][0]
    let translated = '';
    if (data && data[0]) {
      data[0].forEach(part => {
        if (part[0]) translated += part[0];
      });
    }
    return translated || null;
  } catch (err) {
    console.error('Translation failed:', err);
    return null; // Fallback to null if offline or error
  }
}
