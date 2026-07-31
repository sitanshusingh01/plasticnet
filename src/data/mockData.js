// Reference point for every relative timestamp in this file. The research
// team's scan cadence runs through the 2025 winter to spring season, so
// "today" here is fixed rather than pulled from the client clock. Swap this
// for a live value once the FastAPI feed is wired up.
export const REFERENCE_DATE = '2025-03-18T09:40:00+05:30'

// Fixed facts about the training dataset behind the segmentation and
// detection models. These numbers describe the dataset itself, not live
// monitoring activity, and should stay untouched, they came directly from
// the annotation team.
export const datasetInfo = {
  totalImages: 307,
  totalAnnotations: 1760,
  annotationType: 'COCO Instance Segmentation',
  annotationTool: 'Roboflow',
  location: 'Dal Lake, Srinagar',
  affiliation: 'NIT Srinagar research project',
  classes: ['Bottle', 'Cap', 'Wrapper', 'Polythene', 'Shoe', 'Foam']
}

export const kpiMetrics = [
  {
    id: 'total-objects',
    label: 'Total Plastic Objects',
    value: 18742,
    format: 'number',
    change: 6.4,
    trend: 'up',
    caption: 'Cumulative since October survey'
  },
  {
    id: 'coverage',
    label: 'Plastic Coverage',
    value: 6.8,
    format: 'percent',
    change: -0.4,
    trend: 'down',
    caption: 'Across all six Dal Lake zones'
  },
  {
    id: 'polluted-area',
    label: 'Estimated Polluted Area',
    value: 2.4,
    unit: 'sq km',
    format: 'decimal',
    change: 0.2,
    trend: 'up',
    caption: 'Surface area with visible debris'
  },
  {
    id: 'density',
    label: 'Pollution Density',
    value: 812,
    unit: '/sq km',
    format: 'number',
    change: 3.1,
    trend: 'up',
    caption: 'Objects per square kilometre'
  },
  {
    id: 'risk-level',
    label: 'Current Risk Level',
    value: 'Moderate',
    format: 'text',
    tone: 'warning',
    caption: 'Weighted across 6 Dal Lake zones'
  },
  {
    id: 'today-detections',
    label: "Today's Detections",
    value: 146,
    format: 'number',
    change: 9.8,
    trend: 'up',
    caption: 'Since midnight, all cameras'
  },
  {
    id: 'ehi',
    label: 'Environmental Health Index',
    value: 71,
    unit: '/100',
    format: 'number',
    change: 1.5,
    trend: 'up',
    caption: 'Composite water quality score'
  },
  {
    id: 'active-zones',
    label: 'Active Monitoring Zones',
    value: 6,
    format: 'number',
    caption: '1 zone in scheduled maintenance'
  }
]

export const dailyDetectionTrend = [
  { day: 'Mar 5', detections: 118 },
  { day: 'Mar 6', detections: 132 },
  { day: 'Mar 7', detections: 96 },
  { day: 'Mar 8', detections: 141 },
  { day: 'Mar 9', detections: 108 },
  { day: 'Mar 10', detections: 154 },
  { day: 'Mar 11', detections: 122 },
  { day: 'Mar 12', detections: 137 },
  { day: 'Mar 13', detections: 129 },
  { day: 'Mar 14', detections: 149 },
  { day: 'Mar 15', detections: 133 },
  { day: 'Mar 16', detections: 121 },
  { day: 'Mar 17', detections: 158 },
  { day: 'Mar 18', detections: 146 }
]

export const weeklyCollection = [
  { week: 'Week 4', kilograms: 312 },
  { week: 'Week 5', kilograms: 288 },
  { week: 'Week 6', kilograms: 341 },
  { week: 'Week 7', kilograms: 365 },
  { week: 'Week 8', kilograms: 298 },
  { week: 'Week 9', kilograms: 356 },
  { week: 'Week 10', kilograms: 379 },
  { week: 'Week 11', kilograms: 334 }
]

// Category order and names match datasetInfo.classes exactly, these are
// the six classes the segmentation model was trained on.
export const categoryDistribution = [
  { category: 'Bottle', count: 4489, share: 24.0, color: '#2E86C1' },
  { category: 'Cap', count: 2384, share: 12.7, color: '#C0392B' },
  { category: 'Wrapper', count: 3502, share: 18.7, color: '#F4D03F' },
  { category: 'Polythene', count: 5216, share: 27.8, color: '#1E8449' },
  { category: 'Shoe', count: 1410, share: 7.5, color: '#21618C' },
  { category: 'Foam', count: 1741, share: 9.3, color: '#8A968D' }
]

export const coverageTrend = [
  { month: 'Oct', coverage: 8.9 },
  { month: 'Nov', coverage: 8.1 },
  { month: 'Dec', coverage: 7.6 },
  { month: 'Jan', coverage: 7.9 },
  { month: 'Feb', coverage: 7.2 },
  { month: 'Mar', coverage: 6.8 }
]

// This is a distinct measure from the Environmental Health Index above,
// it tracks severity rather than water quality, higher means more waste
// is being observed across the lake that month.
export const pollutionIndexTrend = [
  { month: 'Oct', index: 64 },
  { month: 'Nov', index: 61 },
  { month: 'Dec', index: 58 },
  { month: 'Jan', index: 63 },
  { month: 'Feb', index: 67 },
  { month: 'Mar', index: 71 }
]

// Six zones inside Dal Lake itself, this is not a multi lake survey, every
// zone below sits within the lake's own boundary or its immediate outflow.
export const monitoringZones = [
  {
    id: 'northern-shore',
    name: 'Northern Shore',
    zoneCode: 'ZN-01',
    plasticShare: 3.6,
    status: 'active',
    lastScan: '2025-03-17T18:10:00+05:30',
    risk: 'low',
    coordinates: [34.1401, 74.8181],
    cameras: 2
  },
  {
    id: 'central-dal',
    name: 'Central Dal',
    zoneCode: 'ZN-02',
    plasticShare: 8.2,
    status: 'active',
    lastScan: '2025-03-18T07:20:00+05:30',
    risk: 'high',
    coordinates: [34.1225, 74.8698],
    cameras: 4
  },
  {
    id: 'southern-shore',
    name: 'Southern Shore',
    zoneCode: 'ZN-03',
    plasticShare: 2.9,
    status: 'scheduled',
    lastScan: '2025-03-15T11:30:00+05:30',
    risk: 'low',
    coordinates: [34.1290, 74.8858],
    cameras: 1
  },
  {
    id: 'floating-gardens',
    name: 'Floating Gardens',
    zoneCode: 'ZN-04',
    plasticShare: 6.1,
    status: 'active',
    lastScan: '2025-03-18T08:30:00+05:30',
    risk: 'moderate',
    coordinates: [34.1270, 74.8790],
    cameras: 2
  },
  {
    id: 'nigeen-basin',
    name: 'Nigeen Basin',
    zoneCode: 'ZN-05',
    plasticShare: 4.1,
    status: 'active',
    lastScan: '2025-03-18T06:55:00+05:30',
    risk: 'moderate',
    coordinates: [34.1312, 74.8663],
    cameras: 2
  },
  {
    id: 'zero-bridge',
    name: 'Zero Bridge',
    zoneCode: 'ZN-06',
    plasticShare: 9.7,
    status: 'active',
    lastScan: '2025-03-18T09:15:00+05:30',
    risk: 'high',
    coordinates: [34.0950, 74.8030],
    cameras: 3
  }
]

export const liveAlerts = [
  {
    id: 'alt-1042',
    type: 'detection',
    zone: 'Zero Bridge',
    message: 'Cluster of 14 objects flagged near the Zero Bridge outflow channel',
    timestamp: '2025-03-18T09:22:00+05:30'
  },
  {
    id: 'alt-1041',
    type: 'warning',
    zone: 'Central Dal',
    message: 'Plastic coverage crossed the 8 percent threshold in ZN-02',
    timestamp: '2025-03-18T08:47:00+05:30'
  },
  {
    id: 'alt-1040',
    type: 'camera',
    zone: 'Southern Shore',
    message: 'Camera SS-1 offline, last heartbeat 3 hours ago',
    timestamp: '2025-03-18T06:10:00+05:30'
  },
  {
    id: 'alt-1039',
    type: 'upload',
    zone: 'Floating Gardens',
    message: 'Field team uploaded 212 new survey images from the floating gardens',
    timestamp: '2025-03-18T05:52:00+05:30'
  },
  {
    id: 'alt-1038',
    type: 'processing',
    zone: 'Northern Shore',
    message: 'Batch NS-0317 finished processing, 96 objects classified',
    timestamp: '2025-03-17T22:18:00+05:30'
  }
]

export const detectionRecords = [
  { id: 'OBJ-30215', type: 'Polythene sheet', confidence: 0.94, area: 0.82, zone: 'Zero Bridge', timestamp: '2025-03-18T09:15:00+05:30' },
  { id: 'OBJ-30214', type: 'PET bottle', confidence: 0.91, area: 0.14, zone: 'Central Dal', timestamp: '2025-03-18T09:02:00+05:30' },
  { id: 'OBJ-30213', type: 'Food wrapper', confidence: 0.87, area: 0.05, zone: 'Central Dal', timestamp: '2025-03-18T08:58:00+05:30' },
  { id: 'OBJ-30212', type: 'Bottle cap', confidence: 0.79, area: 0.01, zone: 'Floating Gardens', timestamp: '2025-03-18T08:41:00+05:30' },
  { id: 'OBJ-30211', type: 'Thermocol foam block', confidence: 0.88, area: 0.31, zone: 'Nigeen Basin', timestamp: '2025-03-18T08:20:00+05:30' },
  { id: 'OBJ-30210', type: 'Polythene sheet', confidence: 0.96, area: 0.64, zone: 'Zero Bridge', timestamp: '2025-03-18T07:55:00+05:30' },
  { id: 'OBJ-30209', type: 'Rubber shoe', confidence: 0.82, area: 0.22, zone: 'Northern Shore', timestamp: '2025-03-18T07:30:00+05:30' },
  { id: 'OBJ-30208', type: 'PET bottle', confidence: 0.9, area: 0.13, zone: 'Central Dal', timestamp: '2025-03-18T07:12:00+05:30' },
  { id: 'OBJ-30207', type: 'Food wrapper', confidence: 0.75, area: 0.04, zone: 'Southern Shore', timestamp: '2025-03-18T06:48:00+05:30' },
  { id: 'OBJ-30206', type: 'Polythene sheet', confidence: 0.93, area: 0.58, zone: 'Central Dal', timestamp: '2025-03-18T06:20:00+05:30' }
]

export const classificationSummary = [
  { category: 'Bottle', count: 4489, avgConfidence: 0.9 },
  { category: 'Cap', count: 2384, avgConfidence: 0.78 },
  { category: 'Wrapper', count: 3502, avgConfidence: 0.83 },
  { category: 'Polythene', count: 5216, avgConfidence: 0.93 },
  { category: 'Shoe', count: 1410, avgConfidence: 0.81 },
  { category: 'Foam', count: 1741, avgConfidence: 0.86 }
]

export const segmentationSamples = [
  {
    id: 'SEG-0417',
    zone: 'Central Dal, ZN-02',
    capturedAt: '2025-03-18T07:20:00+05:30',
    coveragePercent: 8.2,
    objectsFound: 34,
    processingTime: '2.1s'
  },
  {
    id: 'SEG-0416',
    zone: 'Zero Bridge, ZN-06',
    capturedAt: '2025-03-18T09:15:00+05:30',
    coveragePercent: 9.7,
    objectsFound: 41,
    processingTime: '2.4s'
  },
  {
    id: 'SEG-0415',
    zone: 'Southern Shore, ZN-03',
    capturedAt: '2025-03-18T08:05:00+05:30',
    coveragePercent: 5.4,
    objectsFound: 19,
    processingTime: '1.8s'
  }
]

export const recentReports = [
  { id: 'RPT-0091', title: 'Weekly Zone Summary, Week 11', generatedOn: '2025-03-17T18:00:00+05:30', format: 'PDF' },
  { id: 'RPT-0090', title: 'Dal Lake Coverage Assessment', generatedOn: '2025-03-14T12:30:00+05:30', format: 'PDF' },
  { id: 'RPT-0089', title: 'Monthly Dal Lake Authority Brief, February', generatedOn: '2025-03-02T10:15:00+05:30', format: 'PDF' }
]

// Canonical status list, in workflow order. Used by the authority status
// update control so the dropdown always matches what ZoneBadge can render.
export const REPORT_STATUSES = ['submitted', 'under-review', 'cleanup-scheduled', 'cleanup-in-progress', 'resolved']

// Citizen submitted reports. Every field below is exactly what the backend
// will populate once it exists, aiPrediction and the result placeholders
// are mocked, everything else (id, filename, coordinates, timestamps) is
// generated the same way a real submission would generate it.
export const citizenReports = [
  {
    reportId: 'CR-0512',
    filename: 'PLASTICNET_20250318_081500_CR-0512.jpg',
    mediaType: 'image',
    mediaPreviewUrl: null,
    zone: 'Floating Gardens',
    description: 'Heavy polythene buildup near the vegetable plots, visible from the shore path',
    submittedBy: 'Aamir K.',
    reportStatus: 'submitted',
    severity: 'high',
    latitude: 34.127,
    longitude: 74.879,
    gpsAccuracy: 12,
    locationName: 'Floating Gardens, Srinagar, Jammu and Kashmir',
    timezone: 'Asia/Kolkata',
    uploadedAt: '2025-03-18T08:15:00+05:30',
    aiPrediction: { coveragePercent: 7.8, severity: 'high', objectsFound: 21 },
    segmentationResult: { status: 'pending_backend', maskUrl: null },
    detectionResult: { status: 'pending_backend', boundingBoxes: [] },
    classificationResult: { status: 'pending_backend', categories: [] },
    wasteCategorySummary: [
      { category: 'Polythene', count: 14 },
      { category: 'Wrapper', count: 5 }
    ]
  },
  {
    reportId: 'CR-0511',
    filename: 'PLASTICNET_20250318_074000_CR-0511.jpg',
    mediaType: 'image',
    mediaPreviewUrl: null,
    zone: 'Zero Bridge',
    description: "Wrappers and bottles collecting against the outflow gate after last night's wind",
    submittedBy: 'Zoya M.',
    reportStatus: 'under-review',
    severity: 'moderate',
    latitude: 34.095,
    longitude: 74.803,
    gpsAccuracy: 15,
    locationName: 'Zero Bridge, Srinagar, Jammu and Kashmir',
    timezone: 'Asia/Kolkata',
    uploadedAt: '2025-03-18T07:40:00+05:30',
    aiPrediction: { coveragePercent: 5.9, severity: 'moderate', objectsFound: 16 },
    segmentationResult: { status: 'pending_backend', maskUrl: null },
    detectionResult: { status: 'pending_backend', boundingBoxes: [] },
    classificationResult: { status: 'pending_backend', categories: [] },
    wasteCategorySummary: [
      { category: 'Wrapper', count: 9 },
      { category: 'Bottle', count: 7 }
    ]
  },
  {
    reportId: 'CR-0510',
    filename: 'PLASTICNET_20250317_170500_CR-0510.jpg',
    mediaType: 'image',
    mediaPreviewUrl: null,
    zone: 'Central Dal',
    description: 'Floating debris trail spotted along the shikara route near ghat 9',
    submittedBy: 'Bilal A.',
    reportStatus: 'cleanup-scheduled',
    severity: 'moderate',
    latitude: 34.1225,
    longitude: 74.8698,
    gpsAccuracy: 10,
    locationName: 'Dalgate, Srinagar, Jammu and Kashmir',
    timezone: 'Asia/Kolkata',
    uploadedAt: '2025-03-17T17:05:00+05:30',
    aiPrediction: { coveragePercent: 6.4, severity: 'moderate', objectsFound: 18 },
    segmentationResult: { status: 'pending_backend', maskUrl: null },
    detectionResult: { status: 'pending_backend', boundingBoxes: [] },
    classificationResult: { status: 'pending_backend', categories: [] },
    wasteCategorySummary: [
      { category: 'Bottle', count: 8 },
      { category: 'Cap', count: 6 },
      { category: 'Wrapper', count: 4 }
    ]
  },
  {
    reportId: 'CR-0509',
    filename: 'PLASTICNET_20250316_142000_CR-0509.jpg',
    mediaType: 'image',
    mediaPreviewUrl: null,
    zone: 'Northern Shore',
    description: 'Small cluster of foam packaging washed up near the Hazratbal ghat steps',
    submittedBy: 'Nusrat S.',
    reportStatus: 'cleanup-in-progress',
    severity: 'low',
    latitude: 34.1401,
    longitude: 74.8181,
    gpsAccuracy: 9,
    locationName: 'Hazratbal, Srinagar, Jammu and Kashmir',
    timezone: 'Asia/Kolkata',
    uploadedAt: '2025-03-16T14:20:00+05:30',
    aiPrediction: { coveragePercent: 3.1, severity: 'low', objectsFound: 7 },
    segmentationResult: { status: 'pending_backend', maskUrl: null },
    detectionResult: { status: 'pending_backend', boundingBoxes: [] },
    classificationResult: { status: 'pending_backend', categories: [] },
    wasteCategorySummary: [{ category: 'Foam', count: 7 }]
  },
  {
    reportId: 'CR-0508',
    filename: 'PLASTICNET_20250315_095000_CR-0508.jpg',
    mediaType: 'image',
    mediaPreviewUrl: null,
    zone: 'Southern Shore',
    description: 'Discarded shoes and packaging near the Nishat boat jetty',
    submittedBy: 'Owais R.',
    reportStatus: 'resolved',
    severity: 'low',
    latitude: 34.129,
    longitude: 74.8858,
    gpsAccuracy: 11,
    locationName: 'Nishat, Srinagar, Jammu and Kashmir',
    timezone: 'Asia/Kolkata',
    uploadedAt: '2025-03-15T09:50:00+05:30',
    aiPrediction: { coveragePercent: 2.6, severity: 'low', objectsFound: 5 },
    segmentationResult: { status: 'pending_backend', maskUrl: null },
    detectionResult: { status: 'pending_backend', boundingBoxes: [] },
    classificationResult: { status: 'pending_backend', categories: [] },
    wasteCategorySummary: [
      { category: 'Shoe', count: 3 },
      { category: 'Wrapper', count: 2 }
    ]
  }
]

export const currentUser = {
  name: 'Sitanshu Singh',
  role: 'Research Lead',
  department: 'PlasticNet AI, Dal Lake Monitoring Dashboard',
  initials: 'SS'
}
