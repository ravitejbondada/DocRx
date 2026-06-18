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

export function translateTelugu(text) {
  if (!text) return '';
  const trimmed = text.trim();
  // Return translation if exists, otherwise return null so the caller knows it wasn't translated
  return teluguMap[trimmed] || null;
}
