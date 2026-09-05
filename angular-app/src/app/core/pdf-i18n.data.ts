// PDF label dictionary + a light fix-up for Indic text.
//
// jsPDF does not do complex-script shaping. The only visible artefact for the
// label vocabulary we use is the pre-base "i" vowel sign (Devanagari ि U+093F,
// Gujarati િ U+0ABF), which must render BEFORE its consonant cluster. We move it
// there manually; everything else (conjuncts, nukta, other matras) renders fine.

const DEV_CONS = 'क-हक़-य़'
const GUJ_CONS = 'ક-હ'
const RE_DEV_I = new RegExp(`([${DEV_CONS}](?:\\u094D[${DEV_CONS}])*)\\u093F`, 'g')
const RE_GUJ_I = new RegExp(`([${GUJ_CONS}](?:\\u0ACD[${GUJ_CONS}])*)\\u0ABF`, 'g')

export function fixIndic(text: unknown): string {
  return String(text ?? '')
    .replace(RE_DEV_I, 'ि$1')
    .replace(RE_GUJ_I, 'િ$1')
}

type Dict = Record<string, string>;

const DICT: Record<string, Dict> = {
  en: {
    'subtitle': 'Garment Cutting Management',
    'jobCard': 'CUTTING JOB CARD',
    'reconOk': 'MATCH',
    'reconBad': 'MISMATCH',
    'lotInfo': 'Lot Information',
    'fabricInfo': 'Fabric Information',
    'sizeBreakdown': 'Size Breakdown',
    'baleDetails': 'Bale / Roll Details',
    'cuttingInfo': 'Cutting Information',
    'notes': 'Notes',
    'date': 'Date',
    'programDate': 'Program Date',
    'cuttingDate': 'Cutting Date',
    'createdBy': 'Created By',
    'supplier': 'Supplier',
    'shortNo': 'Short No.',
    'shortName': 'Short Name',
    'fabricType': 'Fabric Type',
    'color': 'Color',
    'totalPieces': 'TOTAL PIECES',
    'baleNo': 'Bale / Roll No.',
    'meter': 'Meter',
    'weight': 'Weight',
    'shade': 'Shade',
    'remarks': 'Remarks',
    'total': 'TOTAL',
    'noSizes': 'No sizes entered.',
    'noBales': 'No bales recorded.',
    'pattern': 'Pattern',
    'markerLength': 'Marker Length',
    'markerWidth': 'Marker Width',
    'layLength': 'Lay Length',
    'layers': 'No. of Layers',
    'plies': 'No. of Plies',
    'opSignature': 'Operator signature',
    'operator': 'Operator',
    'generated': 'Generated',
    'scan': 'SCAN',
    'st.Draft': 'DRAFT',
    'st.Ready': 'READY',
    'st.Cutting': 'CUTTING',
    'st.Completed': 'COMPLETED',
    'st.Pending': 'PENDING',
  },
  hi: {
    'subtitle': 'गारमेंट कटिंग मैनेजमेंट',
    'jobCard': 'कटिंग जॉब कार्ड',
    'reconOk': 'मिलान सही',
    'reconBad': 'मेल नहीं',
    'lotInfo': 'लॉट जानकारी',
    'fabricInfo': 'कपड़ा जानकारी',
    'sizeBreakdown': 'साइज़ ब्रेकडाउन',
    'baleDetails': 'बेल / रोल विवरण',
    'cuttingInfo': 'कटिंग जानकारी',
    'notes': 'नोट्स',
    'date': 'तारीख',
    'programDate': 'प्रोग्राम तारीख',
    'cuttingDate': 'कटिंग तारीख',
    'createdBy': 'बनाया',
    'supplier': 'सप्लायर',
    'shortNo': 'शॉर्ट नं.',
    'shortName': 'शॉर्ट नाम',
    'fabricType': 'कपड़े का प्रकार',
    'color': 'रंग',
    'totalPieces': 'कुल पीस',
    'baleNo': 'बेल / रोल नं.',
    'meter': 'मीटर',
    'weight': 'वज़न',
    'shade': 'शेड',
    'remarks': 'टिप्पणी',
    'total': 'कुल',
    'noSizes': 'कोई साइज़ नहीं भरी गई।',
    'noBales': 'कोई बेल दर्ज नहीं।',
    'pattern': 'पैटर्न',
    'markerLength': 'मार्कर लंबाई',
    'markerWidth': 'मार्कर चौड़ाई',
    'layLength': 'ले लंबाई',
    'layers': 'लेयर संख्या',
    'plies': 'प्लाय संख्या',
    'opSignature': 'ऑपरेटर हस्ताक्षर',
    'operator': 'ऑपरेटर',
    'generated': 'जनरेट किया',
    'scan': 'स्कैन',
    'st.Draft': 'ड्राफ्ट',
    'st.Ready': 'तैयार',
    'st.Cutting': 'कटिंग',
    'st.Completed': 'पूर्ण',
    'st.Pending': 'बाकी',
  },
  gu: {
    'subtitle': 'ગારમેન્ટ કટિંગ મેનેજમેન્ટ',
    'jobCard': 'કટિંગ જોબ કાર્ડ',
    'reconOk': 'મેળ ખાય છે',
    'reconBad': 'મેળ નથી',
    'lotInfo': 'લોટ માહિતી',
    'fabricInfo': 'કાપડ માહિતી',
    'sizeBreakdown': 'સાઇઝ બ્રેકડાઉન',
    'baleDetails': 'બેલ / રોલ વિગત',
    'cuttingInfo': 'કટિંગ માહિતી',
    'notes': 'નોંધ',
    'date': 'તારીખ',
    'programDate': 'પ્રોગ્રામ તારીખ',
    'cuttingDate': 'કટિંગ તારીખ',
    'createdBy': 'બનાવનાર',
    'supplier': 'સપ્લાયર',
    'shortNo': 'શોર્ટ નં.',
    'shortName': 'શોર્ટ નામ',
    'fabricType': 'કાપડનો પ્રકાર',
    'color': 'રંગ',
    'totalPieces': 'કુલ પીસ',
    'baleNo': 'બેલ / રોલ નં.',
    'meter': 'મીટર',
    'weight': 'વજન',
    'shade': 'શેડ',
    'remarks': 'ટિપ્પણી',
    'total': 'કુલ',
    'noSizes': 'કોઈ સાઇઝ ભરેલી નથી.',
    'noBales': 'કોઈ બેલ નોંધાયેલ નથી.',
    'pattern': 'પેટર્ન',
    'markerLength': 'માર્કર લંબાઈ',
    'markerWidth': 'માર્કર પહોળાઈ',
    'layLength': 'લે લંબાઈ',
    'layers': 'લેયર સંખ્યા',
    'plies': 'પ્લાય સંખ્યા',
    'opSignature': 'ઓપરેટર સહી',
    'operator': 'ઓપરેટર',
    'generated': 'જનરેટ કર્યું',
    'scan': 'સ્કેન',
    'st.Draft': 'ડ્રાફ્ટ',
    'st.Ready': 'તૈયાર',
    'st.Cutting': 'કટિંગ',
    'st.Completed': 'પૂર્ણ',
    'st.Pending': 'બાકી',
  },
}

export function pdfLabels(lang: string): (key: string) => string {
  const table = DICT[lang] || DICT['en']
  const fix = lang === 'en' ? (s: string) => s : fixIndic
  return (key: string) => fix(table[key] ?? DICT['en'][key] ?? key)
}

export function baleCountLabel(lang: string, n: number): string {
  if (lang === 'hi') return `${n} बेल`
  if (lang === 'gu') return `${n} બેલ`
  return `${n} bale${n === 1 ? '' : 's'}`
}
